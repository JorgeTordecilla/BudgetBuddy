import sys
import types
import uuid
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import select

import app.routers.push as push_router
from app.core.config import settings
from app.core.push_dispatcher import build_bill_payload, due_date_for_month, format_cents, send_push
from app.main import app
from app.db import SessionLocal
from app.models import Account, Bill, Category, PushSubscription, User
from app.cli import send_bill_reminders as reminders_cli

VENDOR = "application/vnd.budgetbuddy.v1+json"


def _register_user(client: TestClient) -> dict[str, str]:
    username = f"push_{uuid.uuid4().hex[:8]}"
    response = client.post(
        "/api/auth/register",
        json={"username": username, "password": "StrongPwd123!", "currency_code": "USD"},
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


def test_format_cents_respects_currency_minor_units():
    assert format_cents(150000, "COP") == "$150.000"
    assert format_cents(150000, "USD") == "$1.500,00"


def test_due_date_for_month_clamps_to_month_end_for_short_months():
    february_anchor = date(2026, 2, 1)
    assert due_date_for_month(29, february_anchor) == date(2026, 2, 28)
    assert due_date_for_month(30, february_anchor) == date(2026, 2, 28)
    assert due_date_for_month(31, february_anchor) == date(2026, 2, 28)

    april_anchor = date(2026, 4, 1)
    assert due_date_for_month(31, april_anchor) == date(2026, 4, 30)


def test_upsert_subscription_uses_postgres_branch_with_get_bind(monkeypatch):
    body = push_router.PushSubscribeRequest(
        endpoint="https://push.example/subscriptions/device-101",
        keys={"p256dh": "p-key", "auth": "a-key"},
        user_agent="ua-postgres",
    )

    fake_sub = types.SimpleNamespace(endpoint=body.endpoint)

    class _FakeStmt:
        def values(self, **_kwargs):
            return self

        def on_conflict_do_update(self, **_kwargs):
            return self

        def returning(self, _model):
            return self

    class _FakeResult:
        def scalar_one(self):
            return fake_sub

    class _FakeDb:
        def __init__(self):
            self.executed = 0

        def get_bind(self):
            return types.SimpleNamespace(dialect=types.SimpleNamespace(name="postgresql"))

        def execute(self, _stmt):
            self.executed += 1
            return _FakeResult()

    fake_stmt = _FakeStmt()
    monkeypatch.setattr(push_router, "pg_insert", lambda _model: fake_stmt)

    fake_db = _FakeDb()
    result = push_router._upsert_subscription(fake_db, "user-1", body)

    assert result is fake_sub
    assert fake_db.executed == 1


def test_upsert_subscription_uses_sqlite_fallback_branch(monkeypatch):
    body = push_router.PushSubscribeRequest(
        endpoint="https://push.example/subscriptions/device-202",
        keys={"p256dh": "p-key", "auth": "a-key"},
        user_agent="ua-sqlite",
    )

    class _FakeDb:
        def __init__(self):
            self.added = None
            self.existing = None

        def get_bind(self):
            return types.SimpleNamespace(dialect=types.SimpleNamespace(name="sqlite"))

        def scalar(self, _stmt):
            return self.existing

        def add(self, obj):
            self.added = obj

    fake_db = _FakeDb()
    created = push_router._upsert_subscription(fake_db, "user-2", body)
    assert created.endpoint == body.endpoint
    assert created.user_id == "user-2"
    assert fake_db.added is created

    fake_db.existing = created
    body_update = push_router.PushSubscribeRequest(
        endpoint=body.endpoint,
        keys={"p256dh": "p-key-updated", "auth": "a-key-updated"},
        user_agent="ua-sqlite-updated",
    )
    updated = push_router._upsert_subscription(fake_db, "user-3", body_update)
    assert updated is created
    assert updated.user_id == "user-3"
    assert updated.p256dh == "p-key-updated"
    assert updated.auth == "a-key-updated"
