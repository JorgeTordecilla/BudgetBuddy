import sys
import types
import uuid
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import select

import app.routers.push as push_router
from app.core.config import settings
from app.core.push_dispatcher import build_bill_payload, due_date_for_month, send_push
from app.main import app
from app.db import SessionLocal
from app.models import Account, Bill, Category, PushSubscription, User
from app.cli import send_bill_reminders as reminders_cli

VENDOR = "application/vnd.budgetbuddy.v1+json"


def _register_user(client: TestClient) -> dict[str, str]:
    username = f"push_{uuid.uuid4().hex[:8]}"
    response = client.post(
        "/api/auth/register",
        json={"username": username, "password": "supersecurepwd123", "currency_code": "USD"},
        headers={"accept": VENDOR, "content-type": VENDOR},
    )
    assert response.status_code == 201
    return {"username": username, "access": response.json()["access_token"]}


def _auth_headers(access_token: str, extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {"accept": VENDOR, "content-type": VENDOR, "authorization": f"Bearer {access_token}"}
    if extra:
        headers.update(extra)
    return headers


def test_vapid_public_key_is_public_and_vendor_media_type(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "vapid-public-test-key")
    with TestClient(app) as client:
        response = client.get("/api/push/vapid-public-key", headers={"accept": VENDOR})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(VENDOR)
    assert response.json()["public_key"] == "vapid-public-test-key"


def test_subscribe_upsert_reassigns_endpoint_owner_and_updates_keys():
    with TestClient(app) as client:
        user_a = _register_user(client)
        user_b = _register_user(client)

        endpoint = "https://push.example/subscriptions/device-001"
        first = client.post(
            "/api/push/subscribe",
            json={"endpoint": endpoint, "keys": {"p256dh": "key-a", "auth": "auth-a"}, "user_agent": "ua-a"},
            headers=_auth_headers(user_a["access"]),
        )
        assert first.status_code == 201

        second = client.post(
            "/api/push/subscribe",
            json={"endpoint": endpoint, "keys": {"p256dh": "key-b", "auth": "auth-b"}, "user_agent": "ua-b"},
            headers=_auth_headers(user_b["access"]),
        )
        assert second.status_code == 201

    with SessionLocal() as db:
        rows = list(db.scalars(select(PushSubscription).where(PushSubscription.endpoint == endpoint)))
        assert len(rows) == 1
        assert rows[0].p256dh == "key-b"
        assert rows[0].auth == "auth-b"
        owner = db.scalar(select(User).where(User.id == rows[0].user_id))
        assert owner is not None
        assert owner.username == user_b["username"]


def test_push_test_endpoint_is_gated_and_non_production_only(monkeypatch):
    monkeypatch.setattr(push_router, "send_push", lambda _sub, _payload: True)

    with TestClient(app) as client:
        user = _register_user(client)

        with SessionLocal() as db:
            db_user = db.scalar(select(User).where(User.username == user["username"]))
            assert db_user is not None
            db.add(
                PushSubscription(
                    user_id=db_user.id,
                    endpoint="https://push.example/subscriptions/device-002",
                    p256dh="k1",
                    auth="k2",
                    user_agent="ua",
                )
            )
            db.commit()

        monkeypatch.setattr(settings, "runtime_env", "development")
        monkeypatch.setattr(settings, "push_test_token", "test-token-123")

        unauthorized = client.post(
            "/api/push/test",
            json={"title": "t", "body": "b"},
            headers=_auth_headers(user["access"]),
        )
        assert unauthorized.status_code == 401

        ok = client.post(
            "/api/push/test",
            json={"title": "t", "body": "b"},
            headers=_auth_headers(user["access"], {"X-Push-Test-Token": "test-token-123"}),
        )
        assert ok.status_code == 204

        monkeypatch.setattr(settings, "runtime_env", "production")
        not_found = client.post(
            "/api/push/test",
            json={"title": "t", "body": "b"},
            headers=_auth_headers(user["access"], {"X-Push-Test-Token": "test-token-123"}),
        )
        assert not_found.status_code == 404


def test_send_push_returns_false_on_410(monkeypatch):
    class _Response:
        status_code = 410

    class _WebPushException(Exception):
        def __init__(self):
            super().__init__("gone")
            self.response = _Response()

    def _webpush(**_kwargs):
        raise _WebPushException()

    monkeypatch.setitem(sys.modules, "pywebpush", types.SimpleNamespace(WebPushException=_WebPushException, webpush=_webpush))
    monkeypatch.setattr(settings, "vapid_private_key", "private")
    monkeypatch.setattr(settings, "vapid_contact", "mailto:dev@budgetbuddy.app")

    subscription = types.SimpleNamespace(endpoint="https://push.example/subscriptions/device-003", p256dh="k1", auth="k2")
    assert send_push(subscription, {"title": "hello"}) is False


def test_send_bill_reminders_removes_expired_subscriptions(monkeypatch):
    with SessionLocal() as db:
        user = User(username=f"push_cli_{uuid.uuid4().hex[:6]}", password_hash="hash", currency_code="USD")
        db.add(user)
        db.flush()

        account = Account(user_id=user.id, name="Wallet", type="cash", initial_balance_cents=0)
        category = Category(user_id=user.id, name="Utilities", type="expense")
        db.add_all([account, category])
        db.flush()

        bill = Bill(
            user_id=user.id,
            name="Internet",
            due_day=date.today().day,
            budget_cents=150000,
            category_id=category.id,
            account_id=account.id,
            is_active=True,
        )
        sub = PushSubscription(
            user_id=user.id,
            endpoint="https://push.example/subscriptions/device-004",
            p256dh="k1",
            auth="k2",
            user_agent="ua",
        )
        db.add_all([bill, sub])
        db.commit()
        sub_id = sub.id

    monkeypatch.setattr(reminders_cli, "send_push", lambda _sub, _payload: False)
    result = reminders_cli.run(dry_run=False, log_fn=lambda _msg: None)
    assert result == 0

    with SessionLocal() as db:
        assert db.get(PushSubscription, sub_id) is None


def test_payload_builder_due_today_and_in_three_days():
    bill = types.SimpleNamespace(id="bill-1", name="Internet", budget_cents=150000)
    today = date(2026, 3, 5)

    due_today = due_date_for_month(5, today)
    payload_today = build_bill_payload(bill=bill, today=today, due_date=due_today)
    assert "today" in payload_today["title"].lower()

    due_three = due_date_for_month(8, today)
    payload_three = build_bill_payload(bill=bill, today=today, due_date=due_three)
    assert "3 days" in payload_three["title"].lower()
