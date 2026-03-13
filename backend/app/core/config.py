import ipaddress
import os

from pydantic import AliasChoices, Field, ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_BOOTSTRAP_DEMO_PASSWORD = "demo-password-123"
_DEFAULT_CORS_ORIGINS = ["http://localhost:5173"]
_TRUE_VALUES = {"1", "true", "yes", "on"}


def _parse_bool(raw: object, default: bool) -> bool:
    if raw is None:
        return default
    if isinstance(raw, bool):
        return raw
    return str(raw).strip().lower() in _TRUE_VALUES


def _parse_csv(raw: object, default: list[str] | None = None) -> list[str] | None:
    if raw is None:
        return list(default) if default is not None else None
    if isinstance(raw, list):
        parsed = [str(item).strip() for item in raw if str(item).strip()]
    else:
        values = [item.strip() for item in str(raw).split(",")]
        parsed = [item for item in values if item]
    if parsed:
        return parsed
    if default is None:
        return []
    return list(default)


def _parse_positive_int(raw: object, name: str, *, minimum: int = 1) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be an integer >= {minimum}") from exc
    if value < minimum:
        raise ValueError(f"{name} must be an integer >= {minimum}")
    return value


def _parse_bounded_int(raw: object, name: str, *, minimum: int, maximum: int) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be an integer between {minimum} and {maximum}") from exc
    if value < minimum or value > maximum:
        raise ValueError(f"{name} must be an integer between {minimum} and {maximum}")
    return value


