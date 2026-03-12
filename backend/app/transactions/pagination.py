from datetime import date
from uuid import UUID

from sqlalchemy import and_, or_

from app.core.pagination import decode_cursor, encode_cursor, parse_date, parse_datetime
from app.errors import invalid_cursor_error
from app.models import Transaction
from app.models.enums import TransactionType


def apply_list_filters(
    stmt,
    *,
    include_archived: bool,
    type: TransactionType | None,
    account_id: UUID | None,
    category_id: UUID | None,
    from_: date | None,
    to: date | None,
):
    if not include_archived:
        stmt = stmt.where(Transaction.archived_at.is_(None))
    if type:
        stmt = stmt.where(Transaction.type == type)
    if account_id:
        stmt = stmt.where(Transaction.account_id == str(account_id))
    if category_id:
        stmt = stmt.where(Transaction.category_id == str(category_id))
    if from_:
        stmt = stmt.where(Transaction.date >= from_)
    if to:
        stmt = stmt.where(Transaction.date <= to)
    return stmt


def apply_cursor(stmt, cursor: str):
    data = decode_cursor(cursor)
    c_date_raw = data.get("date")
    c_created_at_raw = data.get("created_at")
    c_id = data.get("id")

    if not isinstance(c_date_raw, str) or not isinstance(c_id, str):
        raise invalid_cursor_error()

    c_date = parse_date(c_date_raw)

    if c_created_at_raw is not None:
        if not isinstance(c_created_at_raw, str):
            raise invalid_cursor_error()
        c_created_at = parse_datetime(c_created_at_raw)
        return stmt.where(
            or_(
                Transaction.date < c_date,
                and_(
                    Transaction.date == c_date,
                    or_(
                        Transaction.created_at < c_created_at,
                        and_(Transaction.created_at == c_created_at, Transaction.id < c_id),
                    ),
                ),
            )
        )

    return stmt.where(or_(Transaction.date < c_date, and_(Transaction.date == c_date, Transaction.id < c_id)))


def build_page(rows: list[Transaction], limit: int) -> tuple[list[Transaction], str | None]:
    items = rows[:limit]
    if len(rows) <= limit:
        return items, None
    last = items[-1]
    next_cursor = encode_cursor({"date": last.date.isoformat(), "created_at": last.created_at.isoformat(), "id": last.id})
    return items, next_cursor

