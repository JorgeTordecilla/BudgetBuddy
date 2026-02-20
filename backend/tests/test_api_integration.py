import base64
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import timedelta
from http.cookies import SimpleCookie
from threading import Barrier, BrokenBarrierError, Event, Lock, Thread

from fastapi.testclient import TestClient

import app.routers.auth as auth_router
import app.main as app_main
from app.core.rate_limit import InMemoryRateLimiter
from app.main import app
from app.core.security import hash_refresh_token
from app.db import SessionLocal
from app.dependencies import utcnow
from app.models import RefreshToken, User

VENDOR = "application/vnd.budgetbuddy.v1+json"
PROBLEM = "application/problem+json"
MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/category-type-mismatch"
MISMATCH_TITLE = "Category type mismatch"
UNAUTHORIZED_TYPE = "https://api.budgetbuddy.dev/problems/unauthorized"
UNAUTHORIZED_TITLE = "Unauthorized"
FORBIDDEN_TYPE = "https://api.budgetbuddy.dev/problems/forbidden"
FORBIDDEN_TITLE = "Forbidden"
NOT_ACCEPTABLE_TYPE = "https://api.budgetbuddy.dev/problems/not-acceptable"
NOT_ACCEPTABLE_TITLE = "Not Acceptable"
CATEGORY_ARCHIVED_TYPE = "https://api.budgetbuddy.dev/problems/category-archived"
CATEGORY_ARCHIVED_TITLE = "Category is archived"
INVALID_CURSOR_TYPE = "https://api.budgetbuddy.dev/problems/invalid-cursor"
INVALID_CURSOR_TITLE = "Invalid cursor"
INVALID_DATE_RANGE_TYPE = "https://api.budgetbuddy.dev/problems/invalid-date-range"
INVALID_DATE_RANGE_TITLE = "Invalid date range"
MONEY_AMOUNT_NOT_INTEGER_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-not-integer"
MONEY_AMOUNT_NOT_INTEGER_TITLE = "Money amount must be an integer"
MONEY_AMOUNT_OUT_OF_RANGE_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-out-of-range"
MONEY_AMOUNT_OUT_OF_RANGE_TITLE = "Money amount is out of safe range"
MONEY_AMOUNT_SIGN_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/money-amount-sign-invalid"
MONEY_AMOUNT_SIGN_INVALID_TITLE = "Money amount sign is invalid"
MONEY_CURRENCY_MISMATCH_TYPE = "https://api.budgetbuddy.dev/problems/money-currency-mismatch"
MONEY_CURRENCY_MISMATCH_TITLE = "Money currency mismatch"
IMPORT_BATCH_LIMIT_EXCEEDED_TYPE = "https://api.budgetbuddy.dev/problems/import-batch-limit-exceeded"
IMPORT_BATCH_LIMIT_EXCEEDED_TITLE = "Import batch limit exceeded"
RATE_LIMITED_TYPE = "https://api.budgetbuddy.dev/problems/rate-limited"
RATE_LIMITED_TITLE = "Too Many Requests"
BUDGET_DUPLICATE_TYPE = "https://api.budgetbuddy.dev/problems/budget-duplicate"
BUDGET_DUPLICATE_TITLE = "Budget already exists"
CATEGORY_NOT_OWNED_TYPE = "https://api.budgetbuddy.dev/problems/category-not-owned"
CATEGORY_NOT_OWNED_TITLE = "Category is not owned by authenticated user"
BUDGET_MONTH_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/budget-month-invalid"
BUDGET_MONTH_INVALID_TITLE = "Budget month format is invalid"
REFRESH_REVOKED_TYPE = "https://api.budgetbuddy.dev/problems/refresh-revoked"
REFRESH_REUSE_DETECTED_TYPE = "https://api.budgetbuddy.dev/problems/refresh-reuse-detected"
REFRESH_REVOKED_TITLE = "Refresh token revoked"
REFRESH_REUSE_DETECTED_TITLE = "Refresh token reuse detected"
REQUEST_ID_HEADER = "x-request-id"
REFRESH_COOKIE_NAME = "bb_refresh"
CORS_DEV_ORIGIN = "http://localhost:5173"


def _register_user(client: TestClient):
    username = f"u_{uuid.uuid4().hex[:8]}"
    payload = {
        "username": username,
        "password": "supersecurepwd123",
        "currency_code": "USD",
    }
    r = client.post("/api/auth/register", json=payload, headers={"accept": VENDOR, "content-type": VENDOR})
    assert r.status_code == 201
    assert r.headers["content-type"].startswith(VENDOR)
    register_cookie_header = r.headers.get("set-cookie", "")
    assert f"{REFRESH_COOKIE_NAME}=" in register_cookie_header
    assert "HttpOnly" in register_cookie_header
    assert "Secure" in register_cookie_header
    assert "samesite=none" in register_cookie_header.lower()
    assert "Path=/api/auth" in register_cookie_header
    assert "Max-Age=" in register_cookie_header
    body = r.json()
    assert "refresh_token" not in body
    return {
        "username": username,
        "password": payload["password"],
        "access": body["access_token"],
        "refresh": _refresh_cookie_from_response(r),
    }


def _auth_headers(access: str) -> dict[str, str]:
    return {
        "accept": VENDOR,
        "content-type": VENDOR,
        "authorization": f"Bearer {access}",
    }


def _refresh_headers(refresh_token: str) -> dict[str, str]:
    return {
        "accept": VENDOR,
        "content-type": VENDOR,
        "cookie": f"{REFRESH_COOKIE_NAME}={refresh_token}",
    }


def _refresh_cookie_from_response(response) -> str:
    set_cookie = response.headers.get("set-cookie", "")
    cookie = SimpleCookie()
    cookie.load(set_cookie)
    morsel = cookie.get(REFRESH_COOKIE_NAME)
    assert morsel is not None
    return morsel.value


def _create_account(client: TestClient, headers: dict[str, str], name: str) -> str:
    response = client.post(
        "/api/accounts",
        json={"name": name, "type": "cash", "initial_balance_cents": 1000, "note": "acct"},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_category(client: TestClient, headers: dict[str, str], name: str, type_: str) -> str:
    response = client.post(
        "/api/categories",
        json={"name": name, "type": type_, "note": type_},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_budget(client: TestClient, headers: dict[str, str], *, month: str, category_id: str, limit_cents: int) -> tuple[int, dict]:
    response = client.post(
        "/api/budgets",
        json={"month": month, "category_id": category_id, "limit_cents": limit_cents},
        headers=headers,
    )
    body = response.json() if response.headers["content-type"].startswith(("application/problem+json", VENDOR)) else {}
    return response.status_code, body


def _create_transaction(
    client: TestClient,
    headers: dict[str, str],
    *,
    type_: str,
    account_id: str,
    category_id: str,
    note: str,
    date: str = "2026-02-01",
) -> tuple[int, dict]:
    response = client.post(
        "/api/transactions",
        json={
            "type": type_,
            "account_id": account_id,
            "category_id": category_id,
            "amount_cents": 7000,
            "date": date,
            "merchant": "Acme",
            "note": note,
        },
        headers=headers,
    )
    return response.status_code, response.json()


def _assert_category_mismatch_problem(response):
    assert response.status_code == 409
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == MISMATCH_TYPE
    assert body["title"] == MISMATCH_TITLE
    assert body["status"] == 409


def _assert_invalid_cursor_problem(response):
    assert response.status_code == 400
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == INVALID_CURSOR_TYPE
    assert body["title"] == INVALID_CURSOR_TITLE
    assert body["status"] == 400


def _assert_invalid_date_range_problem(response):
    assert response.status_code == 400
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == INVALID_DATE_RANGE_TYPE
    assert body["title"] == INVALID_DATE_RANGE_TITLE
    assert body["status"] == 400


def _assert_invalid_request_problem(response):
    assert response.status_code == 400
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["title"] == "Invalid request"
    assert body["status"] == 400


def _assert_rate_limited_problem(response):
    assert response.status_code == 429
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == RATE_LIMITED_TYPE
    assert body["title"] == RATE_LIMITED_TITLE
    assert body["status"] == 429


def _assert_money_problem(response, expected_type: str, expected_title: str):
    assert response.status_code == 400
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == expected_type
    assert body["title"] == expected_title
    assert body["status"] == 400


def _assert_forbidden_problem(response):
    assert response.status_code == 403
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == FORBIDDEN_TYPE
    assert body["title"] == FORBIDDEN_TITLE
    assert body["status"] == 403


def _assert_unauthorized_problem(response):
    assert response.status_code == 401
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == UNAUTHORIZED_TYPE
    assert body["title"] == UNAUTHORIZED_TITLE
    assert body["status"] == 401


def _assert_refresh_revoked_problem(response, title: str):
    assert response.status_code == 403
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == REFRESH_REVOKED_TYPE
    assert body["title"] == title
    assert body["status"] == 403


def _assert_refresh_reuse_detected_problem(response):
    assert response.status_code == 403
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == REFRESH_REUSE_DETECTED_TYPE
    assert body["title"] == REFRESH_REUSE_DETECTED_TITLE
    assert body["status"] == 403


def _assert_request_id_header_present(response):
    assert REQUEST_ID_HEADER in response.headers
    assert response.headers[REQUEST_ID_HEADER].strip() != ""


def _assert_category_archived_problem(response):
    assert response.status_code == 409
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == CATEGORY_ARCHIVED_TYPE
    assert body["title"] == CATEGORY_ARCHIVED_TITLE
    assert body["status"] == 409


def _assert_budget_conflict_problem(response, expected_type: str, expected_title: str):
    assert response.status_code == 409
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["type"] == expected_type
    assert body["title"] == expected_title
    assert body["status"] == 409


def _create_income_tx_and_assert(
    client: TestClient,
    auth_headers: dict[str, str],
    *,
    account_id: str,
    category_id: str,
    note: str,
    date: str,
) -> str:
    status, body = _create_transaction(
        client,
        auth_headers,
        type_="income",
        account_id=account_id,
        category_id=category_id,
        note=note,
        date=date,
    )
    assert status == 201
    return body["id"]


def _archive_category_and_assert(client: TestClient, user_access: str, category_id: str) -> None:
    archive = client.delete(
        f"/api/categories/{category_id}",
        headers={"accept": VENDOR, "authorization": f"Bearer {user_access}"},
    )
    assert archive.status_code == 204


def _archive_account_and_assert(client: TestClient, user_access: str, account_id: str) -> None:
    archive = client.delete(
        f"/api/accounts/{account_id}",
        headers={"accept": VENDOR, "authorization": f"Bearer {user_access}"},
    )
    assert archive.status_code == 204


def _archive_transaction_and_assert(client: TestClient, user_access: str, transaction_id: str) -> None:
    archive = client.delete(
        f"/api/transactions/{transaction_id}",
        headers={"accept": VENDOR, "authorization": f"Bearer {user_access}"},
    )
    assert archive.status_code == 204


def _make_access_token(sub) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": sub, "exp": int(time.time()) + 3600, "iat": int(time.time())}
    header_part = base64.urlsafe_b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    payload_part = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    secret = os.environ["JWT_SECRET"].encode("utf-8")
    sig = hmac.new(secret, f"{header_part}.{payload_part}".encode("ascii"), hashlib.sha256).digest()
    sig_part = base64.urlsafe_b64encode(sig).decode("ascii").rstrip("=")
    return f"{header_part}.{payload_part}.{sig_part}"


def _make_legacy_access_token(sub) -> str:
    payload = {"sub": sub, "exp": int(time.time()) + 3600, "iat": int(time.time())}
    payload_part = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    secret = os.environ["JWT_SECRET"].encode("utf-8")
    sig = hmac.new(secret, payload_part.encode("ascii"), hashlib.sha256).digest()
    sig_part = base64.urlsafe_b64encode(sig).decode("ascii").rstrip("=")
    return f"{payload_part}.{sig_part}"


def _collect_paginated_ids(client: TestClient, path: str, access_token: str, *, limit: int = 10) -> tuple[list[str], list[int]]:
    ids: list[str] = []
    page_sizes: list[int] = []
    cursor: str | None = None

    while True:
        sep = "&" if "?" in path else "?"
        url = f"{path}{sep}limit={limit}"
        if cursor:
            url = f"{url}&cursor={cursor}"

        response = client.get(url, headers={"accept": VENDOR, "authorization": f"Bearer {access_token}"})
        assert response.status_code == 200
        assert response.headers["content-type"].startswith(VENDOR)
        body = response.json()

        items = body["items"]
        page_sizes.append(len(items))
        ids.extend([item["id"] for item in items])

        cursor = body["next_cursor"]
        if cursor is None:
            break

    return ids, page_sizes


def test_problem_details_on_invalid_accept():
    with TestClient(app) as client:
        r = client.post(
            "/api/auth/register",
            json={"username": "abc_123", "password": "supersecurepwd123", "currency_code": "USD"},
            headers={"accept": "application/xml", "content-type": VENDOR},
        )
        assert r.status_code == 406
        assert r.headers["content-type"].startswith(PROBLEM)
        body = r.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406
        _assert_request_id_header_present(r)


def test_accept_header_rejects_partial_media_type_match():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={"username": "abc_124", "password": "supersecurepwd123", "currency_code": "USD"},
            headers={"accept": "application/vnd.budgetbuddy.v1+json-foo", "content-type": VENDOR},
        )
        assert response.status_code == 406
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406


def test_accept_header_with_q_zero_is_rejected():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={"username": "abc_1245", "password": "supersecurepwd123", "currency_code": "USD"},
            headers={"accept": f"{VENDOR};q=0", "content-type": VENDOR},
        )
        assert response.status_code == 406
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406


