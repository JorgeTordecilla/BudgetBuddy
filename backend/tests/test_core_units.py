import base64
import json
import logging
import time
from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from starlette.requests import Request

from app.core.config import Settings
from app.core.errors import APIError, register_exception_handlers
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
from app.models import Account, Budget, Category, RefreshToken, Transaction, User
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


def _make_legacy_access_token(sub: str, *, exp_offset: int = 3600) -> str:
    payload = {"sub": sub, "exp": int(time.time()) + exp_offset, "iat": int(time.time())}
    payload_part = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")
    return f"{payload_part}.legacy"


def test_legacy_access_token_is_rejected():
    with pytest.raises(ValueError):
        decode_access_token(_make_legacy_access_token("legacy-user"))


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


def test_repository_protocol_shapes_are_implemented():
    # Ensure protocol contracts are imported/exercised and concrete repos expose required methods.
    protocol_to_impl = [
        (UserRepository, SQLAlchemyUserRepository, ["get_by_id", "get_by_username", "add"]),
        (RefreshTokenRepository, SQLAlchemyRefreshTokenRepository, ["get_by_hash", "add", "has_newer_token", "list_active_by_user"]),
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
        expires_at=datetime.now(tz=UTC) + timedelta(days=1),
        created_at=datetime.now(tz=UTC) - timedelta(minutes=10),
        revoked_at=datetime.now(tz=UTC),
    )
    token_new_active = RefreshToken(
        user_id=user.id,
        token_hash="token-new",
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
    assert refresh_repo.has_newer_token(user.id, token_old.created_at) is True
    assert refresh_repo.has_newer_token(user.id, token_new_active.created_at + timedelta(seconds=1)) is False


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
