from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.responses import vendor_response
from app.db import get_db
from app.core.utils import utcnow
from app.dependencies import get_current_user
from app.errors import (
    account_archived_error,
    category_archived_error,
    forbidden_error,
    not_found_error,
    savings_contribution_invalid_amount_error,
    savings_goal_already_completed_error,
    savings_goal_category_type_mismatch_error,
    savings_goal_deadline_past_error,
    savings_goal_invalid_target_error,
    savings_goal_not_active_error,
)
from app.models import Account, Category, SavingsContribution, SavingsGoal, Transaction, User
from app.schemas import (
    SavingsContributionCreate,
    SavingsContributionOut,
    SavingsGoalCreate,
    SavingsGoalDetailOut,
    SavingsGoalListOut,
    SavingsGoalOut,
    SavingsGoalUpdate,
    SavingsSummaryOut,
)

router = APIRouter(prefix="/savings-goals", tags=["savings-goals"])


def _validate_target_or_422(target_cents: int) -> int:
    if target_cents <= 0:
        raise savings_goal_invalid_target_error()
    return target_cents


def _validate_amount_or_422(amount_cents: int) -> int:
    if amount_cents <= 0:
        raise savings_contribution_invalid_amount_error()
    return amount_cents


def _validate_deadline_or_422(deadline: date | None) -> date | None:
    if deadline is not None and deadline < utcnow().date():
        raise savings_goal_deadline_past_error()
    return deadline


def _owned_goal_or_403(db: Session, user_id: str, goal_id: str) -> SavingsGoal:
    row = db.scalar(select(SavingsGoal).where(SavingsGoal.id == goal_id).where(SavingsGoal.user_id == user_id))
    if not row:
        raise forbidden_error("Not allowed")
    return row


def _owned_account_or_403(db: Session, user_id: str, account_id: str) -> Account:
    row = db.scalar(select(Account).where(Account.id == account_id).where(Account.user_id == user_id))
    if not row:
        raise forbidden_error("Not allowed")
    if row.archived_at is not None:
        raise account_archived_error()
    return row


def _owned_expense_category_or_error(db: Session, user_id: str, category_id: str) -> Category:
    row = db.scalar(select(Category).where(Category.id == category_id).where(Category.user_id == user_id))
    if not row:
        raise forbidden_error("Not allowed")
    if row.archived_at is not None:
        raise category_archived_error()
    if row.type != "expense":
        raise savings_goal_category_type_mismatch_error()
    return row


def _saved_by_goal_ids(db: Session, user_id: str, goal_ids: list[str]) -> dict[str, int]:
    if not goal_ids:
        return {}
    rows = db.execute(
        select(SavingsContribution.goal_id, func.coalesce(func.sum(SavingsContribution.amount_cents), 0))
        .where(SavingsContribution.user_id == user_id)
        .where(SavingsContribution.goal_id.in_(goal_ids))
        .group_by(SavingsContribution.goal_id)
    ).all()
    return {goal_id: int(saved_cents) for goal_id, saved_cents in rows}


def _goal_out(goal: SavingsGoal, saved_cents: int) -> SavingsGoalOut:
    remaining_cents = goal.target_cents - saved_cents
    progress_pct = round((saved_cents / goal.target_cents) * 100, 1) if goal.target_cents > 0 else 0.0
    payload = {
        "id": goal.id,
        "name": goal.name,
        "target_cents": goal.target_cents,
        "account_id": goal.account_id,
        "category_id": goal.category_id,
        "deadline": goal.deadline,
        "note": goal.note,
        "status": goal.status,
        "archived_at": goal.archived_at,
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
        "saved_cents": saved_cents,
        "remaining_cents": remaining_cents,
        "progress_pct": progress_pct,
    }
    return SavingsGoalOut.model_validate(payload)


