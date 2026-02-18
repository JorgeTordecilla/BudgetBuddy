from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.pagination import decode_cursor, encode_cursor, parse_datetime
from app.core.responses import vendor_response
from app.db import get_db
from app.dependencies import get_current_user, utcnow
from app.models import Category, User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


def _owned_category_or_403(db: Session, user_id: str, category_id: str) -> Category:
    category = db.scalar(select(Category).where(and_(Category.id == category_id, Category.user_id == user_id)))
    if not category:
        raise APIError(status=403, title="Forbidden", detail="Not allowed")
    return category


@router.get("")
def list_categories(
    include_archived: bool = Query(default=False),
    type: str | None = Query(default=None),
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
        data = decode_cursor(cursor)
        c_created = parse_datetime(data["created_at"])
        c_id = data["id"]
        stmt = stmt.where(or_(Category.created_at < c_created, and_(Category.created_at == c_created, Category.id < c_id)))

    stmt = stmt.order_by(Category.created_at.desc(), Category.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = None
    if has_more:
        last = items[-1]
        next_cursor = encode_cursor({"created_at": last.created_at.isoformat(), "id": last.id})

    payload = {
        "items": [CategoryOut.model_validate(item).model_dump(mode="json") for item in items],
        "next_cursor": next_cursor,
    }
    return vendor_response(payload)


@router.post("")
def create_category(payload: CategoryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = Category(user_id=current_user.id, **payload.model_dump())
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail="Category name already exists for this type") from exc
    db.refresh(row)
    return vendor_response(CategoryOut.model_validate(row).model_dump(mode="json"), status_code=201)


@router.get("/{category_id}")
def get_category(category_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_category_or_403(db, current_user.id, category_id)
    return vendor_response(CategoryOut.model_validate(row).model_dump(mode="json"))


@router.patch("/{category_id}")
def patch_category(category_id: str, payload: CategoryUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_category_or_403(db, current_user.id, category_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    row.updated_at = utcnow()
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail="Category name already exists for this type") from exc
    db.refresh(row)
    return vendor_response(CategoryOut.model_validate(row).model_dump(mode="json"))


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_category_or_403(db, current_user.id, category_id)
    row.archived_at = datetime.now(row.created_at.tzinfo)
    row.updated_at = utcnow()
    db.commit()
    return Response(status_code=204)
