from datetime import date, datetime

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models import Account, Budget, Category, RefreshToken, Transaction, User


class SQLAlchemyUserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.scalar(select(User).where(User.id == user_id))

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(select(User).where(User.username == username))

    def add(self, user: User) -> None:
        self.db.add(user)


class SQLAlchemyRefreshTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self.db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    def add(self, refresh_token: RefreshToken) -> None:
        self.db.add(refresh_token)

    def has_newer_token(self, user_id: str, created_after: datetime) -> bool:
        stmt = select(RefreshToken.id).where(RefreshToken.user_id == user_id, RefreshToken.created_at > created_after).limit(1)
        return self.db.scalar(stmt) is not None

    def list_active_by_user(self, user_id: str) -> list[RefreshToken]:
        stmt = select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        return list(self.db.scalars(stmt))


class SQLAlchemyAccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_owned(self, user_id: str, account_id: str) -> Account | None:
        return self.db.scalar(select(Account).where(and_(Account.id == account_id, Account.user_id == user_id)))

    def list_for_user(self, user_id: str, include_archived: bool) -> list[Account]:
        stmt = select(Account).where(Account.user_id == user_id)
        if not include_archived:
            stmt = stmt.where(Account.archived_at.is_(None))
        return list(self.db.scalars(stmt))

    def add(self, account: Account) -> None:
        self.db.add(account)


class SQLAlchemyCategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_owned(self, user_id: str, category_id: str) -> Category | None:
        return self.db.scalar(select(Category).where(and_(Category.id == category_id, Category.user_id == user_id)))

    def list_for_user(self, user_id: str, include_archived: bool, category_type: str | None) -> list[Category]:
        stmt = select(Category).where(Category.user_id == user_id)
        if not include_archived:
            stmt = stmt.where(Category.archived_at.is_(None))
        if category_type:
            stmt = stmt.where(Category.type == category_type)
        return list(self.db.scalars(stmt))

    def add(self, category: Category) -> None:
        self.db.add(category)


class SQLAlchemyTransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_owned(self, user_id: str, transaction_id: str) -> Transaction | None:
        return self.db.scalar(select(Transaction).where(and_(Transaction.id == transaction_id, Transaction.user_id == user_id)))

    def list_for_user(
        self,
        user_id: str,
        include_archived: bool,
        tx_type: str | None,
        account_id: str | None,
        category_id: str | None,
        from_date: date | None,
        to_date: date | None,
    ) -> list[Transaction]:
        stmt = select(Transaction).where(Transaction.user_id == user_id)
        if not include_archived:
            stmt = stmt.where(Transaction.archived_at.is_(None))
        if tx_type:
            stmt = stmt.where(Transaction.type == tx_type)
        if account_id:
            stmt = stmt.where(Transaction.account_id == account_id)
        if category_id:
            stmt = stmt.where(Transaction.category_id == category_id)
        if from_date:
            stmt = stmt.where(Transaction.date >= from_date)
        if to_date:
            stmt = stmt.where(Transaction.date <= to_date)
        return list(self.db.scalars(stmt))

    def add(self, transaction: Transaction) -> None:
        self.db.add(transaction)


class SQLAlchemyBudgetRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_owned(self, user_id: str, budget_id: str) -> Budget | None:
        return self.db.scalar(select(Budget).where(and_(Budget.id == budget_id, Budget.user_id == user_id)))

    def list_for_user_month_range(self, user_id: str, from_month: str, to_month: str) -> list[Budget]:
        stmt = (
            select(Budget)
            .where(Budget.user_id == user_id)
            .where(Budget.archived_at.is_(None))
            .where(Budget.month >= from_month)
            .where(Budget.month <= to_month)
            .order_by(Budget.month.asc(), Budget.created_at.desc(), Budget.id.desc())
        )
        return list(self.db.scalars(stmt))

    def add(self, budget: Budget) -> None:
        self.db.add(budget)