def _parse_positive_float(raw: object, name: str, *, minimum: float = 0.0) -> float:
    try:
        value = float(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} must be a number > {minimum}") from exc
    if value <= minimum:
        raise ValueError(f"{name} must be a number > {minimum}")
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", enable_decoding=False)

    database_url: str = Field(default="", alias="DATABASE_URL")
    jwt_secret: str = Field(default="", alias="JWT_SECRET")
    runtime_env: str = Field(default="development", validation_alias=AliasChoices("ENV", "APP_ENV"))
    debug: bool = Field(default=False, alias="DEBUG")
    access_token_expires_in: int = Field(default=900, alias="ACCESS_TOKEN_EXPIRES_IN")
    refresh_token_expires_days: int = Field(default=30, alias="REFRESH_TOKEN_EXPIRES_DAYS")
    refresh_token_ttl_seconds: int | None = Field(default=None, alias="REFRESH_TOKEN_TTL_SECONDS")
    refresh_grace_period_seconds: int = Field(default=30, alias="REFRESH_GRACE_PERIOD_SECONDS")
    refresh_cookie_name: str = Field(default="bb_refresh", alias="REFRESH_COOKIE_NAME")
    refresh_cookie_path: str = Field(default="/api/auth", alias="REFRESH_COOKIE_PATH")
    refresh_cookie_secure: bool = Field(default=True, alias="REFRESH_COOKIE_SECURE")
    refresh_cookie_samesite: str | None = Field(default=None, alias="REFRESH_COOKIE_SAMESITE")
    refresh_cookie_domain: str | None = Field(default=None, alias="REFRESH_COOKIE_DOMAIN")
    transaction_import_max_items: int = Field(default=500, alias="TRANSACTION_IMPORT_MAX_ITEMS")
    auth_register_rate_limit_per_minute: int = Field(default=5, alias="AUTH_REGISTER_RATE_LIMIT_PER_MINUTE")
    auth_login_rate_limit_per_minute: int = Field(default=10, alias="AUTH_LOGIN_RATE_LIMIT_PER_MINUTE")
    auth_refresh_rate_limit_per_minute: int = Field(default=30, alias="AUTH_REFRESH_RATE_LIMIT_PER_MINUTE")
    transactions_import_rate_limit_per_minute: int = Field(default=20, alias="TRANSACTIONS_IMPORT_RATE_LIMIT_PER_MINUTE")
    transactions_export_rate_limit_per_minute: int = Field(default=30, alias="TRANSACTIONS_EXPORT_RATE_LIMIT_PER_MINUTE")
    transactions_import_async_per_user_limit: int = Field(default=3, alias="TRANSACTIONS_IMPORT_ASYNC_PER_USER_LIMIT")
    transactions_import_async_queue_limit: int = Field(default=1000, alias="TRANSACTIONS_IMPORT_ASYNC_QUEUE_LIMIT")
    transactions_import_async_worker_count: int = Field(default=2, alias="TRANSACTIONS_IMPORT_ASYNC_WORKER_COUNT")
    transactions_import_async_terminal_ttl_seconds: int = Field(
        default=3600, alias="TRANSACTIONS_IMPORT_ASYNC_TERMINAL_TTL_SECONDS"
    )
    transactions_import_async_idempotency_ttl_seconds: int = Field(
        default=3600, alias="TRANSACTIONS_IMPORT_ASYNC_IDEMPOTENCY_TTL_SECONDS"
    )
    transactions_import_async_retained_terminal_cap: int = Field(
        default=5000, alias="TRANSACTIONS_IMPORT_ASYNC_RETAINED_TERMINAL_CAP"
    )
    transactions_import_async_shutdown_timeout_seconds: float = Field(
        default=5.0, alias="TRANSACTIONS_IMPORT_ASYNC_SHUTDOWN_TIMEOUT_SECONDS"
    )
    transactions_rate_limit_window_seconds: int = Field(default=60, alias="TRANSACTIONS_RATE_LIMIT_WINDOW_SECONDS")
    auth_rate_limit_window_seconds: int = Field(default=60, alias="AUTH_RATE_LIMIT_WINDOW_SECONDS")
    auth_rate_limit_lock_enabled: bool = Field(default=False, alias="AUTH_RATE_LIMIT_LOCK_ENABLED")
    auth_rate_limit_lock_seconds: int = Field(default=300, alias="AUTH_RATE_LIMIT_LOCK_SECONDS")
    migrations_strict: bool | None = Field(default=None, alias="MIGRATIONS_STRICT")
    cors_origins: list[str] = Field(
        default_factory=lambda: list(_DEFAULT_CORS_ORIGINS),
        alias="BEBUDGET_CORS_ORIGINS",
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    auth_refresh_allowed_origins: list[str] | None = Field(default=None, alias="AUTH_REFRESH_ALLOWED_ORIGINS")
    auth_refresh_missing_origin_mode: str | None = Field(default=None, alias="AUTH_REFRESH_MISSING_ORIGIN_MODE")
    rate_limit_trusted_proxies: list[str] = Field(default_factory=list, alias="RATE_LIMIT_TRUSTED_PROXIES")
    bootstrap_allow_prod: bool = Field(default=False, alias="BOOTSTRAP_ALLOW_PROD")
    bootstrap_create_demo_user: bool = Field(default=False, alias="BOOTSTRAP_CREATE_DEMO_USER")
    bootstrap_seed_minimal_data: bool = Field(default=True, alias="BOOTSTRAP_SEED_MINIMAL_DATA")
    bootstrap_demo_username: str = Field(default="demo_user", alias="BOOTSTRAP_DEMO_USERNAME")
    bootstrap_demo_password: str = Field(default=_DEFAULT_BOOTSTRAP_DEMO_PASSWORD, alias="BOOTSTRAP_DEMO_PASSWORD")
    bootstrap_demo_currency_code: str = Field(default="USD", alias="BOOTSTRAP_DEMO_CURRENCY_CODE")
    db_pool_pre_ping: bool = Field(default=True, alias="DB_POOL_PRE_PING")
    db_pool_recycle_seconds: int = Field(default=240, alias="DB_POOL_RECYCLE_SECONDS")
    vapid_private_key: str = Field(default="", alias="VAPID_PRIVATE_KEY")
    vapid_public_key: str = Field(default="", alias="VAPID_PUBLIC_KEY")
    vapid_contact: str = Field(default="", alias="VAPID_CONTACT")
    push_test_token: str = Field(default="", alias="PUSH_TEST_TOKEN")

    @field_validator(
        "debug",
        "refresh_cookie_secure",
        "auth_rate_limit_lock_enabled",
        "bootstrap_allow_prod",
        "bootstrap_create_demo_user",
        "bootstrap_seed_minimal_data",
        "db_pool_pre_ping",
        mode="before",
    )
    @classmethod
    def _parse_bool_fields(cls, value: object, info: ValidationInfo) -> bool:
        defaults = {
            "debug": False,
            "refresh_cookie_secure": True,
            "auth_rate_limit_lock_enabled": False,
            "bootstrap_allow_prod": False,
            "bootstrap_create_demo_user": False,
            "bootstrap_seed_minimal_data": True,
            "db_pool_pre_ping": True,
        }
        return _parse_bool(value, defaults[info.field_name])

    @field_validator("runtime_env", mode="before")
    @classmethod
    def _normalize_runtime_env(cls, value: object) -> str:
        if value is None:
            return "development"
        normalized = str(value).strip().lower()
        return normalized or "development"

    @field_validator(
        "transaction_import_max_items",
        "auth_register_rate_limit_per_minute",
        "auth_login_rate_limit_per_minute",
        "auth_refresh_rate_limit_per_minute",
        "transactions_import_rate_limit_per_minute",
        "transactions_export_rate_limit_per_minute",
        "transactions_import_async_per_user_limit",
        "transactions_import_async_queue_limit",
        "transactions_import_async_worker_count",
        "transactions_import_async_terminal_ttl_seconds",
        "transactions_import_async_idempotency_ttl_seconds",
        "transactions_import_async_retained_terminal_cap",
        "transactions_rate_limit_window_seconds",
        "auth_rate_limit_window_seconds",
        "db_pool_recycle_seconds",
        mode="before",
    )
    @classmethod
    def _parse_positive_int_fields(cls, value: object, info: ValidationInfo) -> int:
        aliases = {
            "transaction_import_max_items": "TRANSACTION_IMPORT_MAX_ITEMS",
            "auth_register_rate_limit_per_minute": "AUTH_REGISTER_RATE_LIMIT_PER_MINUTE",
            "auth_login_rate_limit_per_minute": "AUTH_LOGIN_RATE_LIMIT_PER_MINUTE",
            "auth_refresh_rate_limit_per_minute": "AUTH_REFRESH_RATE_LIMIT_PER_MINUTE",
            "transactions_import_rate_limit_per_minute": "TRANSACTIONS_IMPORT_RATE_LIMIT_PER_MINUTE",
            "transactions_export_rate_limit_per_minute": "TRANSACTIONS_EXPORT_RATE_LIMIT_PER_MINUTE",
            "transactions_import_async_per_user_limit": "TRANSACTIONS_IMPORT_ASYNC_PER_USER_LIMIT",
            "transactions_import_async_queue_limit": "TRANSACTIONS_IMPORT_ASYNC_QUEUE_LIMIT",
            "transactions_import_async_worker_count": "TRANSACTIONS_IMPORT_ASYNC_WORKER_COUNT",
            "transactions_import_async_terminal_ttl_seconds": "TRANSACTIONS_IMPORT_ASYNC_TERMINAL_TTL_SECONDS",
            "transactions_import_async_idempotency_ttl_seconds": "TRANSACTIONS_IMPORT_ASYNC_IDEMPOTENCY_TTL_SECONDS",
            "transactions_import_async_retained_terminal_cap": "TRANSACTIONS_IMPORT_ASYNC_RETAINED_TERMINAL_CAP",
            "transactions_rate_limit_window_seconds": "TRANSACTIONS_RATE_LIMIT_WINDOW_SECONDS",
            "auth_rate_limit_window_seconds": "AUTH_RATE_LIMIT_WINDOW_SECONDS",
            "db_pool_recycle_seconds": "DB_POOL_RECYCLE_SECONDS",
        }
        return _parse_positive_int(value, aliases[info.field_name], minimum=1)

    @field_validator("auth_rate_limit_lock_seconds", mode="before")
    @classmethod
    def _parse_auth_rate_limit_lock_seconds(cls, value: object) -> int:
        return _parse_positive_int(value, "AUTH_RATE_LIMIT_LOCK_SECONDS", minimum=0)

    @field_validator("refresh_grace_period_seconds", mode="before")
    @classmethod
    def _parse_refresh_grace_period(cls, value: object) -> int:
        return _parse_bounded_int(value, "REFRESH_GRACE_PERIOD_SECONDS", minimum=0, maximum=120)

    @field_validator("transactions_import_async_shutdown_timeout_seconds", mode="before")
    @classmethod
    def _parse_import_shutdown_timeout(cls, value: object) -> float:
        return _parse_positive_float(value, "TRANSACTIONS_IMPORT_ASYNC_SHUTDOWN_TIMEOUT_SECONDS")

    @field_validator("access_token_expires_in", mode="before")
    @classmethod
    def _parse_access_token_ttl(cls, value: object) -> int:
        return int(value)

    @field_validator("refresh_token_expires_days", mode="before")
    @classmethod
    def _parse_refresh_token_expires_days(cls, value: object) -> int:
        return int(value)

    @field_validator("refresh_token_ttl_seconds", mode="before")
    @classmethod
    def _parse_refresh_token_ttl(cls, value: object) -> int | None:
        if value is None or str(value).strip() == "":
            return None
        return int(value)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: object) -> list[str]:
        parsed = _parse_csv(value, default=_DEFAULT_CORS_ORIGINS)
        return parsed or list(_DEFAULT_CORS_ORIGINS)

    @field_validator("auth_refresh_allowed_origins", mode="before")
    @classmethod
    def _parse_auth_refresh_allowed_origins(cls, value: object) -> list[str] | None:
        return _parse_csv(value, default=None)

    @field_validator("rate_limit_trusted_proxies", mode="before")
    @classmethod
    def _parse_rate_limit_trusted_proxies(cls, value: object) -> list[str]:
        parsed = _parse_csv(value, default=[])
        return parsed or []

    @model_validator(mode="after")
    def _finalize_and_validate(self) -> "Settings":
        self.database_url = self.database_url.strip()
        if not self.database_url:
            raise ValueError("DATABASE_URL must be configured")

        self.jwt_secret = self.jwt_secret.strip()
        if not self.jwt_secret or self.jwt_secret == "change-me":
            raise ValueError("JWT_SECRET must be configured and must not use the default value")

        if self.refresh_token_ttl_seconds is None:
            self.refresh_token_ttl_seconds = self.refresh_token_expires_days * 24 * 60 * 60

        self.refresh_cookie_name = self.refresh_cookie_name.strip() or "bb_refresh"
        self.refresh_cookie_path = self.refresh_cookie_path.strip() or "/api/auth"

        default_samesite = "lax" if self.runtime_env == "production" else "none"
        samesite_raw = (self.refresh_cookie_samesite or "").strip().lower()
        if samesite_raw not in {"lax", "strict", "none"}:
            samesite_raw = default_samesite
        self.refresh_cookie_samesite = samesite_raw

        domain_raw = (self.refresh_cookie_domain or "").strip()
        self.refresh_cookie_domain = domain_raw or None

        if self.migrations_strict is None:
            self.migrations_strict = self.runtime_env == "production"

        if self.auth_refresh_allowed_origins is None:
            self.auth_refresh_allowed_origins = list(self.cors_origins)

        missing_origin_raw = self.auth_refresh_missing_origin_mode
        if missing_origin_raw is None:
            self.auth_refresh_missing_origin_mode = "deny" if self.runtime_env == "production" else "allow_trusted"
        else:
            self.auth_refresh_missing_origin_mode = missing_origin_raw.strip().lower()
        if self.auth_refresh_missing_origin_mode not in {"deny", "allow_trusted"}:
            raise ValueError("AUTH_REFRESH_MISSING_ORIGIN_MODE must be one of: deny, allow_trusted")

        for value in self.rate_limit_trusted_proxies:
            try:
                ipaddress.ip_network(value, strict=False)
            except ValueError as exc:
                raise ValueError("RATE_LIMIT_TRUSTED_PROXIES must contain valid IP/CIDR entries") from exc

        self.bootstrap_demo_username = self.bootstrap_demo_username.strip() or "demo_user"
        self.bootstrap_demo_password = self.bootstrap_demo_password.strip()
        self.bootstrap_demo_currency_code = self.bootstrap_demo_currency_code.strip().upper() or "USD"
        if self.bootstrap_create_demo_user and not self.bootstrap_demo_password:
            raise ValueError("BOOTSTRAP_DEMO_PASSWORD must be configured when BOOTSTRAP_CREATE_DEMO_USER is true")
        if len(self.bootstrap_demo_currency_code) != 3:
            raise ValueError("BOOTSTRAP_DEMO_CURRENCY_CODE must be a 3-letter code")

        self.vapid_private_key = self.vapid_private_key.strip()
        self.vapid_public_key = self.vapid_public_key.strip()
        self.vapid_contact = self.vapid_contact.strip()
        self.push_test_token = self.push_test_token.strip()

        log_level_raw = self.log_level.strip().upper()
        allowed_log_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if log_level_raw not in allowed_log_levels:
            raise ValueError("LOG_LEVEL must be one of DEBUG, INFO, WARNING, ERROR, CRITICAL")
        self.log_level = log_level_raw

        if self.refresh_cookie_samesite == "none" and not self.refresh_cookie_secure:
            raise ValueError("REFRESH_COOKIE_SECURE must be true when REFRESH_COOKIE_SAMESITE is 'none'")

        if self.runtime_env == "production":
            if self.debug:
                raise ValueError("DEBUG must be false in production")
            if "*" in self.cors_origins:
                raise ValueError("BEBUDGET_CORS_ORIGINS must not contain '*' in production")
            if os.getenv("BEBUDGET_CORS_ORIGINS") is None:
                raise ValueError("BEBUDGET_CORS_ORIGINS must be explicitly configured in production")
            if not self.refresh_cookie_secure:
                raise ValueError("REFRESH_COOKIE_SECURE must be true in production")
            for var in ("REFRESH_COOKIE_NAME", "REFRESH_COOKIE_PATH", "REFRESH_COOKIE_SAMESITE", "REFRESH_COOKIE_SECURE"):
                if os.getenv(var) is None:
                    raise ValueError(f"{var} must be explicitly configured in production")
            if self.bootstrap_create_demo_user and self.bootstrap_demo_password == _DEFAULT_BOOTSTRAP_DEMO_PASSWORD:
                raise ValueError(
                    "BOOTSTRAP_DEMO_PASSWORD must be changed from default when "
                    "BOOTSTRAP_CREATE_DEMO_USER is true in production"
                )

        return self

    def safe_log_fields(self) -> dict[str, object]:
        db_scheme = self.database_url.split("://", 1)[0] if "://" in self.database_url else "unknown"
        return {
            "env": self.runtime_env,
            "debug": self.debug,
            "database_scheme": db_scheme,
            "cors_origins_count": len(self.cors_origins),
            "refresh_cookie_secure": self.refresh_cookie_secure,
            "refresh_cookie_samesite": self.refresh_cookie_samesite,
            "refresh_cookie_domain_configured": self.refresh_cookie_domain is not None,
            "refresh_grace_period_seconds": self.refresh_grace_period_seconds,
            "auth_register_rate_limit_per_minute": self.auth_register_rate_limit_per_minute,
            "migrations_strict": self.migrations_strict,
            "log_level": self.log_level,
            "auth_refresh_allowed_origins_count": len(self.auth_refresh_allowed_origins),
            "auth_refresh_missing_origin_mode": self.auth_refresh_missing_origin_mode,
            "rate_limit_trusted_proxies_count": len(self.rate_limit_trusted_proxies),
            "bootstrap_allow_prod": self.bootstrap_allow_prod,
            "bootstrap_create_demo_user": self.bootstrap_create_demo_user,
            "bootstrap_seed_minimal_data": self.bootstrap_seed_minimal_data,
            "db_pool_pre_ping": self.db_pool_pre_ping,
            "db_pool_recycle_seconds": self.db_pool_recycle_seconds,
            "transactions_import_async_terminal_ttl_seconds": self.transactions_import_async_terminal_ttl_seconds,
            "transactions_import_async_idempotency_ttl_seconds": self.transactions_import_async_idempotency_ttl_seconds,
            "transactions_import_async_retained_terminal_cap": self.transactions_import_async_retained_terminal_cap,
            "transactions_import_async_shutdown_timeout_seconds": self.transactions_import_async_shutdown_timeout_seconds,
            "vapid_configured": bool(self.vapid_private_key and self.vapid_public_key and self.vapid_contact),
            "push_test_token_configured": bool(self.push_test_token),
        }

settings = Settings()

