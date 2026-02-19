from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit import emit_audit_event
from app.core.errors import APIError
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.errors import forbidden_error
from app.models import Category, User
from app.repositories import SQLAlchemyCategoryRepository
from app.routers._crud_common import apply_created_cursor, build_created_cursor_page, commit_or_conflict
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


def _owned_category_or_403(db: Session, user_id: str, category_id: str) -> Category:
    category = SQLAlchemyCategoryRepository(db).get_owned(user_id, category_id)
    if not category:
        raise forbidden_error("Not allowed")
    return category


@router.get("")
def list_categories(
    include_archived: bool = Query(default=False),
    type: Literal["income", "expense"] | None = Query(default=None),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Category).where(Category.user_id == current_user.id)
    if not include_archived:
        stmt = stmt.where(Category.archived_at.is_(None))
    if type:
        stmt = stmt.where(Category.type == type)
    if cursor:
        stmt = apply_created_cursor(stmt, cursor, Category)

    stmt = stmt.order_by(Category.created_at.desc(), Category.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    items, next_cursor = build_created_cursor_page(rows, limit)

    payload = {
        "items": [CategoryOut.model_validate(item).model_dump(mode="json") for item in items],
        "next_cursor": next_cursor,
    }
    return vendor_response(payload)


@router.post("")
def create_category(
    payload: CategoryCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = SQLAlchemyCategoryRepository(db)
    row = Category(user_id=current_user.id, **payload.model_dump())
    repo.add(row)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail="Category name already exists for this type") from exc
    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="category",
        resource_id=row.id,
        action="category.create",
    )
    db.commit()
    db.refresh(row)
    return vendor_response(CategoryOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.get("/{category_id}")
def get_category(category_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_category_or_403(db, current_user.id, str(category_id))
    return vendor_response(CategoryOut.model_validate(row).model_dump(mode="json"))


@router.patch("/{category_id}")
def patch_category(
    category_id: UUID,
    payload: CategoryUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _owned_category_or_403(db, current_user.id, str(category_id))
    previous_archived_at = row.archived_at
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    row.updated_at = utcnow()
    action = "category.restore" if previous_archived_at is not None and row.archived_at is None else "category.update"
    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="category",
        resource_id=row.id,
        action=action,
    )
    commit_or_conflict(db, "Category name already exists for this type")
    db.refresh(row)
    return vendor_response(CategoryOut.model_validate(row).model_dump(mode="json"))


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _owned_category_or_403(db, current_user.id, str(category_id))
    now = utcnow()
    row.archived_at = now
    row.updated_at = now
    emit_audit_event(
        db,
        request=request,
        user_id=current_user.id,
        resource_type="category",
        resource_id=row.id,
        action="category.archive",
        created_at=now,
    )
    db.commit()
    return Response(status_code=204)
