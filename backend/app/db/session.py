from collections.abc import Generator
from pathlib import Path

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _build_engine():
    is_sqlite = settings.database_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {}
    engine_kwargs: dict[str, object] = {
        "future": True,
        "connect_args": connect_args,
    }
    if not is_sqlite:
        engine_kwargs["pool_pre_ping"] = settings.db_pool_pre_ping
        engine_kwargs["pool_recycle"] = settings.db_pool_recycle_seconds
    return create_engine(settings.database_url, **engine_kwargs)


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_database_ready() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def get_migration_revision_state() -> tuple[str, str | None, str | None]:
    """Return (schema_status, db_revision, head_revision)."""
    try:
        backend_dir = Path(__file__).resolve().parents[2]
        alembic_ini = backend_dir / "alembic.ini"

        config = Config(str(alembic_ini))
        config.set_main_option("sqlalchemy.url", settings.database_url)
        script = ScriptDirectory.from_config(config)
        heads = script.get_heads()
        head_revision = heads[0] if len(heads) == 1 else ",".join(sorted(heads)) if heads else None

        with engine.connect() as conn:
            db_revision = MigrationContext.configure(conn).get_current_revision()
    except Exception:
        return "unknown", None, None

    if not db_revision or not head_revision:
        return "unknown", db_revision, head_revision
    if db_revision == head_revision:
        return "ok", db_revision, head_revision
    return "fail", db_revision, head_revision