def test_content_type_rejects_partial_media_type_match():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={"username": "abc_125", "password": "supersecurepwd123", "currency_code": "USD"},
            headers={"accept": VENDOR, "content-type": "application/vnd.budgetbuddy.v1+json-foo"},
        )
        assert response.status_code == 400
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["title"] == "Invalid request"
        assert body["status"] == 400


def test_success_response_includes_request_id_header():
    with TestClient(app) as client:
        response = client.get("/api/healthz")
        assert response.status_code == 200
        _assert_request_id_header_present(response)


def test_client_supplied_request_id_is_propagated():
    with TestClient(app) as client:
        request_id = "req-hu10-propagation-001"
        response = client.get("/api/healthz", headers={REQUEST_ID_HEADER: request_id})
        assert response.status_code == 200
        assert response.headers[REQUEST_ID_HEADER] == request_id


def test_healthz_returns_liveness_payload():
    with TestClient(app) as client:
        response = client.get("/api/healthz")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith(VENDOR)
        body = response.json()
        assert body["status"] == "ok"
        assert isinstance(body["version"], str)


def test_readyz_returns_200_when_database_ready(monkeypatch):
    monkeypatch.setattr(app_main.settings, "migrations_strict", False)
    monkeypatch.setattr(app_main, "get_migration_revision_state", lambda: ("ok", "rev-db", "rev-head"))
    with TestClient(app) as client:
        response = client.get("/api/readyz")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith(VENDOR)
        body = response.json()
        assert body["status"] == "ready"
        assert isinstance(body["version"], str)
        assert body["checks"] == {"db": "ok", "schema": "ok"}


def test_readyz_returns_503_when_database_not_ready(monkeypatch):
    monkeypatch.setattr(app_main, "is_database_ready", lambda: False)
    with TestClient(app) as client:
        response = client.get("/api/readyz")
        assert response.status_code == 503
        assert response.headers["content-type"].startswith(VENDOR)
        body = response.json()
        assert body["status"] == "not_ready"
        assert isinstance(body["version"], str)
        assert body["checks"] == {"db": "fail", "schema": "skip"}


def test_readyz_strict_mode_schema_mismatch_returns_503(monkeypatch):
    monkeypatch.setattr(app_main.settings, "migrations_strict", True)
    monkeypatch.setattr(app_main, "get_migration_revision_state", lambda: ("fail", "db_rev", "head_rev"))
    with TestClient(app) as client:
        response = client.get("/api/readyz")
        assert response.status_code == 503
        body = response.json()
        assert body["status"] == "not_ready"
        assert body["checks"] == {"db": "ok", "schema": "fail"}


def test_readyz_strict_mode_schema_match_returns_200(monkeypatch):
    monkeypatch.setattr(app_main.settings, "migrations_strict", True)
    monkeypatch.setattr(app_main, "get_migration_revision_state", lambda: ("ok", "db_rev", "db_rev"))
    with TestClient(app) as client:
        response = client.get("/api/readyz")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ready"
        assert body["checks"] == {"db": "ok", "schema": "ok"}


def test_readyz_non_strict_mode_schema_mismatch_stays_ready(monkeypatch):
    monkeypatch.setattr(app_main.settings, "migrations_strict", False)
    monkeypatch.setattr(app_main, "get_migration_revision_state", lambda: ("fail", "db_rev", "head_rev"))
    with TestClient(app) as client:
        response = client.get("/api/readyz")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ready"
        assert body["checks"] == {"db": "ok", "schema": "fail"}


def test_readyz_schema_check_failure_handling(monkeypatch):
    monkeypatch.setattr(app_main.settings, "migrations_strict", True)
    monkeypatch.setattr(app_main, "get_migration_revision_state", lambda: ("unknown", None, None))
    with TestClient(app) as client:
        response = client.get("/api/readyz")
        assert response.status_code == 503
        body = response.json()
        assert body["status"] == "not_ready"
        assert body["checks"] == {"db": "ok", "schema": "fail"}


def test_readyz_logs_revision_diagnostics(monkeypatch, caplog):
    monkeypatch.setattr(app_main.settings, "migrations_strict", False)
    monkeypatch.setattr(app_main, "get_migration_revision_state", lambda: ("ok", "db_rev_1", "head_rev_1"))
    with caplog.at_level(logging.INFO, logger="app.readiness"):
        with TestClient(app) as client:
            response = client.get("/api/readyz")
            assert response.status_code == 200
    messages = [record.getMessage() for record in caplog.records if record.name == "app.readiness"]
    assert any("db_revision=db_rev_1" in message for message in messages)
    assert any("head_revision=head_rev_1" in message for message in messages)
    assert any("migrations_strict=False" in message for message in messages)


def test_error_response_includes_request_id_header():
    with TestClient(app) as client:
        response = client.get("/api/accounts", headers={"accept": VENDOR})
        assert response.status_code == 401
        _assert_request_id_header_present(response)


def test_access_token_with_non_string_subject_returns_401():
    with TestClient(app) as client:
        token = _make_access_token({"x": 1})
        response = client.get(
            "/api/accounts",
            headers={"accept": VENDOR, "authorization": f"Bearer {token}"},
        )
        _assert_unauthorized_problem(response)


def test_problem_detail_sanitizes_token_like_content():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/register",
            json={
                "username": "abc_123",
                "password": {"token": "Bearer abc.def.ghi"},
                "currency_code": "USD",
            },
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert response.status_code == 400
        assert response.headers["content-type"].startswith(PROBLEM)
        _assert_request_id_header_present(response)
        body = response.json()
        detail = body.get("detail", "")
        assert "Bearer abc.def.ghi" not in detail
        assert "abc.def.ghi" not in detail


def test_auth_lifecycle_and_204_logout():
    with TestClient(app) as client:
        user = _register_user(client)

        login = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": user["password"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert login.status_code == 200
        assert login.headers["content-type"].startswith(VENDOR)
        _assert_request_id_header_present(login)
        login_cookie_header = login.headers.get("set-cookie", "")
        assert f"{REFRESH_COOKIE_NAME}=" in login_cookie_header
        assert "HttpOnly" in login_cookie_header
        assert "Secure" in login_cookie_header
        assert "samesite=none" in login_cookie_header.lower()
        assert "Path=/api/auth" in login_cookie_header
        assert "Max-Age=" in login_cookie_header

        bad_login = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": "wrongpassword123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert bad_login.status_code == 401
        assert bad_login.headers["content-type"].startswith(PROBLEM)
        _assert_request_id_header_present(bad_login)

        refresh = client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))
        assert refresh.status_code == 200
        _assert_request_id_header_present(refresh)
        assert "refresh_token" not in refresh.json()
        rotated_cookie = _refresh_cookie_from_response(refresh)
        assert rotated_cookie != user["refresh"]

        logout = client.post("/api/auth/logout", headers=_refresh_headers(rotated_cookie))
        assert logout.status_code == 204
        _assert_request_id_header_present(logout)
        assert logout.text == ""
        logout_cookie_header = logout.headers.get("set-cookie", "")
        assert f"{REFRESH_COOKIE_NAME}=" in logout_cookie_header
        assert "Max-Age=0" in logout_cookie_header


