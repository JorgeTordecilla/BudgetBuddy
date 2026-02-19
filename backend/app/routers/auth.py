from datetime import UTC, datetime, timedelta
from threading import Lock
from weakref import WeakValueDictionary

from fastapi import APIRouter, Depends, Response
from sqlalchemy import and_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import APIError
from app.core.responses import vendor_response
from app.core.security import create_access_token, generate_refresh_token, hash_password, hash_refresh_token, verify_password
from app.dependencies import get_current_user, utcnow
from app.db import get_db
from app.errors import refresh_revoked_error, refresh_reuse_detected_error, unauthorized_error
from app.models import RefreshToken, User
from app.repositories import SQLAlchemyRefreshTokenRepository, SQLAlchemyUserRepository
from app.schemas import AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
_USER_LOCKS_GUARD = Lock()
_USER_LOCKS: WeakValueDictionary[str, Lock] = WeakValueDictionary()


def _user_lock(user_id: str) -> Lock:
    with _USER_LOCKS_GUARD:
        lock = _USER_LOCKS.get(user_id)
        if lock is None:
            lock = Lock()
            _USER_LOCKS[user_id] = lock
        return lock


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _create_auth_payload(user: User, refresh_token: str) -> dict:
    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=create_access_token(user.id),
        refresh_token=refresh_token,
        access_token_expires_in=settings.access_token_expires_in,
    ).model_dump()


def _active_refresh_token_or_401(db: Session, refresh_token: str) -> RefreshToken:
    token_hash = hash_refresh_token(refresh_token)
    refresh_row = SQLAlchemyRefreshTokenRepository(db).get_by_hash(token_hash)
    if not refresh_row or _as_utc(refresh_row.expires_at) < utcnow():
        raise unauthorized_error("Refresh token is invalid or expired")
    return refresh_row


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user_repo = SQLAlchemyUserRepository(db)
    refresh_repo = SQLAlchemyRefreshTokenRepository(db)
    user = User(username=payload.username, password_hash=hash_password(payload.password), currency_code=payload.currency_code)
    user_repo.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise APIError(status=409, title="Conflict", detail="Username already exists") from exc

    refresh_token = generate_refresh_token()
    refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_expires_days),
    )
    refresh_repo.add(refresh)
    db.commit()
    return vendor_response(_create_auth_payload(user, refresh_token), status_code=201)


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user_repo = SQLAlchemyUserRepository(db)
    refresh_repo = SQLAlchemyRefreshTokenRepository(db)
    user = user_repo.get_by_username(payload.username)
    if not user or not verify_password(payload.password, user.password_hash):
        raise unauthorized_error("User or password invalid")

    refresh_token = generate_refresh_token()
    refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_expires_days),
    )
    refresh_repo.add(refresh)
    db.commit()
    return vendor_response(_create_auth_payload(user, refresh_token), status_code=200)


@router.post("/refresh")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    user_repo = SQLAlchemyUserRepository(db)
    refresh_repo = SQLAlchemyRefreshTokenRepository(db)
    if not payload.refresh_token.strip():
        raise unauthorized_error("Refresh token is invalid or expired")

    token_hash = hash_refresh_token(payload.refresh_token)
    refresh_row = refresh_repo.get_by_hash(token_hash)
    if not refresh_row:
        raise unauthorized_error("Refresh token is invalid or expired")

    user_id = refresh_row.user_id
    with _user_lock(user_id):
        refresh_row = refresh_repo.get_by_hash(token_hash)
        if not refresh_row:
            raise unauthorized_error("Refresh token is invalid or expired")

        if _as_utc(refresh_row.expires_at) < utcnow():
            raise unauthorized_error("Refresh token is invalid or expired")

        if refresh_row.revoked_at is not None:
            reused_after_rotation = refresh_repo.has_newer_token(refresh_row.user_id, refresh_row.created_at)
            if reused_after_rotation:
                raise refresh_reuse_detected_error("Refresh token was already used and rotated")
            raise refresh_revoked_error("Refresh token is revoked")

        user = user_repo.get_by_id(refresh_row.user_id)
        if not user:
            raise unauthorized_error("Refresh token is invalid or expired")

        now = utcnow()
        stmt = (
            update(RefreshToken)
            .where(
                and_(
                    RefreshToken.id == refresh_row.id,
                    RefreshToken.revoked_at.is_(None),
                    RefreshToken.expires_at >= now,
                )
            )
            .values(revoked_at=now)
            .execution_options(synchronize_session=False)
        )
        result = db.execute(stmt)
        if result.rowcount != 1:
            current_row = refresh_repo.get_by_hash(token_hash)
            if not current_row or _as_utc(current_row.expires_at) < utcnow():
                raise unauthorized_error("Refresh token is invalid or expired")
            reused_after_rotation = refresh_repo.has_newer_token(current_row.user_id, current_row.created_at)
            if reused_after_rotation:
                raise refresh_reuse_detected_error("Refresh token was already used and rotated")
            raise refresh_revoked_error("Refresh token is revoked")

        new_refresh_token = generate_refresh_token()
        refresh_repo.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_refresh_token(new_refresh_token),
                expires_at=utcnow() + timedelta(days=settings.refresh_token_expires_days),
            )
        )
        db.commit()
        return vendor_response(_create_auth_payload(user, new_refresh_token), status_code=200)


@router.post("/logout", status_code=204)
def logout(
    payload: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    with _user_lock(current_user.id):
        refresh_row = _active_refresh_token_or_401(db, payload.refresh_token)
        if refresh_row.user_id != current_user.id:
            raise refresh_revoked_error("Refresh token is not valid for current user")
        if refresh_row.revoked_at is not None:
            raise refresh_revoked_error("Refresh token is revoked")

        now = utcnow()
        stmt = (
            update(RefreshToken)
            .where(
                and_(
                    RefreshToken.user_id == current_user.id,
                    RefreshToken.revoked_at.is_(None),
                )
            )
            .values(revoked_at=now)
            .execution_options(synchronize_session=False)
        )
        db.execute(stmt)
        db.commit()
        return Response(status_code=204)
