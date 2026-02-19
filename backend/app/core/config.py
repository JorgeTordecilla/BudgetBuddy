import os


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    database_url: str
    jwt_secret: str
    access_token_expires_in: int
    refresh_token_expires_days: int
    transaction_import_max_items: int
    auth_login_rate_limit_per_minute: int
    auth_refresh_rate_limit_per_minute: int
    auth_rate_limit_window_seconds: int
    auth_rate_limit_lock_enabled: bool
    auth_rate_limit_lock_seconds: int

    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./budgetbuddy.db")
        self.jwt_secret = os.getenv("JWT_SECRET", "").strip()
        if not self.jwt_secret or self.jwt_secret == "change-me":
            raise ValueError("JWT_SECRET must be configured and must not use the default value")
        self.access_token_expires_in = int(os.getenv("ACCESS_TOKEN_EXPIRES_IN", "900"))
        self.refresh_token_expires_days = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "30"))
        self.transaction_import_max_items = int(os.getenv("TRANSACTION_IMPORT_MAX_ITEMS", "500"))
        self.auth_login_rate_limit_per_minute = int(os.getenv("AUTH_LOGIN_RATE_LIMIT_PER_MINUTE", "10"))
        self.auth_refresh_rate_limit_per_minute = int(os.getenv("AUTH_REFRESH_RATE_LIMIT_PER_MINUTE", "30"))
        self.auth_rate_limit_window_seconds = int(os.getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "60"))
        self.auth_rate_limit_lock_enabled = _env_bool("AUTH_RATE_LIMIT_LOCK_ENABLED", False)
        self.auth_rate_limit_lock_seconds = int(os.getenv("AUTH_RATE_LIMIT_LOCK_SECONDS", "300"))


settings = Settings()