def test_me_returns_authenticated_user():
    with TestClient(app) as client:
        user = _register_user(client)

        response = client.get(
            "/api/me",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith(VENDOR)
        _assert_request_id_header_present(response)
        body = response.json()
        assert body["username"] == user["username"]
        assert body["currency_code"] == "USD"
        assert isinstance(body["id"], str)
        assert body["id"].strip() != ""


def test_me_without_token_returns_canonical_401():
    with TestClient(app) as client:
        response = client.get("/api/me", headers={"accept": VENDOR})
        _assert_unauthorized_problem(response)


def test_legacy_access_token_is_rejected():
    with TestClient(app) as client:
        user = _register_user(client)
        me = client.get("/api/me", headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"})
        assert me.status_code == 200
        user_id = me.json()["id"]

        legacy_token = _make_legacy_access_token(user_id)
        rejected = client.get(
            "/api/me",
            headers={"accept": VENDOR, "authorization": f"Bearer {legacy_token}"},
        )
        _assert_unauthorized_problem(rejected)
        _assert_request_id_header_present(rejected)


def test_me_not_acceptable_returns_canonical_406():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/me",
            headers={"accept": "application/xml", "authorization": f"Bearer {user['access']}"},
        )
        assert response.status_code == 406
        assert response.headers["content-type"].startswith(PROBLEM)
        _assert_request_id_header_present(response)
        body = response.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406


def test_cors_preflight_auth_refresh_allows_credentials_for_dev_origin():
    with TestClient(app) as client:
        response = client.options(
            "/api/auth/refresh",
            headers={
                "origin": CORS_DEV_ORIGIN,
                "access-control-request-method": "POST",
                "access-control-request-headers": "authorization,content-type,accept,x-request-id",
            },
        )
        assert response.status_code in {200, 204}
        assert response.headers.get("access-control-allow-origin") == CORS_DEV_ORIGIN
        assert response.headers.get("access-control-allow-credentials") == "true"
        allow_methods = response.headers.get("access-control-allow-methods", "").upper()
        assert "GET" in allow_methods
        assert "POST" in allow_methods
        assert "PATCH" in allow_methods
        assert "DELETE" in allow_methods
        assert "OPTIONS" in allow_methods


def test_cors_headers_present_on_auth_login_for_allowed_origin():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": user["password"]},
            headers={"accept": VENDOR, "content-type": VENDOR, "origin": CORS_DEV_ORIGIN},
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == CORS_DEV_ORIGIN
        assert response.headers.get("access-control-allow-credentials") == "true"
        expose_headers = response.headers.get("access-control-expose-headers", "").lower()
        assert "x-request-id" in expose_headers
        assert "retry-after" in expose_headers


def test_refresh_token_rotation_blocks_reuse():
    with TestClient(app) as client:
        user = _register_user(client)

        first_refresh = client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))
        assert first_refresh.status_code == 200
        assert first_refresh.headers["content-type"].startswith(VENDOR)
        new_refresh_token = _refresh_cookie_from_response(first_refresh)
        assert new_refresh_token != user["refresh"]

        second_refresh_same_token = client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))
        _assert_refresh_reuse_detected_problem(second_refresh_same_token)


def test_refresh_token_rotation_is_atomic_under_concurrency(monkeypatch):
    user_refresh: str = ""

    with TestClient(app) as client:
        user = _register_user(client)
        user_refresh = user["refresh"]

    refresh_hash = hash_refresh_token(user_refresh)
    barrier = Barrier(2)
    original_get_by_hash = auth_router.SQLAlchemyRefreshTokenRepository.get_by_hash

    def synchronized_get_by_hash(self, token_hash: str):
        row = original_get_by_hash(self, token_hash)
        if token_hash == refresh_hash and row is not None and row.revoked_at is None:
            try:
                barrier.wait(timeout=2)
            except BrokenBarrierError:
                pass
        return row

    monkeypatch.setattr(auth_router.SQLAlchemyRefreshTokenRepository, "get_by_hash", synchronized_get_by_hash)

    responses: list = [None, None]

    def do_refresh(index: int):
        with TestClient(app) as client:
            responses[index] = client.post("/api/auth/refresh", headers=_refresh_headers(user_refresh))

    t1 = Thread(target=do_refresh, args=(0,))
    t2 = Thread(target=do_refresh, args=(1,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    status_codes = sorted([responses[0].status_code, responses[1].status_code])
    assert status_codes == [200, 403]

    success = responses[0] if responses[0].status_code == 200 else responses[1]
    failure = responses[0] if responses[0].status_code == 403 else responses[1]
    assert success.headers["content-type"].startswith(VENDOR)
    _assert_refresh_reuse_detected_problem(failure)


def test_refresh_with_expired_token_returns_401():
    with TestClient(app) as client:
        user = _register_user(client)
        refresh_hash = hash_refresh_token(user["refresh"])

        db = SessionLocal()
        try:
            row = db.query(RefreshToken).filter(RefreshToken.token_hash == refresh_hash).one()
            row.expires_at = utcnow() - timedelta(minutes=1)
            db.commit()
        finally:
            db.close()

        refresh = client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))
        assert refresh.status_code == 401
        assert refresh.headers["content-type"].startswith(PROBLEM)
        body = refresh.json()
        assert body["type"] == UNAUTHORIZED_TYPE
        assert body["title"] == UNAUTHORIZED_TITLE
        assert body["status"] == 401


def test_refresh_without_cookie_returns_canonical_401():
    with TestClient(app) as client:
        _register_user(client)
        response = client.post("/api/auth/refresh", headers={"accept": VENDOR, "content-type": VENDOR})
        _assert_unauthorized_problem(response)


def test_refresh_returns_401_if_token_expires_during_rotation(monkeypatch):
    with TestClient(app) as client:
        user = _register_user(client)
        refresh_hash = hash_refresh_token(user["refresh"])

        db = SessionLocal()
        try:
            row = db.query(RefreshToken).filter(RefreshToken.token_hash == refresh_hash).one()
            row.expires_at = utcnow() + timedelta(minutes=5)
            db.commit()
        finally:
            db.close()

        base_now = utcnow()
        times = [base_now, base_now + timedelta(days=2), base_now + timedelta(days=2)]
        call_index = {"value": 0}

        def fake_utcnow():
            idx = call_index["value"]
            call_index["value"] += 1
            return times[idx] if idx < len(times) else times[-1]

        monkeypatch.setattr(auth_router, "utcnow", fake_utcnow)

        response = client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))
        assert response.status_code == 401
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == UNAUTHORIZED_TYPE
        assert body["title"] == UNAUTHORIZED_TITLE
        assert body["status"] == 401


def test_logout_revokes_active_refresh_tokens():
    with TestClient(app) as client:
        user = _register_user(client)

        logout = client.post("/api/auth/logout", headers=_refresh_headers(user["refresh"]))
        assert logout.status_code == 204

        refresh_after_logout = client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))
        _assert_refresh_revoked_problem(refresh_after_logout, REFRESH_REVOKED_TITLE)


def _user_id_from_refresh_token(refresh_hash: str) -> str:
    db = SessionLocal()
    try:
        token_row = db.query(RefreshToken).filter(RefreshToken.token_hash == refresh_hash).one()
        return token_row.user_id
    finally:
        db.close()


def _active_refresh_count(user_id: str) -> int:
    db = SessionLocal()
    try:
        return (
            db.query(RefreshToken)
            .filter(RefreshToken.user_id == user_id)
            .filter(RefreshToken.revoked_at.is_(None))
            .count()
        )
    finally:
        db.close()


def _refresh_during_logout(client: TestClient, user: dict[str, str], refresh_hash: str, monkeypatch):
    refresh_ready = Event()
    continue_refresh = Event()
    original_get_by_hash = auth_router.SQLAlchemyRefreshTokenRepository.get_by_hash
    block_once_lock = Lock()
    block_once_state = {"blocked": False}

    def synchronized_get_by_hash(self, token_hash: str):
        row = original_get_by_hash(self, token_hash)
        if token_hash != refresh_hash:
            return row
        should_block = False
        with block_once_lock:
            if not block_once_state["blocked"]:
                block_once_state["blocked"] = True
                should_block = True
        if should_block:
            refresh_ready.set()
            continue_refresh.wait(timeout=5)
        return row

    monkeypatch.setattr(auth_router.SQLAlchemyRefreshTokenRepository, "get_by_hash", synchronized_get_by_hash)
    responses: list = [None, None]
    return refresh_ready, continue_refresh, responses


def test_logout_blocks_refresh_in_flight_with_same_token(monkeypatch):
    with TestClient(app) as client:
        user = _register_user(client)
        refresh_hash = hash_refresh_token(user["refresh"])
        user_id = _user_id_from_refresh_token(refresh_hash)
        refresh_ready, continue_refresh, responses = _refresh_during_logout(client, user, refresh_hash, monkeypatch)

        def do_refresh():
            with TestClient(app) as refresh_client:
                responses[0] = refresh_client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))

        refresh_thread = Thread(target=do_refresh, name="refresh-thread")
        refresh_thread.start()
        assert refresh_ready.wait(timeout=2)

        responses[1] = client.post("/api/auth/logout", headers=_refresh_headers(user["refresh"]))
        assert responses[1].status_code == 204

        continue_refresh.set()
        refresh_thread.join()

        assert responses[0].status_code in (200, 403)
        if responses[0].status_code == 403:
            _assert_refresh_revoked_problem(responses[0], REFRESH_REVOKED_TITLE)
        else:
            assert responses[0].headers["content-type"].startswith(VENDOR)

        assert _active_refresh_count(user_id) == 0


def _configure_auth_rate_limit_for_test(
    monkeypatch,
    *,
    login_limit: int,
    refresh_limit: int,
    window_seconds: int,
    lock_enabled: bool = False,
    lock_seconds: int = 0,
    now_fn=None,
):
    monkeypatch.setattr(auth_router.settings, "auth_login_rate_limit_per_minute", login_limit)
    monkeypatch.setattr(auth_router.settings, "auth_refresh_rate_limit_per_minute", refresh_limit)
    monkeypatch.setattr(auth_router.settings, "auth_rate_limit_window_seconds", window_seconds)
    monkeypatch.setattr(auth_router.settings, "auth_rate_limit_lock_enabled", lock_enabled)
    monkeypatch.setattr(auth_router.settings, "auth_rate_limit_lock_seconds", lock_seconds)
    monkeypatch.setattr(auth_router, "_AUTH_RATE_LIMITER", InMemoryRateLimiter(now_fn=now_fn))


