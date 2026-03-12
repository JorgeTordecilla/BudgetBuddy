from fastapi import Request
from sqlalchemy.orm import Session

from app.core.audit import emit_audit_event
from app.core.errors import APIError, sanitize_problem_detail
from app.models import Transaction, User
from app.schemas import (
    TransactionImportFailure,
    TransactionImportRequest,
    TransactionImportResult,
)
from app.transactions.validation import (
    validate_business_rules,
    validate_money_rules,
    validate_transaction_mood,
)


def build_import_failure(index: int, exc: Exception) -> TransactionImportFailure:
    if isinstance(exc, APIError):
        return TransactionImportFailure(
            index=index,
            message=sanitize_problem_detail(exc.detail) or exc.title,
            problem={"type": exc.type_, "title": exc.title, "status": exc.status},
        )
    return TransactionImportFailure(index=index, message="Import row failed validation")


def execute_import_payload(
    *,
    payload: TransactionImportRequest,
    current_user: User,
    db: Session,
    request: Request | None,
) -> TransactionImportResult:
    mode = payload.mode
    failures: list[TransactionImportFailure] = []
    rows_to_insert: list[Transaction] = []

    for index, item in enumerate(payload.items):
        try:
            data = item.model_dump()
            validate_transaction_mood(data)
            data["amount_cents"] = validate_money_rules(current_user, data["type"], data["amount_cents"])
            validate_business_rules(db, current_user.id, data)
            rows_to_insert.append(Transaction(user_id=current_user.id, **data))
        except Exception as exc:
            failures.append(build_import_failure(index, exc))

    if mode == "all_or_nothing" and failures:
        return TransactionImportResult(created_count=0, failed_count=len(failures), failures=failures)

    for row in rows_to_insert:
        db.add(row)
    if rows_to_insert:
        db.flush()
        for row in rows_to_insert:
            emit_audit_event(
                db,
                request=request,
                user_id=current_user.id,
                resource_type="transaction",
                resource_id=row.id,
                action="transaction.create",
            )
        db.commit()

    return TransactionImportResult(
        created_count=len(rows_to_insert),
        failed_count=len(failures),
        failures=failures,
    )

