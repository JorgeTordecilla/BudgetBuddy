import os
from pathlib import Path

import pytest


TEST_DB_PATH = Path(__file__).resolve().parent / "budgetbuddy_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["JWT_SECRET"] = "test-jwt-secret"


@pytest.fixture(autouse=True)
def reset_test_database():
    # Import lazily so DATABASE_URL is set before app modules are loaded.
    from app.db import Base, engine

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def reset_rate_limit_state(monkeypatch):
    # Keep production defaults in runtime code, but avoid unrelated test interference
    # from process-global in-memory buckets and low register thresholds.
    import app.routers.auth as auth_router
    import app.routers.transactions as transactions_router
    from app.core.rate_limit import InMemoryRateLimiter

    monkeypatch.setattr(auth_router, "_AUTH_RATE_LIMITER", InMemoryRateLimiter())
    monkeypatch.setattr(transactions_router, "_TRANSACTION_RATE_LIMITER", InMemoryRateLimiter())
    monkeypatch.setattr(auth_router.settings, "auth_register_rate_limit_per_minute", 1000)
    yield