def test_auth_login_rate_limit_exceeded_returns_canonical_429(monkeypatch):
    _configure_auth_rate_limit_for_test(monkeypatch, login_limit=1, refresh_limit=30, window_seconds=60)

    with TestClient(app) as client:
        user = _register_user(client)
        first = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": "wrongpassword123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert first.status_code == 401

        second = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": "wrongpassword123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_rate_limited_problem(second)
        assert int(second.headers["retry-after"]) >= 1


def test_auth_refresh_rate_limit_exceeded_returns_canonical_429(monkeypatch):
    _configure_auth_rate_limit_for_test(monkeypatch, login_limit=10, refresh_limit=1, window_seconds=60)

    with TestClient(app) as client:
        _register_user(client)
        first = client.post("/api/auth/refresh", headers=_refresh_headers("invalid-refresh-token"))
        assert first.status_code == 401

        second = client.post("/api/auth/refresh", headers=_refresh_headers("invalid-refresh-token"))
        _assert_rate_limited_problem(second)
        assert int(second.headers["retry-after"]) >= 1


def test_auth_login_refresh_behavior_unchanged_under_limit(monkeypatch):
    _configure_auth_rate_limit_for_test(monkeypatch, login_limit=10, refresh_limit=10, window_seconds=60)

    with TestClient(app) as client:
        user = _register_user(client)
        login = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": user["password"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert login.status_code == 200
        assert login.headers["content-type"].startswith(VENDOR)

        refresh = client.post("/api/auth/refresh", headers=_refresh_headers(_refresh_cookie_from_response(login)))
        assert refresh.status_code == 200
        assert refresh.headers["content-type"].startswith(VENDOR)


def test_auth_login_lock_window_is_deterministic(monkeypatch):
    clock = {"now": 1_000.0}
    _configure_auth_rate_limit_for_test(
        monkeypatch,
        login_limit=1,
        refresh_limit=30,
        window_seconds=60,
        lock_enabled=True,
        lock_seconds=120,
        now_fn=lambda: clock["now"],
    )

    with TestClient(app) as client:
        user = _register_user(client)
        first = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": "wrongpassword123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert first.status_code == 401

        second = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": "wrongpassword123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_rate_limited_problem(second)
        assert int(second.headers["retry-after"]) == 120

        clock["now"] = 1_060.0
        third = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": "wrongpassword123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_rate_limited_problem(third)

        clock["now"] = 1_121.0
        after_lock = client.post(
            "/api/auth/login",
            json={"username": user["username"], "password": "wrongpassword123"},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert after_lock.status_code == 401


def test_domain_and_analytics_flow():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])

        unauth = client.get("/api/accounts", headers={"accept": VENDOR})
        _assert_unauthorized_problem(unauth)

        account_id = _create_account(client, auth_headers, "wallet")
        category_id = _create_category(client, auth_headers, "salary", "income")
        status, _ = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=category_id,
            note="salary",
            date="2026-01-15",
        )
        assert status == 201

        by_month = client.get("/api/analytics/by-month?from=2026-01-01&to=2026-12-31", headers=auth_headers)
        assert by_month.status_code == 200
        assert by_month.headers["content-type"].startswith(VENDOR)
        assert isinstance(by_month.json()["items"], list)

        by_category = client.get("/api/analytics/by-category?from=2026-01-01&to=2026-12-31", headers=auth_headers)
        assert by_category.status_code == 200
        assert by_category.headers["content-type"].startswith(VENDOR)

        forbidden = client.get(f"/api/accounts/{uuid.uuid4()}", headers=auth_headers)
        assert forbidden.status_code == 403
        assert forbidden.headers["content-type"].startswith(PROBLEM)


def test_include_archived_toggle_policy_is_consistent_across_list_endpoints():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])

        account_active = _create_account(client, auth_headers, "toggle-account-active")
        account_archived = _create_account(client, auth_headers, "toggle-account-archived")
        _archive_account_and_assert(client, user["access"], account_archived)

        category_active = _create_category(client, auth_headers, "toggle-category-active", "expense")
        category_archived = _create_category(client, auth_headers, "toggle-category-archived", "expense")
        _archive_category_and_assert(client, user["access"], category_archived)

        status, tx_active_body = _create_transaction(
            client,
            auth_headers,
            type_="expense",
            account_id=account_active,
            category_id=category_active,
            note="toggle-tx-active",
            date="2026-10-01",
        )
        assert status == 201
        status, tx_archived_body = _create_transaction(
            client,
            auth_headers,
            type_="expense",
            account_id=account_active,
            category_id=category_active,
            note="toggle-tx-archived",
            date="2026-10-02",
        )
        assert status == 201
        _archive_transaction_and_assert(client, user["access"], tx_archived_body["id"])

        accounts_default = client.get("/api/accounts", headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"})
        assert accounts_default.status_code == 200
        account_ids_default = {item["id"] for item in accounts_default.json()["items"]}
        assert account_active in account_ids_default
        assert account_archived not in account_ids_default

        accounts_with_archived = client.get(
            "/api/accounts?include_archived=true",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert accounts_with_archived.status_code == 200
        account_ids_with_archived = {item["id"] for item in accounts_with_archived.json()["items"]}
        assert account_active in account_ids_with_archived
        assert account_archived in account_ids_with_archived

        categories_default = client.get("/api/categories", headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"})
        assert categories_default.status_code == 200
        category_ids_default = {item["id"] for item in categories_default.json()["items"]}
        assert category_active in category_ids_default
        assert category_archived not in category_ids_default

        categories_with_archived = client.get(
            "/api/categories?include_archived=true",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert categories_with_archived.status_code == 200
        category_ids_with_archived = {item["id"] for item in categories_with_archived.json()["items"]}
        assert category_active in category_ids_with_archived
        assert category_archived in category_ids_with_archived

        transactions_default = client.get(
            "/api/transactions",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert transactions_default.status_code == 200
        transaction_ids_default = {item["id"] for item in transactions_default.json()["items"]}
        assert tx_active_body["id"] in transaction_ids_default
        assert tx_archived_body["id"] not in transaction_ids_default

        transactions_with_archived = client.get(
            "/api/transactions?include_archived=true",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert transactions_with_archived.status_code == 200
        transaction_ids_with_archived = {item["id"] for item in transactions_with_archived.json()["items"]}
        assert tx_active_body["id"] in transaction_ids_with_archived
        assert tx_archived_body["id"] in transaction_ids_with_archived


def test_analytics_excludes_archived_transactions_and_restores_on_unarchive():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "analytics-archived-account")
        category_id = _create_category(client, auth_headers, "analytics-archived-category", "expense")

        status, tx_body = _create_transaction(
            client,
            auth_headers,
            type_="expense",
            account_id=account_id,
            category_id=category_id,
            note="analytics-archived-seed",
            date="2026-11-15",
        )
        assert status == 201
        tx_id = tx_body["id"]

        by_month_before = client.get("/api/analytics/by-month?from=2026-11-01&to=2026-11-30", headers=auth_headers)
        assert by_month_before.status_code == 200
        assert by_month_before.json()["items"][0]["expense_total_cents"] == 7000

        by_category_before = client.get("/api/analytics/by-category?from=2026-11-01&to=2026-11-30", headers=auth_headers)
        assert by_category_before.status_code == 200
        assert by_category_before.json()["items"][0]["expense_total_cents"] == 7000

        _archive_transaction_and_assert(client, user["access"], tx_id)

        by_month_after_archive = client.get("/api/analytics/by-month?from=2026-11-01&to=2026-11-30", headers=auth_headers)
        assert by_month_after_archive.status_code == 200
        assert by_month_after_archive.json()["items"] == []

        by_category_after_archive = client.get("/api/analytics/by-category?from=2026-11-01&to=2026-11-30", headers=auth_headers)
        assert by_category_after_archive.status_code == 200
        assert by_category_after_archive.json()["items"] == []

        restore = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore.status_code == 200
        assert restore.json()["archived_at"] is None

        by_month_after_restore = client.get("/api/analytics/by-month?from=2026-11-01&to=2026-11-30", headers=auth_headers)
        assert by_month_after_restore.status_code == 200
        assert by_month_after_restore.json()["items"][0]["expense_total_cents"] == 7000

        by_category_after_restore = client.get("/api/analytics/by-category?from=2026-11-01&to=2026-11-30", headers=auth_headers)
        assert by_category_after_restore.status_code == 200
        assert by_category_after_restore.json()["items"][0]["expense_total_cents"] == 7000


def test_persistence_survives_app_restart_for_user_data():
    user_payload: dict[str, str] = {}
    account_id: str | None = None

    with TestClient(app) as first_client:
        user = _register_user(first_client)
        user_payload = user
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(first_client, auth_headers, "restart-persistence-account")
        assert account_id

    with TestClient(app) as second_client:
        login = second_client.post(
            "/api/auth/login",
            json={"username": user_payload["username"], "password": user_payload["password"]},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert login.status_code == 200
        access = login.json()["access_token"]

        listed = second_client.get(
            "/api/accounts",
            headers={"accept": VENDOR, "authorization": f"Bearer {access}"},
        )
        assert listed.status_code == 200
        assert listed.headers["content-type"].startswith(VENDOR)
        ids = [item["id"] for item in listed.json()["items"]]
        assert account_id in ids


def test_create_transaction_fails_when_account_is_archived():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = {
            "accept": VENDOR,
            "content-type": VENDOR,
            "authorization": f"Bearer {user['access']}",
        }

        account = client.post(
            "/api/accounts",
            json={"name": "to-archive", "type": "cash", "initial_balance_cents": 1000, "note": "old"},
            headers=auth_headers,
        )
        assert account.status_code == 201
        account_id = account.json()["id"]

        category = client.post(
            "/api/categories",
            json={"name": "bonus", "type": "income", "note": "income"},
            headers=auth_headers,
        )
        assert category.status_code == 201
        category_id = category.json()["id"]

        archive = client.delete(
            f"/api/accounts/{account_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        create_tx = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_id,
                "category_id": category_id,
                "amount_cents": 120000,
                "date": "2026-01-20",
                "merchant": "Acme",
                "note": "should fail",
            },
            headers=auth_headers,
        )
        assert create_tx.status_code == 409
        assert create_tx.headers["content-type"].startswith(PROBLEM)
        body = create_tx.json()
        assert body["type"] == "https://api.budgetbuddy.dev/problems/account-archived"
        assert body["title"] == "Account is archived"
        assert body["status"] == 409


def test_create_transaction_fails_when_category_is_archived():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "acct-category-archived")
        category_id = _create_category(client, auth_headers, "archived-income-create", "income")

        archive = client.delete(
            f"/api/categories/{category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        response = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_id,
                "category_id": category_id,
                "amount_cents": 10000,
                "date": "2026-02-10",
                "merchant": "Acme",
                "note": "archived-category-create",
            },
            headers=auth_headers,
        )
        assert response.status_code == 409
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == CATEGORY_ARCHIVED_TYPE
        assert body["title"] == CATEGORY_ARCHIVED_TITLE
        assert body["status"] == 409


def test_create_transaction_fails_when_category_type_mismatch():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "for-mismatch")
        income_category_id = _create_category(client, auth_headers, "income-mismatch-dir", "income")
        expense_category_id = _create_category(client, auth_headers, "expense-mismatch-dir", "expense")

        for tx_type, category_id in [
            ("income", expense_category_id),  # income->expense mismatch
            ("expense", income_category_id),  # expense->income mismatch
        ]:
            response = client.post(
                "/api/transactions",
                json={
                    "type": tx_type,
                    "account_id": account_id,
                    "category_id": category_id,
                    "amount_cents": 7000,
                    "date": "2026-02-01",
                    "merchant": "Acme",
                    "note": f"mismatch-{tx_type}",
                },
                headers=auth_headers,
            )
            _assert_category_mismatch_problem(response)


def test_patch_transaction_fails_when_category_type_mismatch():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "for-patch-mismatch")
        income_category_id = _create_category(client, auth_headers, "income-patch-mismatch", "income")
        expense_category_id = _create_category(client, auth_headers, "expense-patch-mismatch", "expense")

        for initial_type, initial_category, mismatch_category in [
            ("income", income_category_id, expense_category_id),  # income->expense mismatch
            ("expense", expense_category_id, income_category_id),  # expense->income mismatch
        ]:
            status, created_body = _create_transaction(
                client,
                auth_headers,
                type_=initial_type,
                account_id=account_id,
                category_id=initial_category,
                note=f"valid-{initial_type}",
                date="2026-02-02",
            )
            assert status == 201
            transaction_id = created_body["id"]

            # Non-mismatch patch remains valid.
            valid_patch = client.patch(
                f"/api/transactions/{transaction_id}",
                json={"note": "still-valid"},
                headers=auth_headers,
            )
            assert valid_patch.status_code == 200
            assert valid_patch.headers["content-type"].startswith(VENDOR)

            # Mismatch patch by changing category_id must fail.
            mismatch_patch = client.patch(
                f"/api/transactions/{transaction_id}",
                json={"category_id": mismatch_category},
                headers=auth_headers,
            )
            _assert_category_mismatch_problem(mismatch_patch)


def test_patch_transaction_fails_when_category_is_archived():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "acct-category-archived-patch")

        active_category_id = _create_category(client, auth_headers, "active-income", "income")
        archived_category_id = _create_category(client, auth_headers, "archived-income-patch", "income")
        tx_id = _create_income_tx_and_assert(
            client,
            auth_headers,
            account_id=account_id,
            category_id=active_category_id,
            note="seed-tx",
            date="2026-02-11",
        )
        _archive_category_and_assert(client, user["access"], archived_category_id)

        change_to_archived = client.patch(
            f"/api/transactions/{tx_id}",
            json={"category_id": archived_category_id},
            headers=auth_headers,
        )
        _assert_category_archived_problem(change_to_archived)

        tx_id_2 = _create_income_tx_and_assert(
            client,
            auth_headers,
            account_id=account_id,
            category_id=active_category_id,
            note="seed-tx-2",
            date="2026-02-12",
        )
        _archive_category_and_assert(client, user["access"], active_category_id)

        keep_archived = client.patch(
            f"/api/transactions/{tx_id_2}",
            json={"note": "should-fail"},
            headers=auth_headers,
        )
        _assert_category_archived_problem(keep_archived)


