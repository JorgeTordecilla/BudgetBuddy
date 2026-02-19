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
    cors_origins: list[str]

    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./budgetbuddy.db")
        self.jwt_secret = os.getenv("JWT_SECRET", "").strip()
        if not self.jwt_secret or self.jwt_secret == "change-me":
            raise ValueError("JWT_SECRET must be configured and must not use the default value")
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
        self.cors_origins = _env_csv_list("BUDGETBUDDY_CORS_ORIGINS", ["http://localhost:5173"])
        if "*" in self.cors_origins:
            raise ValueError("BUDGETBUDDY_CORS_ORIGINS must not contain '*' when credentials are enabled")


settings = Settings()
