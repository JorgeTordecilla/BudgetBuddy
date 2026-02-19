import os


class Settings:
    database_url: str
    jwt_secret: str
    access_token_expires_in: int
    refresh_token_expires_days: int

    def __init__(self) -> None:
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./budgetbuddy.db")
        self.jwt_secret = os.getenv("JWT_SECRET", "").strip()
        if not self.jwt_secret or self.jwt_secret == "change-me":
            raise ValueError("JWT_SECRET must be configured and must not use the default value")
        self.access_token_expires_in = int(os.getenv("ACCESS_TOKEN_EXPIRES_IN", "900"))
        self.refresh_token_expires_days = int(os.getenv("REFRESH_TOKEN_EXPIRES_DAYS", "30"))


settings = Settings()