def test_transaction_validation_error_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = {
            "accept": VENDOR,
            "content-type": VENDOR,
            "authorization": f"Bearer {user['access']}",
        }

        invalid_payload = {
            "account_id": str(uuid.uuid4()),
            "category_id": str(uuid.uuid4()),
            "amount_cents": 1200,
            "date": "2026-01-20",
        }
        response = client.post("/api/transactions", json=invalid_payload, headers=auth_headers)
        assert response.status_code == 400
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["status"] == 400
        assert "title" in body
        assert "type" in body


def test_create_transaction_invalid_amount_values_return_canonical_money_problems():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])

        account_id = _create_account(client, auth_headers, "money-create-account")
        income_category_id = _create_category(client, auth_headers, "money-create-income", "income")

        invalid_payloads = [
            (
                {"amount_cents": "100"},
                MONEY_AMOUNT_NOT_INTEGER_TYPE,
                MONEY_AMOUNT_NOT_INTEGER_TITLE,
            ),
            (
                {"amount_cents": 0},
                MONEY_AMOUNT_SIGN_INVALID_TYPE,
                MONEY_AMOUNT_SIGN_INVALID_TITLE,
            ),
            (
                {"amount_cents": -10},
                MONEY_AMOUNT_SIGN_INVALID_TYPE,
                MONEY_AMOUNT_SIGN_INVALID_TITLE,
            ),
            (
                {"amount_cents": 1_000_000_000_000},
                MONEY_AMOUNT_OUT_OF_RANGE_TYPE,
                MONEY_AMOUNT_OUT_OF_RANGE_TITLE,
            ),
        ]

        for partial_payload, expected_type, expected_title in invalid_payloads:
            payload = {
                "type": "income",
                "account_id": account_id,
                "category_id": income_category_id,
                "amount_cents": 100,
                "date": "2026-03-01",
                "merchant": "Acme",
                "note": "invalid-create",
            }
            payload.update(partial_payload)
            response = client.post("/api/transactions", json=payload, headers=auth_headers)
            _assert_money_problem(response, expected_type, expected_title)


def test_patch_transaction_invalid_amount_values_return_canonical_money_problems():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])

        account_id = _create_account(client, auth_headers, "money-patch-account")
        income_category_id = _create_category(client, auth_headers, "money-patch-income", "income")
        status, created = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=income_category_id,
            note="money-patch-seed",
            date="2026-03-02",
        )
        assert status == 201
        tx_id = created["id"]

        invalid_patches = [
            ({"amount_cents": "100"}, MONEY_AMOUNT_NOT_INTEGER_TYPE, MONEY_AMOUNT_NOT_INTEGER_TITLE),
            ({"amount_cents": 0}, MONEY_AMOUNT_SIGN_INVALID_TYPE, MONEY_AMOUNT_SIGN_INVALID_TITLE),
            ({"amount_cents": -1}, MONEY_AMOUNT_SIGN_INVALID_TYPE, MONEY_AMOUNT_SIGN_INVALID_TITLE),
            ({"amount_cents": 1_000_000_000_000}, MONEY_AMOUNT_OUT_OF_RANGE_TYPE, MONEY_AMOUNT_OUT_OF_RANGE_TITLE),
        ]

        for patch_body, expected_type, expected_title in invalid_patches:
            response = client.patch(f"/api/transactions/{tx_id}", json=patch_body, headers=auth_headers)
            _assert_money_problem(response, expected_type, expected_title)


def test_transaction_money_currency_mismatch_returns_canonical_problem():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "money-currency-account")
        income_category_id = _create_category(client, auth_headers, "money-currency-income", "income")

        db = SessionLocal()
        try:
            user_row = db.query(User).filter(User.username == user["username"]).one()
            user_row.currency_code = "JPY"
            db.commit()
        finally:
            db.close()

        response = client.post(
            "/api/transactions",
            json={
                "type": "income",
                "account_id": account_id,
                "category_id": income_category_id,
                "amount_cents": 5000,
                "date": "2026-03-03",
            },
            headers=auth_headers,
        )
        _assert_money_problem(response, MONEY_CURRENCY_MISMATCH_TYPE, MONEY_CURRENCY_MISMATCH_TITLE)


def test_analytics_totals_are_integer_cents_and_enforce_currency_context():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "money-analytics-account")
        income_category_id = _create_category(client, auth_headers, "money-analytics-income", "income")
        expense_category_id = _create_category(client, auth_headers, "money-analytics-expense", "expense")

        status, _ = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=income_category_id,
            note="income-analytics",
            date="2026-03-04",
        )
        assert status == 201
        status, _ = _create_transaction(
            client,
            auth_headers,
            type_="expense",
            account_id=account_id,
            category_id=expense_category_id,
            note="expense-analytics",
            date="2026-03-05",
        )
        assert status == 201

        by_month = client.get("/api/analytics/by-month?from=2026-03-01&to=2026-03-31", headers=auth_headers)
        assert by_month.status_code == 200
        for item in by_month.json()["items"]:
            assert isinstance(item["income_total_cents"], int)
            assert isinstance(item["expense_total_cents"], int)

        by_category = client.get("/api/analytics/by-category?from=2026-03-01&to=2026-03-31", headers=auth_headers)
        assert by_category.status_code == 200
        for item in by_category.json()["items"]:
            assert isinstance(item["income_total_cents"], int)
            assert isinstance(item["expense_total_cents"], int)

        db = SessionLocal()
        try:
            user_row = db.query(User).filter(User.username == user["username"]).one()
            user_row.currency_code = "JPY"
            db.commit()
        finally:
            db.close()

        bad_currency = client.get("/api/analytics/by-month?from=2026-03-01&to=2026-03-31", headers=auth_headers)
        _assert_money_problem(bad_currency, MONEY_CURRENCY_MISMATCH_TYPE, MONEY_CURRENCY_MISMATCH_TITLE)

        bad_currency_by_category = client.get(
            "/api/analytics/by-category?from=2026-03-01&to=2026-03-31",
            headers=auth_headers,
        )
        _assert_money_problem(
            bad_currency_by_category,
            MONEY_CURRENCY_MISMATCH_TYPE,
            MONEY_CURRENCY_MISMATCH_TITLE,
        )