@router.post("")
def create_savings_goal(payload: SavingsGoalCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["target_cents"] = _validate_target_or_422(data["target_cents"])
    data["deadline"] = _validate_deadline_or_422(data.get("deadline"))
    _owned_account_or_403(db, current_user.id, data["account_id"])
    _owned_expense_category_or_error(db, current_user.id, data["category_id"])

    row = SavingsGoal(user_id=current_user.id, status="active", **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    out = _goal_out(row, saved_cents=0)
    return vendor_response(out.model_dump(mode="json"), status_code=201)


@router.get("")
def list_savings_goals(
    status: str = Query(default="active", pattern=r"^(active|completed|cancelled|all)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(SavingsGoal).where(SavingsGoal.user_id == current_user.id).where(SavingsGoal.archived_at.is_(None))
    if status != "all":
        stmt = stmt.where(SavingsGoal.status == status)
    goals = list(db.scalars(stmt.order_by(SavingsGoal.created_at.desc())))
    goal_ids = [goal.id for goal in goals]
    saved_by_goal = _saved_by_goal_ids(db, current_user.id, goal_ids)
    items = [_goal_out(goal, saved_by_goal.get(goal.id, 0)) for goal in goals]
    return vendor_response(SavingsGoalListOut(items=items).model_dump(mode="json"))


@router.get("/summary")
def savings_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = list(
        db.scalars(
            select(SavingsGoal)
            .where(SavingsGoal.user_id == current_user.id)
            .where(SavingsGoal.archived_at.is_(None))
        )
    )
    goal_ids = [goal.id for goal in goals]
    saved_by_goal = _saved_by_goal_ids(db, current_user.id, goal_ids)

    active_count = sum(1 for goal in goals if goal.status == "active")
    completed_count = sum(1 for goal in goals if goal.status == "completed")
    total_target_cents = sum(goal.target_cents for goal in goals)
    total_saved_cents = sum(saved_by_goal.get(goal.id, 0) for goal in goals)
    total_remaining_cents = total_target_cents - total_saved_cents
    overall_progress_pct = round((total_saved_cents / total_target_cents) * 100, 1) if total_target_cents > 0 else 0.0

    out = SavingsSummaryOut(
        active_count=active_count,
        completed_count=completed_count,
        total_target_cents=total_target_cents,
        total_saved_cents=total_saved_cents,
        total_remaining_cents=total_remaining_cents,
        overall_progress_pct=overall_progress_pct,
    )
    return vendor_response(out.model_dump(mode="json"))


@router.get("/{goal_id}")
def get_savings_goal(goal_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = _owned_goal_or_403(db, current_user.id, str(goal_id))
    saved_cents = _saved_by_goal_ids(db, current_user.id, [goal.id]).get(goal.id, 0)
    contributions = list(
        db.scalars(
            select(SavingsContribution)
            .where(SavingsContribution.goal_id == goal.id)
            .where(SavingsContribution.user_id == current_user.id)
            .order_by(SavingsContribution.contributed_at.desc())
            .limit(10)
        )
    )
    goal_out = _goal_out(goal, saved_cents)
    detail = SavingsGoalDetailOut.model_validate(
        {
            **goal_out.model_dump(mode="json"),
            "contributions": [SavingsContributionOut.model_validate(item).model_dump(mode="json") for item in contributions],
        }
    )
    return vendor_response(detail.model_dump(mode="json"))


@router.patch("/{goal_id}")
def patch_savings_goal(
    goal_id: UUID,
    payload: SavingsGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _owned_goal_or_403(db, current_user.id, str(goal_id))
    data = payload.model_dump(exclude_unset=True)

    if "target_cents" in data:
        data["target_cents"] = _validate_target_or_422(data["target_cents"])
    if "deadline" in data:
        data["deadline"] = _validate_deadline_or_422(data["deadline"])
    if "account_id" in data:
        _owned_account_or_403(db, current_user.id, data["account_id"])
    if "category_id" in data:
        _owned_expense_category_or_error(db, current_user.id, data["category_id"])

    for key, value in data.items():
        setattr(goal, key, value)

    saved_cents = _saved_by_goal_ids(db, current_user.id, [goal.id]).get(goal.id, 0)
    if goal.status == "active" and saved_cents >= goal.target_cents:
        goal.status = "completed"
    goal.updated_at = utcnow()

    db.commit()
    db.refresh(goal)
    out = _goal_out(goal, saved_cents)
    return vendor_response(out.model_dump(mode="json"))


@router.post("/{goal_id}/complete")
def complete_savings_goal(goal_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = _owned_goal_or_403(db, current_user.id, str(goal_id))
    if goal.status == "cancelled":
        raise savings_goal_not_active_error()
    if goal.status != "completed":
        goal.status = "completed"
        goal.updated_at = utcnow()
        db.commit()
        db.refresh(goal)

    saved_cents = _saved_by_goal_ids(db, current_user.id, [goal.id]).get(goal.id, 0)
    out = _goal_out(goal, saved_cents)
    return vendor_response(out.model_dump(mode="json"))


@router.post("/{goal_id}/cancel")
def cancel_savings_goal(goal_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = _owned_goal_or_403(db, current_user.id, str(goal_id))
    if goal.status == "completed":
        raise savings_goal_already_completed_error()
    if goal.status != "cancelled":
        goal.status = "cancelled"
        goal.updated_at = utcnow()
        db.commit()
        db.refresh(goal)

    saved_cents = _saved_by_goal_ids(db, current_user.id, [goal.id]).get(goal.id, 0)
    out = _goal_out(goal, saved_cents)
    return vendor_response(out.model_dump(mode="json"))


@router.delete("/{goal_id}", status_code=204)
def delete_savings_goal(goal_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = _owned_goal_or_403(db, current_user.id, str(goal_id))
    now = utcnow()
    goal.archived_at = now
    goal.updated_at = now
    db.commit()
    return Response(status_code=204)


@router.post("/{goal_id}/contributions")
def create_savings_contribution(
    goal_id: UUID,
    payload: SavingsContributionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _owned_goal_or_403(db, current_user.id, str(goal_id))
    if goal.archived_at is not None:
        raise forbidden_error("Not allowed")
    if goal.status != "active":
        raise savings_goal_not_active_error()

    amount_cents = _validate_amount_or_422(payload.amount_cents)

    transaction = Transaction(
        user_id=current_user.id,
        type="expense",
        account_id=goal.account_id,
        category_id=goal.category_id,
        amount_cents=amount_cents,
        date=utcnow().date(),
        merchant=goal.name,
        note=f"Savings contribution - {goal.name}",
    )
    db.add(transaction)
    db.flush()

    contribution = SavingsContribution(
        goal_id=goal.id,
        user_id=current_user.id,
        amount_cents=amount_cents,
        transaction_id=transaction.id,
        note=payload.note,
        contributed_at=utcnow(),
    )
    db.add(contribution)

    saved_after = _saved_by_goal_ids(db, current_user.id, [goal.id]).get(goal.id, 0) + amount_cents
    if saved_after >= goal.target_cents:
        goal.status = "completed"
        goal.updated_at = utcnow()

    db.commit()
    db.refresh(contribution)
    return vendor_response(SavingsContributionOut.model_validate(contribution).model_dump(mode="json"), status_code=201)


@router.delete("/{goal_id}/contributions/{contribution_id}", status_code=204)
def delete_savings_contribution(
    goal_id: UUID,
    contribution_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _owned_goal_or_403(db, current_user.id, str(goal_id))
    if goal.archived_at is not None:
        raise forbidden_error("Not allowed")

    contribution = db.scalar(
        select(SavingsContribution)
        .where(SavingsContribution.id == str(contribution_id))
        .where(SavingsContribution.goal_id == goal.id)
        .where(SavingsContribution.user_id == current_user.id)
    )
    if not contribution:
        raise not_found_error("Contribution not found for the selected goal.")

    transaction = db.scalar(
        select(Transaction)
        .where(Transaction.id == contribution.transaction_id)
        .where(Transaction.user_id == current_user.id)
    )

    db.delete(contribution)
    if transaction:
        db.delete(transaction)
    db.flush()

    saved_after = _saved_by_goal_ids(db, current_user.id, [goal.id]).get(goal.id, 0)
    if goal.status == "completed" and saved_after < goal.target_cents:
        goal.status = "active"
        goal.updated_at = utcnow()

    db.commit()
    return Response(status_code=204)
