import base64
import json
import logging
import time
from datetime import UTC, date, datetime, timedelta
from threading import Barrier, BrokenBarrierError, Thread
from types import SimpleNamespace

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from starlette.requests import Request

import app.core.audit as audit_core
import app.core.network as network_core
import app.core.utils as core_utils
import app.routers.auth as auth_router
from app.core.config import Settings
from app.core.errors import APIError, register_exception_handlers
from app.core.network import resolve_rate_limit_client_ip
from app.core.rate_limit import InMemoryRateLimiter, _BucketState
from app.core.pagination import decode_cursor, encode_cursor, parse_datetime
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
import app.db.session as db_session
from app.dependencies import _accepts_vendor_or_problem, enforce_accept_header, enforce_content_type, get_current_user
from app.db import SessionLocal, get_migration_revision_state
from app.models import Account, AuditEvent, Budget, Category, RefreshToken, Transaction, User
from app.repositories import (
    SQLAlchemyAccountRepository,
    SQLAlchemyBudgetRepository,
    SQLAlchemyCategoryRepository,
    SQLAlchemyRefreshTokenRepository,
    SQLAlchemyTransactionRepository,
    SQLAlchemyUserRepository,
)
from app.repositories.interfaces import (
    AccountRepository,
    BudgetRepository,
    CategoryRepository,
    RefreshTokenRepository,
    TransactionRepository,
    UserRepository,
)
from app.cli import bootstrap as bootstrap_cli


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


def _request_with_client(path: str, client_host: str, method: str = "GET", headers: dict[str, str] | None = None) -> Request:
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
        "client": (client_host, 50000),
    }
    return Request(scope)


def test_safe_resource_id_filters_blank_token_and_secret_values():
    assert audit_core._safe_resource_id(None) is None
    assert audit_core._safe_resource_id("   ") is None
    assert audit_core._safe_resource_id("Bearer secret-token") is None
    assert audit_core._safe_resource_id("refresh_token_family") is None
    assert audit_core._safe_resource_id("x" * 80) == "x" * 64


def test_emit_audit_event_defaults_unknown_request_id_and_preserves_created_at():
    created_at = datetime.now(tz=UTC) - timedelta(minutes=1)
    db = SessionLocal()
    try:
        audit_core.emit_audit_event(
            db,
            request=None,
            user_id="user-1",
            resource_type="auth_session",
            resource_id="family-1",
            action="auth.refresh_token_family_revoked",
            created_at=created_at,
        )
        db.commit()
        row = db.scalar(select(AuditEvent).where(AuditEvent.user_id == "user-1"))
        assert row is not None
        assert row.request_id == "unknown"
        assert row.resource_id == "family-1"
        assert row.created_at.replace(tzinfo=UTC) == created_at
    finally:
        db.close()


class _DB:
    def __init__(self, user=None):
        self._user = user

    def scalar(self, _):
        return self._user