def _seed_filter_domain_data(client: TestClient, auth_headers: dict[str, str]) -> tuple[str, str, str, str]:
    account_1_id = _create_account(client, auth_headers, "wallet-main")
    account_2_id = _create_account(client, auth_headers, "wallet-secondary")
    income_category_id = _create_category(client, auth_headers, "salary-filter", "income")
    expense_category_id = _create_category(client, auth_headers, "food-filter", "expense")
    return account_1_id, account_2_id, income_category_id, expense_category_id


def _seed_filter_transactions(
    client: TestClient,
    auth_headers: dict[str, str],
    *,
    account_1_id: str,
    account_2_id: str,
    income_category_id: str,
    expense_category_id: str,
) -> tuple[str, str]:
    tx_1_id = _create_income_tx_and_assert(
        client,
        auth_headers,
        account_id=account_1_id,
        category_id=income_category_id,
        note="tx1",
        date="2026-01-10",
    )
    tx_2_id = _create_income_tx_and_assert(
        client,
        auth_headers,
        account_id=account_1_id,
        category_id=income_category_id,
        note="tx2",
        date="2026-01-12",
    )

    status_3, _ = _create_transaction(
        client,
        auth_headers,
        type_="expense",
        account_id=account_1_id,
        category_id=expense_category_id,
        note="tx3",
        date="2026-01-11",
    )
    assert status_3 == 201

    status_4, _ = _create_transaction(
        client,
        auth_headers,
        type_="income",
        account_id=account_2_id,
        category_id=income_category_id,
        note="tx4",
        date="2026-01-13",
    )
    assert status_4 == 201
    return tx_1_id, tx_2_id


def test_list_transactions_filters_and_ordering():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_1_id, account_2_id, income_category_id, expense_category_id = _seed_filter_domain_data(client, auth_headers)
        tx_1_id, tx_2_id = _seed_filter_transactions(
            client,
            auth_headers,
            account_1_id=account_1_id,
            account_2_id=account_2_id,
            income_category_id=income_category_id,
            expense_category_id=expense_category_id,
        )

        filtered = client.get(
            "/api/transactions?type=income&account_id="
            f"{account_1_id}&category_id={income_category_id}&from=2026-01-09&to=2026-01-12",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert filtered.status_code == 200
        assert filtered.headers["content-type"].startswith(VENDOR)
        body = filtered.json()
        assert body["next_cursor"] is None
        assert len(body["items"]) == 2
        assert [item["id"] for item in body["items"]] == [tx_2_id, tx_1_id]


def test_list_accounts_invalid_cursor_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/accounts?cursor=not-base64!!",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_cursor_problem(response)


def test_list_categories_invalid_cursor_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/categories?cursor=not-base64!!",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_cursor_problem(response)


def test_list_transactions_invalid_cursor_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/transactions?cursor=not-base64!!",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_cursor_problem(response)


def test_list_categories_invalid_type_returns_invalid_request():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/categories?type=invalid",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_request_problem(response)


def test_list_transactions_invalid_type_returns_invalid_request():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/transactions?type=invalid",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_request_problem(response)


def test_resource_routes_reject_invalid_uuid_path_params():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = {"accept": VENDOR, "authorization": f"Bearer {user['access']}"}
        _assert_invalid_request_problem(client.get("/api/accounts/not-a-uuid", headers=headers))
        _assert_invalid_request_problem(client.get("/api/categories/not-a-uuid", headers=headers))
        _assert_invalid_request_problem(client.get("/api/transactions/not-a-uuid", headers=headers))


def test_list_accounts_pagination_is_deterministic_without_duplicates_or_skips():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])

        created_ids: list[str] = []
        for idx in range(25):
            created_ids.append(_create_account(client, auth_headers, f"acc-page-{idx:02d}"))

        listed_ids, page_sizes = _collect_paginated_ids(client, "/api/accounts", user["access"], limit=10)

        assert page_sizes == [10, 10, 5]
        assert len(listed_ids) == 25
        assert len(listed_ids) == len(set(listed_ids))
        assert set(listed_ids) == set(created_ids)
        assert listed_ids == list(reversed(created_ids))


def test_list_categories_pagination_is_deterministic_without_duplicates_or_skips():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])

        created_ids: list[str] = []
        for idx in range(25):
            created_ids.append(_create_category(client, auth_headers, f"cat-page-{idx:02d}", "expense"))

        listed_ids, page_sizes = _collect_paginated_ids(client, "/api/categories?type=expense", user["access"], limit=10)

        assert page_sizes == [10, 10, 5]
        assert len(listed_ids) == 25
        assert len(listed_ids) == len(set(listed_ids))
        assert set(listed_ids) == set(created_ids)
        assert listed_ids == list(reversed(created_ids))


def test_list_transactions_pagination_is_deterministic_without_duplicates_or_skips():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "tx-page-account")
        category_id = _create_category(client, auth_headers, "tx-page-category", "income")

        created_ids: list[str] = []
        for day in range(1, 26):
            status, body = _create_transaction(
                client,
                auth_headers,
                type_="income",
                account_id=account_id,
                category_id=category_id,
                note=f"tx-page-{day:02d}",
                date=f"2026-03-{day:02d}",
            )
            assert status == 201
            created_ids.append(body["id"])

        listed_ids, page_sizes = _collect_paginated_ids(
            client,
            f"/api/transactions?type=income&account_id={account_id}&category_id={category_id}",
            user["access"],
            limit=10,
        )

        assert page_sizes == [10, 10, 5]
        assert len(listed_ids) == 25
        assert len(listed_ids) == len(set(listed_ids))
        assert set(listed_ids) == set(created_ids)


def test_restore_category_happy_path_and_idempotent():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        category_id = _create_category(client, auth_headers, "restore-me", "expense")

        archive = client.delete(
            f"/api/categories/{category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        restore = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore.status_code == 200
        assert restore.headers["content-type"].startswith(VENDOR)
        assert restore.json()["archived_at"] is None

        # Idempotent restore for already-active category.
        restore_again = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore_again.status_code == 200
        assert restore_again.headers["content-type"].startswith(VENDOR)
        assert restore_again.json()["archived_at"] is None


def test_restore_category_requires_auth():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        category_id = _create_category(client, auth_headers, "restore-auth", "income")

        response = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        assert response.status_code == 401
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == UNAUTHORIZED_TYPE
        assert body["title"] == UNAUTHORIZED_TITLE
        assert body["status"] == 401


def test_restore_category_forbidden_for_non_owner():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        category_id = _create_category(client, owner_headers, "restore-foreign", "expense")

        response = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers=other_headers,
        )
        _assert_forbidden_problem(response)


def test_accounts_non_owner_matrix_is_forbidden():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        account_id = _create_account(client, owner_headers, "owner-account-only")

        get_resp = client.get(
            f"/api/accounts/{account_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(get_resp)

        patch_resp = client.patch(
            f"/api/accounts/{account_id}",
            json={"note": "forbidden"},
            headers=other_headers,
        )
        _assert_forbidden_problem(patch_resp)

        delete_resp = client.delete(
            f"/api/accounts/{account_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(delete_resp)


def test_categories_non_owner_matrix_is_forbidden():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        category_id = _create_category(client, owner_headers, "owner-category-only", "expense")

        get_resp = client.get(
            f"/api/categories/{category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(get_resp)

        patch_resp = client.patch(
            f"/api/categories/{category_id}",
            json={"note": "forbidden"},
            headers=other_headers,
        )
        _assert_forbidden_problem(patch_resp)

        delete_resp = client.delete(
            f"/api/categories/{category_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(delete_resp)


def test_transactions_non_owner_matrix_is_forbidden():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        owner_account_id = _create_account(client, owner_headers, "owner-tx-account")
        owner_category_id = _create_category(client, owner_headers, "owner-tx-category", "income")
        status, created = _create_transaction(
            client,
            owner_headers,
            type_="income",
            account_id=owner_account_id,
            category_id=owner_category_id,
            note="owner-only-tx",
            date="2026-02-15",
        )
        assert status == 201
        tx_id = created["id"]

        get_resp = client.get(
            f"/api/transactions/{tx_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(get_resp)

        patch_resp = client.patch(
            f"/api/transactions/{tx_id}",
            json={"note": "forbidden"},
            headers=other_headers,
        )
        _assert_forbidden_problem(patch_resp)

        delete_resp = client.delete(
            f"/api/transactions/{tx_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(delete_resp)


def test_restore_transaction_happy_path_and_idempotent():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "restore-tx-account")
        category_id = _create_category(client, auth_headers, "restore-tx-category", "income")
        status, created = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=category_id,
            note="restore-tx-seed",
            date="2026-02-16",
        )
        assert status == 201
        tx_id = created["id"]

        archive = client.delete(
            f"/api/transactions/{tx_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archive.status_code == 204

        restore = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore.status_code == 200
        assert restore.headers["content-type"].startswith(VENDOR)
        assert restore.json()["archived_at"] is None

        restore_again = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers=auth_headers,
        )
        assert restore_again.status_code == 200
        assert restore_again.headers["content-type"].startswith(VENDOR)
        assert restore_again.json()["archived_at"] is None


def test_restore_transaction_forbidden_for_non_owner():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])

        account_id = _create_account(client, owner_headers, "restore-tx-foreign-account")
        category_id = _create_category(client, owner_headers, "restore-tx-foreign-category", "income")
        status, created = _create_transaction(
            client,
            owner_headers,
            type_="income",
            account_id=account_id,
            category_id=category_id,
            note="restore-tx-foreign-seed",
            date="2026-02-17",
        )
        assert status == 201
        tx_id = created["id"]

        response = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers=other_headers,
        )
        _assert_forbidden_problem(response)


def test_restore_transaction_rejects_unsupported_accept():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        account_id = _create_account(client, auth_headers, "restore-tx-accept-account")
        category_id = _create_category(client, auth_headers, "restore-tx-accept-category", "income")
        status, created = _create_transaction(
            client,
            auth_headers,
            type_="income",
            account_id=account_id,
            category_id=category_id,
            note="restore-tx-accept-seed",
            date="2026-02-18",
        )
        assert status == 201
        tx_id = created["id"]

        response = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers={
                "accept": "application/xml",
                "content-type": VENDOR,
                "authorization": f"Bearer {user['access']}",
            },
        )
        assert response.status_code == 406
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406


