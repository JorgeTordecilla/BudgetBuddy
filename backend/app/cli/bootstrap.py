from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import and_, select

from app.core.config import settings
from app.core.security import hash_password
from app.db import SessionLocal
from app.models import Account, Category, User


def _backend_dir() -> Path:
    return Path(__file__).resolve().parents[2]


def run_migrations() -> None:
    cfg = Config(str(_backend_dir() / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(cfg, "head")


def _ensure_demo_user(log_fn) -> User:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == settings.bootstrap_demo_username))
        if user:
            log_fn("bootstrap phase=demo_user status=exists")
            return user
        if not settings.bootstrap_create_demo_user:
            raise RuntimeError("Demo user not found and BOOTSTRAP_CREATE_DEMO_USER is false")
        user = User(
            username=settings.bootstrap_demo_username,
            password_hash=hash_password(settings.bootstrap_demo_password),
            currency_code=settings.bootstrap_demo_currency_code,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_fn("bootstrap phase=demo_user status=created")
        return user


def _ensure_minimal_seed(user: User, log_fn) -> None:
    with SessionLocal() as db:
        account = db.scalar(
            select(Account).where(
                and_(
                    Account.user_id == user.id,
                    Account.name == "Demo Cash",
                )
            )
        )
        if account is None:
            db.add(
                Account(
                    user_id=user.id,
                    name="Demo Cash",
                    type="cash",
                    initial_balance_cents=0,
                    note="Bootstrap account",
                )
            )
        for category_name, category_type, note in (
            ("Salary", "income", "Bootstrap income category"),
            ("Groceries", "expense", "Bootstrap expense category"),
        ):
            category = db.scalar(
                select(Category).where(
                    and_(
                        Category.user_id == user.id,
                        Category.name == category_name,
                        Category.type == category_type,
                    )
                )
            )
            if category is None:
                db.add(
                    Category(
                        user_id=user.id,
                        name=category_name,
                        type=category_type,
                        note=note,
                    )
                )
        db.commit()
    log_fn("bootstrap phase=minimal_seed status=done")


def run_bootstrap(*, log_fn=print) -> None:
    if settings.runtime_env == "production" and not settings.bootstrap_allow_prod:
        raise RuntimeError("Bootstrap is disabled in production unless BOOTSTRAP_ALLOW_PROD=true")

    log_fn("bootstrap phase=migrations status=started")
    run_migrations()
    log_fn("bootstrap phase=migrations status=done")

    if not settings.bootstrap_create_demo_user and not settings.bootstrap_seed_minimal_data:
        log_fn("bootstrap phase=seed status=skipped")
        return

    user = _ensure_demo_user(log_fn)
    if settings.bootstrap_seed_minimal_data:
        _ensure_minimal_seed(user, log_fn)
    else:
        log_fn("bootstrap phase=minimal_seed status=skipped")


def main() -> int:
    try:
        run_bootstrap()
        return 0
    except Exception as exc:
        print(f"bootstrap status=error detail={exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
