import os


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_csv_list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if raw is None:
        return list(default)
    values = [item.strip() for item in raw.split(",")]
    parsed = [item for item in values if item]
    return parsed or list(default)


class Settings:
    database_url: str
    jwt_secret: str
    runtime_env: str
    debug: bool
    access_token_expires_in: int
    refresh_token_expires_days: int
    refresh_token_ttl_seconds: int
    refresh_cookie_name: str
    refresh_cookie_path: str
    refresh_cookie_secure: bool
    refresh_cookie_samesite: str
    refresh_cookie_domain: str | None
    transaction_import_max_items: int
    auth_login_rate_limit_per_minute: int
    auth_refresh_rate_limit_per_minute: int
    auth_rate_limit_window_seconds: int
    auth_rate_limit_lock_enabled: bool
    auth_rate_limit_lock_seconds: int
    migrations_strict: bool
    cors_origins: list[str]
    log_level: str
    auth_refresh_allowed_origins: list[str]
    auth_refresh_missing_origin_mode: str

    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "").strip()
        if not self.database_url:
            raise ValueError("DATABASE_URL must be configured")

        self.jwt_secret = os.getenv("JWT_SECRET", "").strip()
        if not self.jwt_secret or self.jwt_secret == "change-me":
            raise ValueError("JWT_SECRET must be configured and must not use the default value")

        env_raw = (os.getenv("ENV", os.getenv("APP_ENV", "development")) or "development").strip().lower()
        self.runtime_env = env_raw or "development"
        self.debug = _env_bool("DEBUG", False)

        self.access_token_expires_in = int(os.getenv("ACCESS_TOKEN_EXPIRES_IN", "900"))
        self.refresh_token_expires_days = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "30"))
        default_refresh_ttl = str(self.refresh_token_expires_days * 24 * 60 * 60)
        self.refresh_token_ttl_seconds = int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", default_refresh_ttl))
        self.refresh_cookie_name = os.getenv("REFRESH_COOKIE_NAME", "bb_refresh").strip() or "bb_refresh"
        self.refresh_cookie_path = os.getenv("REFRESH_COOKIE_PATH", "/api/auth").strip() or "/api/auth"
        self.refresh_cookie_secure = _env_bool("REFRESH_COOKIE_SECURE", True)
        samesite_raw = os.getenv("REFRESH_COOKIE_SAMESITE", "none").strip().lower()
        self.refresh_cookie_samesite = samesite_raw if samesite_raw in {"lax", "strict", "none"} else "none"
        domain_raw = os.getenv("REFRESH_COOKIE_DOMAIN", "").strip()
        self.refresh_cookie_domain = domain_raw or None
        self.transaction_import_max_items = int(os.getenv("TRANSACTION_IMPORT_MAX_ITEMS", "500"))
        self.auth_login_rate_limit_per_minute = int(os.getenv("AUTH_LOGIN_RATE_LIMIT_PER_MINUTE", "10"))
        self.auth_refresh_rate_limit_per_minute = int(os.getenv("AUTH_REFRESH_RATE_LIMIT_PER_MINUTE", "30"))
        self.auth_rate_limit_window_seconds = int(os.getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "60"))
        self.auth_rate_limit_lock_enabled = _env_bool("AUTH_RATE_LIMIT_LOCK_ENABLED", False)
        self.auth_rate_limit_lock_seconds = int(os.getenv("AUTH_RATE_LIMIT_LOCK_SECONDS", "300"))
        migrations_strict_raw = os.getenv("MIGRATIONS_STRICT")
        if migrations_strict_raw is None:
            self.migrations_strict = self.runtime_env == "production"
        else:
            self.migrations_strict = _env_bool("MIGRATIONS_STRICT", self.runtime_env == "production")
        self.cors_origins = _env_csv_list("BUDGETBUDDY_CORS_ORIGINS", ["http://localhost:5173"])
        self.auth_refresh_allowed_origins = _env_csv_list("AUTH_REFRESH_ALLOWED_ORIGINS", self.cors_origins)
        missing_origin_raw = os.getenv("AUTH_REFRESH_MISSING_ORIGIN_MODE")
        if missing_origin_raw is None:
            self.auth_refresh_missing_origin_mode = "deny" if self.runtime_env == "production" else "allow_trusted"
        else:
            self.auth_refresh_missing_origin_mode = missing_origin_raw.strip().lower()
        if self.auth_refresh_missing_origin_mode not in {"deny", "allow_trusted"}:
            raise ValueError("AUTH_REFRESH_MISSING_ORIGIN_MODE must be one of: deny, allow_trusted")
        log_level_raw = os.getenv("LOG_LEVEL", "INFO").strip().upper()
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
                raise ValueError("BUDGETBUDDY_CORS_ORIGINS must not contain '*' in production")
            if os.getenv("BUDGETBUDDY_CORS_ORIGINS") is None:
                raise ValueError("BUDGETBUDDY_CORS_ORIGINS must be explicitly configured in production")
            if not self.refresh_cookie_secure:
                raise ValueError("REFRESH_COOKIE_SECURE must be true in production")
            for var in ("REFRESH_COOKIE_NAME", "REFRESH_COOKIE_PATH", "REFRESH_COOKIE_SAMESITE", "REFRESH_COOKIE_SECURE"):
                if os.getenv(var) is None:
                    raise ValueError(f"{var} must be explicitly configured in production")

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
            "migrations_strict": self.migrations_strict,
            "log_level": self.log_level,
            "auth_refresh_allowed_origins_count": len(self.auth_refresh_allowed_origins),
            "auth_refresh_missing_origin_mode": self.auth_refresh_missing_origin_mode,
        }


settings = Settings()