def test_restore_category_rejects_unsupported_accept():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])
        category_id = _create_category(client, auth_headers, "restore-accept", "income")

        response = client.patch(
            f"/api/categories/{category_id}",
            json={"archived_at": None},
            headers={
                "accept": "application/xml",
                "content-type": VENDOR,
                "authorization": f"Bearer {user['access']}",
            },
        )
        assert response.status_code == 406
        assert response.headers["content-type"].startswith(PROBLEM)
        body = response.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406


def test_list_transactions_same_date_is_stably_sorted_by_created_at():
    with TestClient(app) as client:
        user = _register_user(client)
        auth_headers = _auth_headers(user["access"])

        account_id = _create_account(client, auth_headers, "sort-account")
        category_id = _create_category(client, auth_headers, "sort-income", "income")

        created_ids: list[str] = []
        for note in ["first", "second", "third"]:
            status, body = _create_transaction(
                client,
                auth_headers,
                type_="income",
                account_id=account_id,
                category_id=category_id,
                note=note,
                date="2026-02-21",
            )
            assert status == 201
            created_ids.append(body["id"])

        listed = client.get(
            "/api/transactions?type=income&account_id="
            f"{account_id}&category_id={category_id}&from=2026-02-21&to=2026-02-21",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert listed.status_code == 200
        assert listed.headers["content-type"].startswith(VENDOR)

        listed_ids = [item["id"] for item in listed.json()["items"]]
        assert listed_ids[:3] == list(reversed(created_ids))


def test_list_transactions_invalid_date_range_returns_problem_details():
    with TestClient(app) as client:
        user = _register_user(client)
        response = client.get(
            "/api/transactions?from=2026-02-10&to=2026-02-01",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_date_range_problem(response)


def test_budgets_happy_path_create_list_get_patch_archive():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        category_id = _create_category(client, headers, "budget-expense", "expense")

        create = client.post(
            "/api/budgets",
            json={"month": "2026-02", "category_id": category_id, "limit_cents": 250000},
            headers=headers,
        )
        assert create.status_code == 201
        assert create.headers["content-type"].startswith(VENDOR)
        budget_id = create.json()["id"]

        listed = client.get(
            "/api/budgets?from=2026-01&to=2026-12",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert listed.status_code == 200
        assert listed.headers["content-type"].startswith(VENDOR)
        assert len(listed.json()["items"]) == 1
        assert listed.json()["items"][0]["id"] == budget_id

        fetched = client.get(
            f"/api/budgets/{budget_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert fetched.status_code == 200
        assert fetched.headers["content-type"].startswith(VENDOR)
        assert fetched.json()["limit_cents"] == 250000

        patched = client.patch(
            f"/api/budgets/{budget_id}",
            json={"limit_cents": 275000},
            headers=headers,
        )
        assert patched.status_code == 200
        assert patched.headers["content-type"].startswith(VENDOR)
        assert patched.json()["limit_cents"] == 275000

        archived = client.delete(
            f"/api/budgets/{budget_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archived.status_code == 204
        assert archived.text == ""


def test_budgets_recreate_after_archive_allows_same_month_category():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        category_id = _create_category(client, headers, "budget-recreate", "expense")

        first = client.post(
            "/api/budgets",
            json={"month": "2026-02", "category_id": category_id, "limit_cents": 150000},
            headers=headers,
        )
        assert first.status_code == 201
        first_id = first.json()["id"]

        archived = client.delete(
            f"/api/budgets/{first_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert archived.status_code == 204

        second = client.post(
            "/api/budgets",
            json={"month": "2026-02", "category_id": category_id, "limit_cents": 175000},
            headers=headers,
        )
        assert second.status_code == 201
        assert second.json()["id"] != first_id


def test_budgets_auth_ownership_and_accept_matrix():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])
        category_id = _create_category(client, owner_headers, "budget-owner", "expense")

        created = client.post(
            "/api/budgets",
            json={"month": "2026-03", "category_id": category_id, "limit_cents": 100000},
            headers=owner_headers,
        )
        assert created.status_code == 201
        budget_id = created.json()["id"]

        unauthorized_get = client.get(f"/api/budgets/{budget_id}", headers={"accept": VENDOR})
        _assert_unauthorized_problem(unauthorized_get)

        forbidden_get = client.get(
            f"/api/budgets/{budget_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(forbidden_get)

        forbidden_patch = client.patch(
            f"/api/budgets/{budget_id}",
            json={"limit_cents": 111111},
            headers=other_headers,
        )
        _assert_forbidden_problem(forbidden_patch)

        forbidden_delete = client.delete(
            f"/api/budgets/{budget_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        _assert_forbidden_problem(forbidden_delete)

        not_acceptable = client.get(
            "/api/budgets?from=2026-01&to=2026-12",
            headers={"accept": "application/xml", "authorization": f"Bearer {owner['access']}"},
        )
        assert not_acceptable.status_code == 406
        assert not_acceptable.headers["content-type"].startswith(PROBLEM)
        body = not_acceptable.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406


def test_budgets_conflict_matrix_is_canonical():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])

        owner_category = _create_category(client, owner_headers, "budget-dup", "expense")
        other_category = _create_category(client, other_headers, "budget-other", "expense")

        first = client.post(
            "/api/budgets",
            json={"month": "2026-04", "category_id": owner_category, "limit_cents": 50000},
            headers=owner_headers,
        )
        assert first.status_code == 201

        duplicate = client.post(
            "/api/budgets",
            json={"month": "2026-04", "category_id": owner_category, "limit_cents": 70000},
            headers=owner_headers,
        )
        _assert_budget_conflict_problem(duplicate, BUDGET_DUPLICATE_TYPE, BUDGET_DUPLICATE_TITLE)

        not_owned = client.post(
            "/api/budgets",
            json={"month": "2026-04", "category_id": other_category, "limit_cents": 70000},
            headers=owner_headers,
        )
        _assert_budget_conflict_problem(not_owned, CATEGORY_NOT_OWNED_TYPE, CATEGORY_NOT_OWNED_TITLE)

        archived_category = _create_category(client, owner_headers, "budget-archived", "expense")
        _archive_category_and_assert(client, owner["access"], archived_category)
        archived_conflict = client.post(
            "/api/budgets",
            json={"month": "2026-04", "category_id": archived_category, "limit_cents": 70000},
            headers=owner_headers,
        )
        _assert_budget_conflict_problem(archived_conflict, CATEGORY_ARCHIVED_TYPE, CATEGORY_ARCHIVED_TITLE)


def test_budget_validation_failures_return_canonical_400():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        category_id = _create_category(client, headers, "budget-validation", "expense")

        invalid_month = client.get(
            "/api/budgets?from=2026-13&to=2026-12",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert invalid_month.status_code == 400
        assert invalid_month.headers["content-type"].startswith(PROBLEM)
        body = invalid_month.json()
        assert body["type"] == BUDGET_MONTH_INVALID_TYPE
        assert body["title"] == BUDGET_MONTH_INVALID_TITLE
        assert body["status"] == 400

        zero_limit = client.post(
            "/api/budgets",
            json={"month": "2026-05", "category_id": category_id, "limit_cents": 0},
            headers=headers,
        )
        _assert_money_problem(zero_limit, MONEY_AMOUNT_SIGN_INVALID_TYPE, MONEY_AMOUNT_SIGN_INVALID_TITLE)

        negative_limit = client.post(
            "/api/budgets",
            json={"month": "2026-05", "category_id": category_id, "limit_cents": -1},
            headers=headers,
        )
        _assert_money_problem(negative_limit, MONEY_AMOUNT_SIGN_INVALID_TYPE, MONEY_AMOUNT_SIGN_INVALID_TITLE)

        too_large_limit = client.post(
            "/api/budgets",
            json={"month": "2026-05", "category_id": category_id, "limit_cents": 10_000_000_000_000},
            headers=headers,
        )
        _assert_money_problem(too_large_limit, MONEY_AMOUNT_OUT_OF_RANGE_TYPE, MONEY_AMOUNT_OUT_OF_RANGE_TITLE)


def test_analytics_include_budget_spent_vs_limit_integer_fields():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        account_id = _create_account(client, headers, "budget-analytics-account")
        category_id = _create_category(client, headers, "budget-analytics-category", "expense")

        create_budget = client.post(
            "/api/budgets",
            json={"month": "2026-06", "category_id": category_id, "limit_cents": 10000},
            headers=headers,
        )
        assert create_budget.status_code == 201

        tx = client.post(
            "/api/transactions",
            json={
                "type": "expense",
                "account_id": account_id,
                "category_id": category_id,
                "amount_cents": 3000,
                "date": "2026-06-15",
                "merchant": "Store",
                "note": "groceries",
            },
            headers=headers,
        )
        assert tx.status_code == 201

        by_month = client.get(
            "/api/analytics/by-month?from=2026-06-01&to=2026-06-30",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert by_month.status_code == 200
        assert by_month.headers["content-type"].startswith(VENDOR)
        month_item = by_month.json()["items"][0]
        assert month_item["budget_spent_cents"] == 3000
        assert month_item["budget_limit_cents"] == 10000
        assert isinstance(month_item["budget_spent_cents"], int)
        assert isinstance(month_item["budget_limit_cents"], int)

        by_category = client.get(
            "/api/analytics/by-category?from=2026-06-01&to=2026-06-30",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert by_category.status_code == 200
        assert by_category.headers["content-type"].startswith(VENDOR)
        category_item = by_category.json()["items"][0]
        assert category_item["budget_spent_cents"] == 3000
        assert category_item["budget_limit_cents"] == 10000
        assert isinstance(category_item["budget_spent_cents"], int)
        assert isinstance(category_item["budget_limit_cents"], int)


def test_transactions_import_partial_mixed_rows_reports_deterministic_failures():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        account_id = _create_account(client, headers, "import-partial-account")
        income_category_id = _create_category(client, headers, "import-partial-income", "income")
        expense_category_id = _create_category(client, headers, "import-partial-expense", "expense")

        response = client.post(
            "/api/transactions/import",
            json={
                "mode": "partial",
                "items": [
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": income_category_id,
                        "amount_cents": 5000,
                        "date": "2026-07-01",
                        "merchant": "Acme",
                        "note": "ok-row",
                    },
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": expense_category_id,
                        "amount_cents": 6000,
                        "date": "2026-07-02",
                        "merchant": "Acme",
                        "note": "mismatch-row",
                    },
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": income_category_id,
                        "amount_cents": 0,
                        "date": "2026-07-03",
                        "merchant": "Acme",
                        "note": "invalid-money-row",
                    },
                ],
            },
            headers=headers,
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith(VENDOR)
        body = response.json()
        assert body["created_count"] == 1
        assert body["failed_count"] == 2
        assert [failure["index"] for failure in body["failures"]] == [1, 2]
        assert body["failures"][0]["problem"]["type"] == MISMATCH_TYPE
        assert body["failures"][0]["problem"]["title"] == MISMATCH_TITLE
        assert body["failures"][1]["problem"]["type"] == MONEY_AMOUNT_SIGN_INVALID_TYPE
        assert body["failures"][1]["problem"]["title"] == MONEY_AMOUNT_SIGN_INVALID_TITLE
        assert "Traceback" not in body["failures"][0]["message"]
        assert "sqlalchemy" not in body["failures"][0]["message"].lower()

        listed = client.get(
            "/api/transactions?from=2026-07-01&to=2026-07-03",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert listed.status_code == 200
        assert listed.headers["content-type"].startswith(VENDOR)
        assert len(listed.json()["items"]) == 1


def test_transactions_import_all_or_nothing_rolls_back_batch():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        account_id = _create_account(client, headers, "import-aon-account")
        income_category_id = _create_category(client, headers, "import-aon-income", "income")
        expense_category_id = _create_category(client, headers, "import-aon-expense", "expense")

        response = client.post(
            "/api/transactions/import",
            json={
                "mode": "all_or_nothing",
                "items": [
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": income_category_id,
                        "amount_cents": 5000,
                        "date": "2026-08-01",
                        "merchant": "Acme",
                        "note": "ok-row",
                    },
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": expense_category_id,
                        "amount_cents": 5000,
                        "date": "2026-08-02",
                        "merchant": "Acme",
                        "note": "invalid-row",
                    },
                ],
            },
            headers=headers,
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith(VENDOR)
        body = response.json()
        assert body["created_count"] == 0
        assert body["failed_count"] == 1
        assert body["failures"][0]["index"] == 1

        listed = client.get(
            "/api/transactions?from=2026-08-01&to=2026-08-02",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert listed.status_code == 200
        assert listed.headers["content-type"].startswith(VENDOR)
        assert listed.json()["items"] == []


def test_transactions_import_batch_limit_returns_canonical_400(monkeypatch):
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        account_id = _create_account(client, headers, "import-limit-account")
        income_category_id = _create_category(client, headers, "import-limit-income", "income")

        monkeypatch.setattr("app.routers.transactions.settings.transaction_import_max_items", 1)

        response = client.post(
            "/api/transactions/import",
            json={
                "mode": "partial",
                "items": [
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": income_category_id,
                        "amount_cents": 1000,
                        "date": "2026-09-01",
                    },
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": income_category_id,
                        "amount_cents": 2000,
                        "date": "2026-09-02",
                    },
                ],
            },
            headers=headers,
        )
        _assert_money_problem(response, IMPORT_BATCH_LIMIT_EXCEEDED_TYPE, IMPORT_BATCH_LIMIT_EXCEEDED_TITLE)


def test_transactions_export_returns_csv_headers_and_row_count():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        account_id = _create_account(client, headers, "export-account")
        category_id = _create_category(client, headers, "export-income", "income")

        for day, note in [("2026-10-01", "row-1"), ("2026-10-02", "row-2")]:
            status, _ = _create_transaction(
                client,
                headers,
                type_="income",
                account_id=account_id,
                category_id=category_id,
                note=note,
                date=day,
            )
            assert status == 201

        response = client.get(
            "/api/transactions/export?from=2026-10-01&to=2026-10-31&type=income",
            headers={"accept": "text/csv", "authorization": f"Bearer {user['access']}"},
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        lines = [line for line in response.text.strip().splitlines() if line]
        assert lines[0] == "id,type,account_id,category_id,amount_cents,date,merchant,note,archived_at,created_at,updated_at"
        assert len(lines) == 3


def test_transactions_import_export_auth_and_negotiation_matrix():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])
        account_id = _create_account(client, headers, "matrix-account")
        category_id = _create_category(client, headers, "matrix-income", "income")

        unauthorized_import = client.post(
            "/api/transactions/import",
            json={
                "mode": "partial",
                "items": [
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": category_id,
                        "amount_cents": 1000,
                        "date": "2026-10-03",
                    }
                ],
            },
            headers={"accept": VENDOR, "content-type": VENDOR},
        )
        _assert_unauthorized_problem(unauthorized_import)

        unauthorized_export = client.get("/api/transactions/export", headers={"accept": "text/csv"})
        _assert_unauthorized_problem(unauthorized_export)

        unsupported_import_accept = client.post(
            "/api/transactions/import",
            json={
                "mode": "partial",
                "items": [
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": category_id,
                        "amount_cents": 1000,
                        "date": "2026-10-03",
                    }
                ],
            },
            headers={"accept": "application/xml", "content-type": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert unsupported_import_accept.status_code == 406
        assert unsupported_import_accept.headers["content-type"].startswith(PROBLEM)

        unsupported_export_accept = client.get(
            "/api/transactions/export",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert unsupported_export_accept.status_code == 406
        assert unsupported_export_accept.headers["content-type"].startswith(PROBLEM)

        unsupported_import_content_type = client.post(
            "/api/transactions/import",
            json={
                "mode": "partial",
                "items": [
                    {
                        "type": "income",
                        "account_id": account_id,
                        "category_id": category_id,
                        "amount_cents": 1000,
                        "date": "2026-10-03",
                    }
                ],
            },
            headers={
                "accept": VENDOR,
                "content-type": "application/json",
                "authorization": f"Bearer {user['access']}",
            },
        )
        _assert_invalid_request_problem(unsupported_import_content_type)


def test_audit_events_created_for_key_actions():
    with TestClient(app) as client:
        user = _register_user(client)
        headers = _auth_headers(user["access"])

        account_id = _create_account(client, headers, "audit-account")
        category_id = _create_category(client, headers, "audit-category", "income")
        tx_status, tx_body = _create_transaction(
            client,
            headers,
            type_="income",
            account_id=account_id,
            category_id=category_id,
            note="audit-create",
            date="2026-11-01",
        )
        assert tx_status == 201
        tx_id = tx_body["id"]

        tx_patch = client.patch(
            f"/api/transactions/{tx_id}",
            json={"note": "audit-update"},
            headers=headers,
        )
        assert tx_patch.status_code == 200

        tx_archive = client.delete(
            f"/api/transactions/{tx_id}",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert tx_archive.status_code == 204

        tx_restore = client.patch(
            f"/api/transactions/{tx_id}",
            json={"archived_at": None},
            headers=headers,
        )
        assert tx_restore.status_code == 200

        first_refresh = client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))
        assert first_refresh.status_code == 200
        rotated_refresh = _refresh_cookie_from_response(first_refresh)

        reuse = client.post("/api/auth/refresh", headers=_refresh_headers(user["refresh"]))
        _assert_refresh_reuse_detected_problem(reuse)

        logout = client.post("/api/auth/logout", headers=_refresh_headers(rotated_refresh))
        assert logout.status_code == 204

        audit = client.get(
            "/api/audit?limit=100",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        assert audit.status_code == 200
        assert audit.headers["content-type"].startswith(VENDOR)
        actions = {item["action"] for item in audit.json()["items"]}
        assert "account.create" in actions
        assert "category.create" in actions
        assert "transaction.create" in actions
        assert "transaction.update" in actions
        assert "transaction.archive" in actions
        assert "transaction.restore" in actions
        assert "auth.refresh_token_reuse_detected" in actions
        assert "auth.logout" in actions


def test_audit_owner_only_pagination_and_sensitive_fields():
    with TestClient(app) as client:
        owner = _register_user(client)
        other = _register_user(client)
        owner_headers = _auth_headers(owner["access"])
        other_headers = _auth_headers(other["access"])

        _create_account(client, owner_headers, "audit-p1")
        _create_account(client, owner_headers, "audit-p2")
        _create_account(client, owner_headers, "audit-p3")
        _create_account(client, other_headers, "audit-other")

        page_1 = client.get(
            "/api/audit?limit=2",
            headers={"accept": VENDOR, "authorization": f"Bearer {owner['access']}"},
        )
        assert page_1.status_code == 200
        assert page_1.headers["content-type"].startswith(VENDOR)
        page_1_body = page_1.json()
        assert len(page_1_body["items"]) == 2
        assert page_1_body["next_cursor"] is not None

        page_2 = client.get(
            f"/api/audit?limit=2&cursor={page_1_body['next_cursor']}",
            headers={"accept": VENDOR, "authorization": f"Bearer {owner['access']}"},
        )
        assert page_2.status_code == 200
        page_2_body = page_2.json()

        owner_ids = {item["id"] for item in page_1_body["items"]} | {item["id"] for item in page_2_body["items"]}
        assert len(owner_ids) >= 3

        other_page = client.get(
            "/api/audit?limit=20",
            headers={"accept": VENDOR, "authorization": f"Bearer {other['access']}"},
        )
        assert other_page.status_code == 200
        assert len(other_page.json()["items"]) == 1
        assert all(item["resource_id"] != owner["refresh"] for item in other_page.json()["items"])

        serialized = json.dumps(page_1_body)
        assert "Bearer " not in serialized
        assert owner["refresh"] not in serialized


def test_audit_endpoint_error_matrix_is_canonical():
    with TestClient(app) as client:
        user = _register_user(client)

        unauthorized = client.get("/api/audit", headers={"accept": VENDOR})
        _assert_unauthorized_problem(unauthorized)

        not_acceptable = client.get(
            "/api/audit",
            headers={"accept": "application/xml", "authorization": f"Bearer {user['access']}"},
        )
        assert not_acceptable.status_code == 406
        assert not_acceptable.headers["content-type"].startswith(PROBLEM)
        body = not_acceptable.json()
        assert body["type"] == NOT_ACCEPTABLE_TYPE
        assert body["title"] == NOT_ACCEPTABLE_TITLE
        assert body["status"] == 406

        invalid_range = client.get(
            "/api/audit?from=2026-11-02T00:00:00&to=2026-11-01T00:00:00",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_date_range_problem(invalid_range)

        invalid_cursor = client.get(
            "/api/audit?cursor=not-base64",
            headers={"accept": VENDOR, "authorization": f"Bearer {user['access']}"},
        )
        _assert_invalid_cursor_problem(invalid_cursor)
