import base64
import json
import logging
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.core.errors import APIError, register_exception_handlers
from app.core.pagination import decode_cursor, encode_cursor, parse_datetime
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.dependencies import _accepts_vendor_or_problem, enforce_accept_header, enforce_content_type, get_current_user


def _request(path: str, method: str = "GET", headers: dict[str, str] | None = None) -> Request:
    raw_headers = []
    for key, value in (headers or {}).items():
        raw_headers.append((key.lower().encode("ascii"), value.encode("ascii")))
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": b"",
        "headers": raw_headers,
        "scheme": "http",
        "server": ("testserver", 80),
        "client": ("testclient", 50000),
    }
    return Request(scope)


class _DB:
    def __init__(self, user=None):
        self._user = user

    def scalar(self, _):
        return self._user


def test_cursor_helpers_roundtrip_and_errors():
    payload = {"created_at": "2026-01-01T00:00:00", "id": "abc"}
    encoded = encode_cursor(payload)
    assert decode_cursor(encoded) == payload

    with pytest.raises(APIError):
        decode_cursor("%%not-base64%%")

    # Decode to a non-object JSON value to exercise validation branch.
    bad = base64.urlsafe_b64encode(json.dumps([1, 2, 3]).encode("utf-8")).decode("ascii")
    with pytest.raises(APIError):
        decode_cursor(bad)

    assert parse_datetime("2026-01-01T12:30:00").year == 2026
    with pytest.raises(APIError):
        parse_datetime("not-a-datetime")


def test_password_and_token_security_paths(monkeypatch):
    hashed = hash_password("supersecurepwd123")
    assert verify_password("supersecurepwd123", hashed) is True
    assert verify_password("wrong", hashed) is False
    assert verify_password("wrong", "invalid-format") is False

    token = create_access_token("user-1")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-1"

    with pytest.raises(ValueError):
        decode_access_token("invalid-token-format")

    # Signature failure path: mutate the signature segment directly.
    payload_seg, signature = token.split(".", 1)
    mutated_signature = ("A" if signature[0] != "A" else "B") + signature[1:]
    mutated = f"{payload_seg}.{mutated_signature}"
    with pytest.raises(ValueError):
        decode_access_token(mutated)

    # Expiration failure path.
    from app.core import security

    monkeypatch.setattr(security.settings, "access_token_expires_in", -1)
    expired = create_access_token("user-2")
    with pytest.raises(ValueError):
        decode_access_token(expired)


def test_dependency_guards_and_current_user_paths(monkeypatch):
    assert _accepts_vendor_or_problem("*/*")
    assert _accepts_vendor_or_problem("application/vnd.budgetbuddy.v1+json")
    assert not _accepts_vendor_or_problem("application/xml")

    # Path ignored (outside API).
    enforce_accept_header(_request("/health", headers={"accept": "application/xml"}))
    # API docs/health bypass.
    enforce_accept_header(_request("/api/health", headers={"accept": "application/xml"}))
    enforce_content_type(_request("/api/openapi.json", method="POST", headers={"content-type": "text/plain"}))
    # Non-body methods bypass.
    enforce_content_type(_request("/api/accounts", method="GET", headers={"content-type": "text/plain"}))

    with pytest.raises(APIError):
        enforce_accept_header(_request("/api/accounts", headers={"accept": "application/xml"}))
    with pytest.raises(APIError):
        enforce_content_type(_request("/api/accounts", method="POST", headers={"content-type": "text/plain"}))

    with pytest.raises(APIError):
        get_current_user(authorization="", db=_DB())

    monkeypatch.setattr("app.dependencies.decode_access_token", lambda _: (_ for _ in ()).throw(ValueError("bad")))
    with pytest.raises(APIError):
        get_current_user(authorization="Bearer token", db=_DB())

    monkeypatch.setattr("app.dependencies.decode_access_token", lambda _: {})
    with pytest.raises(APIError):
        get_current_user(authorization="Bearer token", db=_DB())

    monkeypatch.setattr("app.dependencies.decode_access_token", lambda _: {"sub": "u1"})
    with pytest.raises(APIError):
        get_current_user(authorization="Bearer token", db=_DB(user=None))

    user = SimpleNamespace(id="u1")
    resolved = get_current_user(authorization="Bearer token", db=_DB(user=user))
    assert resolved.id == "u1"


def test_api_error_logging_includes_structured_operational_fields(caplog):
    app = FastAPI()
    register_exception_handlers(app)

    @app.middleware("http")
    async def inject_request_id(request, call_next):
        request.state.request_id = "req-unit-001"
        return await call_next(request)

    @app.get("/boom")
    async def boom():
        raise APIError(
            status=401,
            title="Unauthorized",
            detail="Bearer abc.def.ghi",
            type_="https://api.budgetbuddy.dev/problems/unauthorized",
        )

    with TestClient(app) as client, caplog.at_level(logging.WARNING, logger="app.errors"):
        response = client.get("/boom")

    assert response.status_code == 401
    assert response.headers["x-request-id"] == "req-unit-001"

    messages = [record.getMessage() for record in caplog.records if record.name == "app.errors"]
    assert any("request_id=req-unit-001" in message for message in messages)
    assert any("path=/boom" in message for message in messages)
    assert any("status=401" in message for message in messages)
    assert any("problem_type=https://api.budgetbuddy.dev/problems/unauthorized" in message for message in messages)
