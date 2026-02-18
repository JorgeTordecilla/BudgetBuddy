import os
from pathlib import Path

import pytest


TEST_DB_PATH = Path(__file__).resolve().parent / "budgetbuddy_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"


@pytest.fixture(autouse=True)
def reset_test_database():
    # Import lazily so DATABASE_URL is set before app modules are loaded.
    from app.db import Base, engine

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