def _set_minimum_config_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./unit-test.db")
    monkeypatch.setenv("JWT_SECRET", "unit-test-secret")
    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("BUDGETBUDDY_CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("REFRESH_COOKIE_NAME", "bb_refresh")
    monkeypatch.setenv("REFRESH_COOKIE_PATH", "/api/auth")
    monkeypatch.setenv("REFRESH_COOKIE_SAMESITE", "none")
    monkeypatch.setenv("REFRESH_COOKIE_SECURE", "true")


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
    hashed = hash_password("StrongPwd123!")
    assert verify_password("StrongPwd123!", hashed) is True
    assert verify_password("wrong", hashed) is False
    assert verify_password("wrong", "invalid-format") is False

    token = create_access_token("user-1")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-1"
    assert isinstance(payload["nbf"], int)
    assert payload["nbf"] == payload["iat"]

    with pytest.raises(ValueError):
        decode_access_token("invalid-token-format")

    # Signature failure path: mutate the signature segment directly.
    header_seg, payload_seg, signature = token.split(".")
    mutated_signature = ("A" if signature[0] != "A" else "B") + signature[1:]
    mutated = f"{header_seg}.{payload_seg}.{mutated_signature}"
    with pytest.raises(ValueError):
        decode_access_token(mutated)

    # Expiration failure path.
    from app.core import security

    monkeypatch.setattr(security.settings, "access_token_expires_in", -1)
    expired = create_access_token("user-2")
    with pytest.raises(ValueError):
        decode_access_token(expired)

    # Not-before failure path.
    future_not_before = jwt.encode(
        {
            "sub": "user-3",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
            "nbf": int(time.time()) + 3600,
        },
        security.settings.jwt_secret,
        algorithm="HS256",
    )
    with pytest.raises(ValueError):
        decode_access_token(future_not_before)


def _make_legacy_access_token(sub: str, *, exp_offset: int = 3600) -> str:
    payload = {"sub": sub, "exp": int(time.time()) + exp_offset, "iat": int(time.time())}
    payload_part = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    return f"{payload_part}.legacy"


def test_legacy_access_token_is_rejected():
    with pytest.raises(ValueError):
        decode_access_token(_make_legacy_access_token("legacy-user"))


def test_utcnow_uses_shared_clock_contract(monkeypatch):
    fixed_now = datetime(2026, 1, 1, 0, 0, tzinfo=UTC)

    class _FixedClock:
        def now(self) -> datetime:
            return fixed_now

    monkeypatch.setattr(core_utils, "UTC_CLOCK", _FixedClock())
    assert core_utils.utcnow() == fixed_now


def test_dependency_guards_and_current_user_paths(monkeypatch):
    assert _accepts_vendor_or_problem("*/*")
    assert _accepts_vendor_or_problem("application/vnd.budgetbuddy.v1+json")
    assert not _accepts_vendor_or_problem("application/vnd.budgetbuddy.v1+json;q=0")
    assert not _accepts_vendor_or_problem("application/xml")

    # Path ignored (outside API).
    enforce_accept_header(_request("/health", headers={"accept": "application/xml"}))
    # API docs/health bypass.
    enforce_accept_header(_request("/api/health", headers={"accept": "application/xml"}))
    enforce_accept_header(_request("/api/healthz", headers={"accept": "application/xml"}))
    enforce_accept_header(_request("/api/readyz", headers={"accept": "application/xml"}))
    enforce_content_type(_request("/api/openapi.json", method="POST", headers={"content-type": "text/plain"}))
    # Non-body methods bypass.
    enforce_content_type(_request("/api/accounts", method="GET", headers={"content-type": "text/plain"}))

    with pytest.raises(APIError):
        enforce_accept_header(_request("/api/accounts", headers={"accept": "application/xml"}))
    with pytest.raises(APIError):
        enforce_content_type(_request("/api/accounts", method="POST", headers={"content-type": "text/plain"}))

    request = _request("/api/me")
    with pytest.raises(APIError):
        get_current_user(request=request, authorization="", db=_DB())

    monkeypatch.setattr("app.dependencies.decode_access_token", lambda _: (_ for _ in ()).throw(ValueError("bad")))
    with pytest.raises(APIError):
        get_current_user(request=request, authorization="Bearer token", db=_DB())

    monkeypatch.setattr("app.dependencies.decode_access_token", lambda _: {})
    with pytest.raises(APIError):
        get_current_user(request=request, authorization="Bearer token", db=_DB())

    monkeypatch.setattr("app.dependencies.decode_access_token", lambda _: {"sub": "u1"})
    with pytest.raises(APIError):
        get_current_user(request=request, authorization="Bearer token", db=_DB(user=None))

    user = SimpleNamespace(id="u1")
    resolved = get_current_user(request=request, authorization="Bearer token", db=_DB(user=user))
    assert resolved.id == "u1"
    request.state.user_id = None
    resolved_with_request = get_current_user(request=request, authorization="Bearer token", db=_DB(user=user))
    assert resolved_with_request.id == "u1"
    assert request.state.user_id == "u1"


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


def test_settings_fail_fast_for_missing_critical_database_url(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValueError, match="DATABASE_URL"):
        Settings()


def test_settings_fail_fast_for_cookie_coherence(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("REFRESH_COOKIE_SAMESITE", "none")
    monkeypatch.setenv("REFRESH_COOKIE_SECURE", "false")
    with pytest.raises(ValueError, match="REFRESH_COOKIE_SECURE must be true when REFRESH_COOKIE_SAMESITE is 'none'"):
        Settings()


def test_settings_fail_fast_for_production_insecure_configuration(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DEBUG", "true")
    with pytest.raises(ValueError, match="DEBUG must be false in production"):
        Settings()

    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("BUDGETBUDDY_CORS_ORIGINS", "*")
    with pytest.raises(ValueError, match="must not contain '\\*' in production"):
        Settings()


def test_settings_fail_fast_for_production_missing_explicit_cookie_vars(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("ENV", "production")
    monkeypatch.delenv("REFRESH_COOKIE_PATH", raising=False)
    with pytest.raises(ValueError, match="REFRESH_COOKIE_PATH must be explicitly configured in production"):
        Settings()


def test_settings_bootstrap_create_demo_user_defaults_to_false(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.delenv("BOOTSTRAP_CREATE_DEMO_USER", raising=False)
    settings = Settings()
    assert settings.bootstrap_create_demo_user is False


def test_settings_fail_fast_for_production_demo_user_with_default_password(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("BOOTSTRAP_CREATE_DEMO_USER", "true")
    monkeypatch.delenv("BOOTSTRAP_DEMO_PASSWORD", raising=False)
    with pytest.raises(
        ValueError,
        match="BOOTSTRAP_DEMO_PASSWORD must be changed from default when BOOTSTRAP_CREATE_DEMO_USER is true in production",
    ):
        Settings()


def test_settings_migrations_strict_default_is_environment_sensitive(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.delenv("MIGRATIONS_STRICT", raising=False)
    settings = Settings()
    assert settings.migrations_strict is False

    monkeypatch.setenv("ENV", "production")
    settings = Settings()
    assert settings.migrations_strict is True


def test_settings_migrations_strict_can_be_explicitly_overridden(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("MIGRATIONS_STRICT", "false")
    settings = Settings()
    assert settings.migrations_strict is False

    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("MIGRATIONS_STRICT", "true")
    settings = Settings()
    assert settings.migrations_strict is True


def test_settings_rejects_invalid_log_level(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("LOG_LEVEL", "VERBOSE")
    with pytest.raises(ValueError, match="LOG_LEVEL must be one of"):
        Settings()


def test_settings_uses_valid_log_level(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("LOG_LEVEL", "debug")
    settings = Settings()
    assert settings.log_level == "DEBUG"


def test_settings_rejects_invalid_transactions_import_rate_limit(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("TRANSACTIONS_IMPORT_RATE_LIMIT_PER_MINUTE", "0")
    with pytest.raises(ValueError, match="TRANSACTIONS_IMPORT_RATE_LIMIT_PER_MINUTE"):
        Settings()


def test_settings_rejects_non_numeric_transactions_export_rate_limit(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("TRANSACTIONS_EXPORT_RATE_LIMIT_PER_MINUTE", "fast")
    with pytest.raises(ValueError, match="TRANSACTIONS_EXPORT_RATE_LIMIT_PER_MINUTE"):
        Settings()


def test_settings_rejects_invalid_rate_limit_trusted_proxies(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("RATE_LIMIT_TRUSTED_PROXIES", "not-a-cidr")
    with pytest.raises(ValueError, match="RATE_LIMIT_TRUSTED_PROXIES"):
        Settings()


def test_resolve_rate_limit_client_ip_ignores_untrusted_forwarded_header(monkeypatch):
    request = _request(
        "/api/auth/login",
        headers={"x-forwarded-for": "203.0.113.10, 198.51.100.2"},
    )
    monkeypatch.setattr("app.core.network.settings.rate_limit_trusted_proxies", ["10.0.0.0/24"])
    assert resolve_rate_limit_client_ip(request) == "testclient"


def test_resolve_rate_limit_client_ip_uses_forwarded_header_for_trusted_proxy(monkeypatch):
    request = _request_with_client(
        "/api/auth/login",
        "10.0.0.8",
        headers={"x-forwarded-for": "203.0.113.10, 10.0.0.8"},
    )
    monkeypatch.setattr("app.core.network.settings.rate_limit_trusted_proxies", ["10.0.0.0/24"])
    assert resolve_rate_limit_client_ip(request) == "203.0.113.10"


def test_in_memory_rate_limiter_passive_cleanup_evicts_expired_unlocked_buckets():
    clock = {"now": 0.0}
    limiter = InMemoryRateLimiter(now_fn=lambda: clock["now"])
    limiter._checks = limiter._PURGE_EVERY - 1
    limiter._buckets["expired"] = _BucketState(window_start=-120.0, window_seconds=60, count=1, lock_until=None)
    limiter._buckets["active"] = _BucketState(window_start=0.0, window_seconds=60, count=1, lock_until=None)

    allowed, retry_after = limiter.check("current", limit=5, window_seconds=60)

    assert allowed is True
    assert retry_after is None
    assert "expired" not in limiter._buckets
    assert "active" in limiter._buckets


def test_in_memory_rate_limiter_passive_cleanup_keeps_locked_buckets_until_expiry():
    clock = {"now": 30.0}
    limiter = InMemoryRateLimiter(now_fn=lambda: clock["now"])
    limiter._checks = limiter._PURGE_EVERY - 1
    limiter._buckets["locked"] = _BucketState(window_start=-120.0, window_seconds=60, count=2, lock_until=120.0)

    allowed, retry_after = limiter.check("current", limit=5, window_seconds=60)

    assert allowed is True
    assert retry_after is None
    assert "locked" in limiter._buckets


def test_in_memory_rate_limiter_passive_cleanup_respects_bucket_window_seconds():
    clock = {"now": 120.0}
    limiter = InMemoryRateLimiter(now_fn=lambda: clock["now"])
    limiter._checks = limiter._PURGE_EVERY - 1
    limiter._buckets["short-window"] = _BucketState(window_start=0.0, window_seconds=60, count=1, lock_until=None)
    limiter._buckets["long-window"] = _BucketState(window_start=0.0, window_seconds=300, count=1, lock_until=None)

    allowed, retry_after = limiter.check("trigger", limit=5, window_seconds=60)

    assert allowed is True
    assert retry_after is None
    assert "short-window" not in limiter._buckets
    assert "long-window" in limiter._buckets


def test_in_memory_rate_limiter_active_bucket_keeps_stored_window_until_rollover():
    clock = {"now": 0.0}
    limiter = InMemoryRateLimiter(now_fn=lambda: clock["now"])

    allowed, retry_after = limiter.check("user", limit=1, window_seconds=60)

    assert allowed is True
    assert retry_after is None
    assert limiter._buckets["user"].window_seconds == 60

    clock["now"] = 30.0
    allowed, retry_after = limiter.check("user", limit=1, window_seconds=300)

    assert allowed is False
    assert retry_after == 30
    assert limiter._buckets["user"].window_seconds == 60


def test_in_memory_rate_limiter_expired_bucket_adopts_new_window_on_reset():
    clock = {"now": 0.0}
    limiter = InMemoryRateLimiter(now_fn=lambda: clock["now"])

    allowed, retry_after = limiter.check("user", limit=1, window_seconds=60)

    assert allowed is True
    assert retry_after is None

    clock["now"] = 61.0
    allowed, retry_after = limiter.check("user", limit=2, window_seconds=300)

    assert allowed is True
    assert retry_after is None
    state = limiter._buckets["user"]
    assert state.window_start == 61.0
    assert state.window_seconds == 300
    assert state.count == 1


def test_settings_rejects_invalid_db_pool_recycle_seconds(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("DB_POOL_RECYCLE_SECONDS", "0")
    with pytest.raises(ValueError, match="DB_POOL_RECYCLE_SECONDS"):
        Settings()


def test_build_engine_applies_pool_resilience_for_non_sqlite(monkeypatch):
    captured: dict[str, object] = {}

    def fake_create_engine(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(db_session, "create_engine", fake_create_engine)
    monkeypatch.setattr(db_session.settings, "database_url", "postgresql+psycopg://user:pass@localhost/db")
    monkeypatch.setattr(db_session.settings, "db_pool_pre_ping", True)
    monkeypatch.setattr(db_session.settings, "db_pool_recycle_seconds", 180)

    db_session._build_engine()

    kwargs = captured["kwargs"]
    assert captured["url"] == "postgresql+psycopg://user:pass@localhost/db"
    assert kwargs["future"] is True
    assert kwargs["connect_args"] == {}
    assert kwargs["pool_pre_ping"] is True
    assert kwargs["pool_recycle"] == 180


def test_build_engine_keeps_sqlite_behavior(monkeypatch):
    captured: dict[str, object] = {}

    def fake_create_engine(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(db_session, "create_engine", fake_create_engine)
    monkeypatch.setattr(db_session.settings, "database_url", "sqlite:///./unit-test.db")

    db_session._build_engine()

    kwargs = captured["kwargs"]
    assert captured["url"] == "sqlite:///./unit-test.db"
    assert kwargs["future"] is True
    assert kwargs["connect_args"] == {"check_same_thread": False}
    assert "pool_pre_ping" not in kwargs
    assert "pool_recycle" not in kwargs


def test_is_database_ready_false_on_connection_error(monkeypatch):
    class BrokenEngine:
        def connect(self):
            raise RuntimeError("db down")

    monkeypatch.setattr(db_session, "engine", BrokenEngine())
    assert db_session.is_database_ready() is False


def test_get_migration_revision_state_reports_ok_and_fail(monkeypatch):
    class FakeScript:
        def __init__(self, heads):
            self._heads = heads

        def get_heads(self):
            return self._heads

    class FakeConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeEngine:
        def connect(self):
            return FakeConn()

    class FakeMigrationContext:
        def __init__(self, revision):
            self._revision = revision

        def get_current_revision(self):
            return self._revision

    monkeypatch.setattr("app.db.session.ScriptDirectory.from_config", lambda _cfg: FakeScript(["head-1"]))
    monkeypatch.setattr("app.db.session.MigrationContext.configure", lambda _conn: FakeMigrationContext("head-1"))
    monkeypatch.setattr(db_session, "engine", FakeEngine())
    assert db_session.get_migration_revision_state() == ("ok", "head-1", "head-1")

    monkeypatch.setattr("app.db.session.MigrationContext.configure", lambda _conn: FakeMigrationContext("old-rev"))
    assert db_session.get_migration_revision_state() == ("fail", "old-rev", "head-1")


def test_get_migration_revision_state_reports_unknown_when_revisions_missing(monkeypatch):
    class FakeScript:
        def get_heads(self):
            return []

    class FakeConn:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeEngine:
        def connect(self):
            return FakeConn()

    class FakeMigrationContext:
        def get_current_revision(self):
            return None

    monkeypatch.setattr("app.db.session.ScriptDirectory.from_config", lambda _cfg: FakeScript())
    monkeypatch.setattr("app.db.session.MigrationContext.configure", lambda _conn: FakeMigrationContext())
    monkeypatch.setattr(db_session, "engine", FakeEngine())
    assert db_session.get_migration_revision_state() == ("unknown", None, None)


def test_settings_refresh_origin_missing_mode_defaults_by_environment(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.delenv("AUTH_REFRESH_MISSING_ORIGIN_MODE", raising=False)
    settings = Settings()
    assert settings.auth_refresh_missing_origin_mode == "allow_trusted"

    monkeypatch.setenv("ENV", "production")
    settings = Settings()
    assert settings.auth_refresh_missing_origin_mode == "deny"


def test_settings_refresh_origin_missing_mode_validation(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("AUTH_REFRESH_MISSING_ORIGIN_MODE", "invalid")
    with pytest.raises(ValueError, match="AUTH_REFRESH_MISSING_ORIGIN_MODE must be one of"):
        Settings()


def test_settings_refresh_origin_allowlist_defaults_to_cors(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("BUDGETBUDDY_CORS_ORIGINS", "http://localhost:5173,https://app.example.com")
    monkeypatch.delenv("AUTH_REFRESH_ALLOWED_ORIGINS", raising=False)
    settings = Settings()
    assert settings.auth_refresh_allowed_origins == ["http://localhost:5173", "https://app.example.com"]


def test_parse_forwarded_client_ip_skips_invalid_candidates():
    assert network_core._parse_forwarded_client_ip("garbage, 203.0.113.9") == "203.0.113.9"
    assert network_core._parse_forwarded_client_ip("garbage,also-bad") is None


def test_is_trusted_proxy_rejects_invalid_peer_and_matches_config(monkeypatch):
    monkeypatch.setattr(network_core.settings, "rate_limit_trusted_proxies", ["10.0.0.0/8"])
    assert network_core._is_trusted_proxy("not-an-ip") is False
    assert network_core._is_trusted_proxy("10.1.2.3") is True
    assert network_core._is_trusted_proxy("203.0.113.5") is False


def test_resolve_rate_limit_client_ip_uses_peer_when_needed(monkeypatch):
    monkeypatch.setattr(network_core.settings, "rate_limit_trusted_proxies", ["10.0.0.0/8"])
    trusted_request = _request_with_client("/refresh", "10.1.2.3", headers={"x-forwarded-for": "bad, 198.51.100.10"})
    assert resolve_rate_limit_client_ip(trusted_request) == "198.51.100.10"

    untrusted_request = _request_with_client("/refresh", "203.0.113.20", headers={"x-forwarded-for": "198.51.100.10"})
    assert resolve_rate_limit_client_ip(untrusted_request) == "203.0.113.20"

    no_client_request = Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "path": "/refresh",
            "raw_path": b"/refresh",
            "query_string": b"",
            "headers": [],
            "scheme": "http",
            "server": ("testserver", 80),
            "client": None,
        }
    )
    monkeypatch.setattr(network_core.settings, "rate_limit_trusted_proxies", [])
    assert resolve_rate_limit_client_ip(no_client_request) == "unknown"


def test_settings_refresh_grace_period_defaults_and_accepts_zero(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.delenv("REFRESH_GRACE_PERIOD_SECONDS", raising=False)
    settings = Settings()
    assert settings.refresh_grace_period_seconds == 30
    assert settings.safe_log_fields()["refresh_grace_period_seconds"] == 30

    monkeypatch.setenv("REFRESH_GRACE_PERIOD_SECONDS", "0")
    zero_grace = Settings()
    assert zero_grace.refresh_grace_period_seconds == 0


def test_settings_refresh_grace_period_rejects_out_of_range_values(monkeypatch):
    _set_minimum_config_env(monkeypatch)
    monkeypatch.setenv("REFRESH_GRACE_PERIOD_SECONDS", "-1")
    with pytest.raises(ValueError, match="REFRESH_GRACE_PERIOD_SECONDS"):
        Settings()

    monkeypatch.setenv("REFRESH_GRACE_PERIOD_SECONDS", "121")
    with pytest.raises(ValueError, match="REFRESH_GRACE_PERIOD_SECONDS"):
        Settings()


def test_bootstrap_happy_path_creates_demo_user_and_minimal_seed(monkeypatch):
    messages: list[str] = []
    monkeypatch.setattr(bootstrap_cli, "run_migrations", lambda: messages.append("migrated"))
    monkeypatch.setattr(bootstrap_cli.settings, "runtime_env", "development")
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_allow_prod", False)
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_create_demo_user", True)
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_seed_minimal_data", True)
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_demo_username", "bootstrap_demo")
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_demo_password", "bootstrap-demo-password")
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_demo_currency_code", "USD")

    bootstrap_cli.run_bootstrap(log_fn=messages.append)

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == "bootstrap_demo"))
        assert user is not None
        account = db.scalar(select(Account).where(Account.user_id == user.id, Account.name == "Demo Cash"))
        assert account is not None
        income = db.scalar(select(Category).where(Category.user_id == user.id, Category.name == "Salary", Category.type == "income"))
        expense = db.scalar(
            select(Category).where(Category.user_id == user.id, Category.name == "Groceries", Category.type == "expense")
        )
        assert income is not None
        assert expense is not None
    assert "migrated" in messages
    assert not any("bootstrap-demo-password" in message for message in messages)


def test_bootstrap_is_idempotent_on_repeated_runs(monkeypatch):
    monkeypatch.setattr(bootstrap_cli, "run_migrations", lambda: None)
    monkeypatch.setattr(bootstrap_cli.settings, "runtime_env", "development")
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_allow_prod", False)
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_create_demo_user", True)
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_seed_minimal_data", True)
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_demo_username", "bootstrap_repeat")
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_demo_password", "bootstrap-repeat-password")
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_demo_currency_code", "USD")

    bootstrap_cli.run_bootstrap(log_fn=lambda _: None)
    bootstrap_cli.run_bootstrap(log_fn=lambda _: None)

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == "bootstrap_repeat"))
        assert user is not None
        account_count = db.query(Account).filter(Account.user_id == user.id, Account.name == "Demo Cash").count()
        income_count = db.query(Category).filter(Category.user_id == user.id, Category.name == "Salary", Category.type == "income").count()
        expense_count = (
            db.query(Category).filter(Category.user_id == user.id, Category.name == "Groceries", Category.type == "expense").count()
        )
        assert account_count == 1
        assert income_count == 1
        assert expense_count == 1


def test_bootstrap_is_blocked_in_production_without_override(monkeypatch):
    monkeypatch.setattr(bootstrap_cli.settings, "runtime_env", "production")
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_allow_prod", False)
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_create_demo_user", True)
    monkeypatch.setattr(bootstrap_cli.settings, "bootstrap_seed_minimal_data", True)
    with pytest.raises(RuntimeError, match="disabled in production"):
        bootstrap_cli.run_bootstrap(log_fn=lambda _: None)


def test_get_migration_revision_state_handles_internal_errors(monkeypatch):
    monkeypatch.setattr(
        "app.db.session.ScriptDirectory.from_config",
        lambda _cfg: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    state, db_revision, head_revision = get_migration_revision_state()
    assert state == "unknown"
    assert db_revision is None
    assert head_revision is None


def test_startup_logs_config_without_secret_leakage(caplog):
    from app.main import app

    with caplog.at_level(logging.INFO, logger="app.startup"):
        with TestClient(app) as client:
            response = client.get("/api/health")
            assert response.status_code == 200

    messages = [record.getMessage() for record in caplog.records if record.name == "app.startup"]
    assert any("config loaded" in message for message in messages)
    assert not any("test-jwt-secret" in message for message in messages)
    assert not any("JWT_SECRET" in message for message in messages)


def test_generic_error_logging_includes_stacktrace_outside_production(monkeypatch, caplog):
    app = FastAPI()
    register_exception_handlers(app)

    @app.middleware("http")
    async def inject_request_id(request, call_next):
        request.state.request_id = "req-unit-500-dev"
        return await call_next(request)

    @app.get("/boom")
    async def boom():
        raise RuntimeError("fail-dev")

    monkeypatch.setattr("app.core.errors.settings.runtime_env", "development")
    with TestClient(app, raise_server_exceptions=False) as client, caplog.at_level(logging.ERROR, logger="app.errors"):
        response = client.get("/boom")
    assert response.status_code == 500
    assert any(record.exc_info for record in caplog.records if record.name == "app.errors")


def test_generic_error_logging_hides_stacktrace_in_production(monkeypatch, caplog):
    app = FastAPI()
    register_exception_handlers(app)

    @app.middleware("http")
    async def inject_request_id(request, call_next):
        request.state.request_id = "req-unit-500-prod"
        return await call_next(request)

    @app.get("/boom")
    async def boom():
        raise RuntimeError("fail-prod")

    monkeypatch.setattr("app.core.errors.settings.runtime_env", "production")
    with TestClient(app, raise_server_exceptions=False) as client, caplog.at_level(logging.ERROR, logger="app.errors"):
        response = client.get("/boom")
    assert response.status_code == 500
    app_error_records = [record for record in caplog.records if record.name == "app.errors"]
    assert app_error_records
    assert all(record.exc_info is None for record in app_error_records)


def test_auth_origin_policy_short_circuits_when_cookie_not_none(monkeypatch):
    monkeypatch.setattr(auth_router.settings, "refresh_cookie_samesite", "lax")
    auth_router._enforce_refresh_origin_policy(_request("/api/auth/refresh"))


def test_active_refresh_token_or_401_rejects_missing_or_expired_rows():
    db = SessionLocal()
    try:
        with pytest.raises(APIError) as exc_info:
            auth_router._active_refresh_token_or_401(db, "missing-token")
        assert exc_info.value.status == 401
        assert exc_info.value.detail == "Refresh token is invalid or expired"

        user = User(username="expired_refresh_user", password_hash="hash", currency_code="USD")
        db.add(user)
        db.flush()
        db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=auth_router.hash_refresh_token("expired-token"),
                family_id="family-expired",
                expires_at=datetime.now(tz=UTC) - timedelta(minutes=1),
            )
        )
        db.commit()

        with pytest.raises(APIError) as expired_exc:
            auth_router._active_refresh_token_or_401(db, "expired-token")
        assert expired_exc.value.status == 401
        assert expired_exc.value.detail == "Refresh token is invalid or expired"
    finally:
        db.close()


def test_register_returns_conflict_when_username_exists(monkeypatch):
    monkeypatch.setattr(auth_router, "_auth_rate_limit_or_429", lambda *args, **kwargs: None)
    db = SessionLocal()
    try:
        existing = User(username="duplicate_user", password_hash="hash", currency_code="USD")
        db.add(existing)
        db.commit()

        request = _request("/api/auth/register", method="POST")
        payload = auth_router.RegisterRequest(username="duplicate_user", password="StrongPwd123!", currency_code="USD")
        with pytest.raises(APIError) as exc_info:
            auth_router.register(payload, request, db)
        assert exc_info.value.status == 409
        assert exc_info.value.title == "Conflict"
    finally:
        db.close()


def test_repository_protocol_shapes_are_implemented():
    # Ensure protocol contracts are imported/exercised and concrete repos expose required methods.
    protocol_to_impl = [
        (UserRepository, SQLAlchemyUserRepository, ["get_by_id", "get_by_username", "add"]),
        (
            RefreshTokenRepository,
            SQLAlchemyRefreshTokenRepository,
            ["get_by_hash", "add", "rotate_atomically", "get_child_of", "revoke_family", "list_active_by_user"],
        ),
        (AccountRepository, SQLAlchemyAccountRepository, ["get_owned", "list_for_user", "add"]),
        (BudgetRepository, SQLAlchemyBudgetRepository, ["get_owned", "list_for_user_month_range", "add"]),
        (CategoryRepository, SQLAlchemyCategoryRepository, ["get_owned", "list_for_user", "add"]),
        (TransactionRepository, SQLAlchemyTransactionRepository, ["get_owned", "list_for_user", "add"]),
    ]

    for protocol, impl, methods in protocol_to_impl:
        assert protocol is not None
        assert impl is not None
        for method in methods:
            assert hasattr(impl, method)


def _seed_repo_users(db):
    user = User(username="repo_user_a", password_hash="hash", currency_code="USD")
    other_user = User(username="repo_user_b", password_hash="hash", currency_code="USD")
    db.add_all([user, other_user])
    db.flush()
    return user, other_user


def _seed_repo_accounts(db, user: User, other_user: User):
    acc_active = Account(user_id=user.id, name="acc-active", type="cash", initial_balance_cents=100)
    acc_archived = Account(
        user_id=user.id,
        name="acc-archived",
        type="cash",
        initial_balance_cents=200,
        archived_at=datetime.now(tz=UTC),
    )
    acc_other = Account(user_id=other_user.id, name="acc-other", type="cash", initial_balance_cents=300)
    db.add_all([acc_active, acc_archived, acc_other])
    return acc_active, acc_archived, acc_other


def _seed_repo_categories(db, user: User, other_user: User):
    cat_income = Category(user_id=user.id, name="cat-income", type="income")
    cat_exp_archived = Category(
        user_id=user.id,
        name="cat-exp-archived",
        type="expense",
        archived_at=datetime.now(tz=UTC),
    )
    cat_other = Category(user_id=other_user.id, name="cat-other", type="income")
    db.add_all([cat_income, cat_exp_archived, cat_other])
    db.flush()
    return cat_income, cat_exp_archived, cat_other


def _seed_repo_transactions(db, user: User, other_user: User, acc_active: Account, acc_archived: Account, acc_other: Account, cat_income: Category, cat_exp_archived: Category, cat_other: Category):
    tx_visible = Transaction(
        user_id=user.id,
        type="income",
        account_id=acc_active.id,
        category_id=cat_income.id,
        amount_cents=1000,
        date=date(2026, 2, 1),
    )
    tx_archived = Transaction(
        user_id=user.id,
        type="expense",
        account_id=acc_archived.id,
        category_id=cat_exp_archived.id,
        amount_cents=500,
        date=date(2026, 2, 2),
        archived_at=datetime.now(tz=UTC),
    )
    tx_other = Transaction(
        user_id=other_user.id,
        type="income",
        account_id=acc_other.id,
        category_id=cat_other.id,
        amount_cents=1500,
        date=date(2026, 2, 3),
    )
    db.add_all([tx_visible, tx_archived, tx_other])
    return tx_visible, tx_other


def _seed_refresh_tokens(db, user: User):
    token_old = RefreshToken(
        user_id=user.id,
        token_hash="token-old",
        family_id="family-1",
        parent_hash=None,
        expires_at=datetime.now(tz=UTC) + timedelta(days=1),
        created_at=datetime.now(tz=UTC) - timedelta(minutes=10),
        revoked_at=datetime.now(tz=UTC),
    )
    token_new_active = RefreshToken(
        user_id=user.id,
        token_hash="token-new",
        family_id="family-1",
        parent_hash="token-old",
        expires_at=datetime.now(tz=UTC) + timedelta(days=1),
        created_at=datetime.now(tz=UTC),
    )
    db.add_all([token_old, token_new_active])
    db.commit()
    return token_old, token_new_active


def _seed_budgets(db, user: User, other_user: User, cat_income: Category, cat_other: Category):
    budget_a = Budget(user_id=user.id, category_id=cat_income.id, month="2026-01", limit_cents=10000)
    budget_b = Budget(user_id=user.id, category_id=cat_income.id, month="2026-02", limit_cents=12000)
    budget_archived = Budget(
        user_id=user.id,
        category_id=cat_income.id,
        month="2026-03",
        limit_cents=15000,
        archived_at=datetime.now(tz=UTC),
    )
    budget_other = Budget(user_id=other_user.id, category_id=cat_other.id, month="2026-01", limit_cents=9000)
    db.add_all([budget_a, budget_b, budget_archived, budget_other])
    db.commit()
    return budget_a, budget_b, budget_archived, budget_other


def _assert_account_repo(account_repo: SQLAlchemyAccountRepository, user: User, acc_active: Account, acc_archived: Account, acc_other: Account):
    assert [a.id for a in account_repo.list_for_user(user.id, include_archived=False)] == [acc_active.id]
    assert set(a.id for a in account_repo.list_for_user(user.id, include_archived=True)) == {acc_active.id, acc_archived.id}
    assert account_repo.get_owned(user.id, acc_active.id) is not None
    assert account_repo.get_owned(user.id, acc_other.id) is None


def _assert_category_repo(category_repo: SQLAlchemyCategoryRepository, user: User, cat_income: Category, cat_exp_archived: Category, cat_other: Category):
    only_income = category_repo.list_for_user(user.id, include_archived=False, category_type="income")
    assert [c.id for c in only_income] == [cat_income.id]
    with_archived = category_repo.list_for_user(user.id, include_archived=True, category_type=None)
    assert set(c.id for c in with_archived) == {cat_income.id, cat_exp_archived.id}
    assert category_repo.get_owned(user.id, cat_income.id) is not None
    assert category_repo.get_owned(user.id, cat_other.id) is None


def _assert_transaction_repo(tx_repo: SQLAlchemyTransactionRepository, user: User, tx_visible: Transaction, tx_other: Transaction, acc_active: Account, cat_income: Category):
    listed_default = tx_repo.list_for_user(user.id, False, None, None, None, None, None)
    assert [t.id for t in listed_default] == [tx_visible.id]
    listed_filtered = tx_repo.list_for_user(
        user.id,
        True,
        "income",
        acc_active.id,
        cat_income.id,
        date(2026, 2, 1),
        date(2026, 2, 1),
    )
    assert [t.id for t in listed_filtered] == [tx_visible.id]
    assert tx_repo.get_owned(user.id, tx_visible.id) is not None
    assert tx_repo.get_owned(user.id, tx_other.id) is None


def _assert_refresh_repo(refresh_repo: SQLAlchemyRefreshTokenRepository, user: User, token_old: RefreshToken, token_new_active: RefreshToken):
    assert refresh_repo.get_by_hash("token-new") is not None
    assert refresh_repo.get_by_hash("missing") is None
    active = refresh_repo.list_active_by_user(user.id)
    assert [row.token_hash for row in active] == ["token-new"]
    child = refresh_repo.get_child_of("token-old")
    assert child is not None
    assert child.token_hash == "token-new"
    assert refresh_repo.revoke_family("family-1") == 1
    active_after_revoke = refresh_repo.list_active_by_user(user.id)
    assert active_after_revoke == []


def test_refresh_repository_rotate_atomically_is_idempotent_under_concurrency():
    from app.db import Base, engine

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = User(username="refresh_repo_user", password_hash="hash", currency_code="USD")
        db.add(user)
        db.flush()
        refresh = RefreshToken(
            user_id=user.id,
            token_hash="rotate-me",
            family_id="family-concurrency",
            parent_hash=None,
            expires_at=datetime.now(tz=UTC) + timedelta(days=1),
        )
        db.add(refresh)
        db.commit()
    finally:
        db.close()

    barrier = Barrier(2)
    results: list[RefreshToken | None] = [None, None]
    errors: list[Exception] = []

    def run_rotate(index: int) -> None:
        local_db = SessionLocal()
        try:
            try:
                barrier.wait(timeout=2)
            except BrokenBarrierError:
                pass
            repo = SQLAlchemyRefreshTokenRepository(local_db)
            results[index] = repo.rotate_atomically("rotate-me", 30)
            local_db.commit()
        except Exception as exc:  # pragma: no cover - assertion surfaces thread failures
            errors.append(exc)
        finally:
            local_db.close()

    threads = [Thread(target=run_rotate, args=(0,)), Thread(target=run_rotate, args=(1,))]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert errors == []
    assert sum(1 for result in results if result is not None) == 1

    verification_db = SessionLocal()
    try:
        row = verification_db.scalar(select(RefreshToken).where(RefreshToken.token_hash == "rotate-me"))
        if row is None:
            all_hashes = list(verification_db.scalars(select(RefreshToken.token_hash)))
            raise AssertionError(f"expected rotate-me row, found hashes={all_hashes}")
        assert row is not None
        assert row.rotated_at is not None
        assert row.grace_until is not None
    finally:
        verification_db.close()


def test_refresh_repository_rotate_atomically_uses_shared_utc_clock(monkeypatch):
    fixed_now = datetime(2026, 3, 1, 12, 0, tzinfo=UTC)

    class _FixedClock:
        def now(self) -> datetime:
            return fixed_now

    monkeypatch.setattr(core_utils, "UTC_CLOCK", _FixedClock())

    db = SessionLocal()
    try:
        user = User(username="refresh_repo_clock_user", password_hash="hash", currency_code="USD")
        db.add(user)
        db.flush()
        refresh = RefreshToken(
            user_id=user.id,
            token_hash="rotate-clock",
            family_id="family-clock",
            parent_hash=None,
            expires_at=fixed_now + timedelta(days=1),
        )
        db.add(refresh)
        db.commit()
    finally:
        db.close()

    local_db = SessionLocal()
    try:
        repo = SQLAlchemyRefreshTokenRepository(local_db)
        rotated = repo.rotate_atomically("rotate-clock", 30)
        local_db.commit()
        assert rotated is not None
    finally:
        local_db.close()

    verification_db = SessionLocal()
    try:
        row = verification_db.scalar(select(RefreshToken).where(RefreshToken.token_hash == "rotate-clock"))
        assert row is not None
        assert row.rotated_at is not None
        assert row.grace_until is not None
        assert core_utils.as_utc(row.rotated_at) == fixed_now
        assert core_utils.as_utc(row.grace_until) == fixed_now + timedelta(seconds=30)
    finally:
        verification_db.close()


def _assert_budget_repo(budget_repo: SQLAlchemyBudgetRepository, user: User, budget_a: Budget, budget_b: Budget, budget_other: Budget):
    rows = budget_repo.list_for_user_month_range(user.id, "2026-01", "2026-02")
    assert [row.id for row in rows] == [budget_a.id, budget_b.id]
    assert budget_repo.get_owned(user.id, budget_a.id) is not None
    assert budget_repo.get_owned(user.id, budget_other.id) is None


def test_sqlalchemy_repositories_cover_list_filter_branches():
    db = SessionLocal()
    try:
        user, other_user = _seed_repo_users(db)
        account_repo = SQLAlchemyAccountRepository(db)
        budget_repo = SQLAlchemyBudgetRepository(db)
        category_repo = SQLAlchemyCategoryRepository(db)
        tx_repo = SQLAlchemyTransactionRepository(db)
        refresh_repo = SQLAlchemyRefreshTokenRepository(db)
        acc_active, acc_archived, acc_other = _seed_repo_accounts(db, user, other_user)
        cat_income, cat_exp_archived, cat_other = _seed_repo_categories(db, user, other_user)
        tx_visible, tx_other = _seed_repo_transactions(
            db, user, other_user, acc_active, acc_archived, acc_other, cat_income, cat_exp_archived, cat_other
        )
        token_old, token_new_active = _seed_refresh_tokens(db, user)
        budget_a, budget_b, _budget_archived, budget_other = _seed_budgets(db, user, other_user, cat_income, cat_other)

        _assert_account_repo(account_repo, user, acc_active, acc_archived, acc_other)
        _assert_category_repo(category_repo, user, cat_income, cat_exp_archived, cat_other)
        _assert_transaction_repo(tx_repo, user, tx_visible, tx_other, acc_active, cat_income)
        _assert_refresh_repo(refresh_repo, user, token_old, token_new_active)
        _assert_budget_repo(budget_repo, user, budget_a, budget_b, budget_other)
    finally:
        db.close()
