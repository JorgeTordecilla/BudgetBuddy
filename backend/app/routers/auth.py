from datetime import UTC, datetime, timedelta
from threading import Lock
from weakref import WeakValueDictionary

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import and_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import emit_audit_event
from app.core.config import settings
from app.core.errors import APIError
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter
from app.core.responses import vendor_response
from app.core.security import create_access_token, generate_refresh_token, hash_password, hash_refresh_token, verify_password
from app.dependencies import get_current_user, utcnow
from app.db import get_db
from app.errors import rate_limited_error, refresh_revoked_error, refresh_reuse_detected_error, unauthorized_error
from app.models import RefreshToken, User
from app.repositories import SQLAlchemyRefreshTokenRepository, SQLAlchemyUserRepository
from app.schemas import AuthResponse, LoginRequest, RefreshRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
_USER_LOCKS_GUARD = Lock()
_USER_LOCKS: WeakValueDictionary[str, Lock] = WeakValueDictionary()
_AUTH_RATE_LIMITER: RateLimiter = InMemoryRateLimiter()


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


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").strip()
    if forwarded:
        first = forwarded.split(",", 1)[0].strip()
        if first:
            return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _auth_rate_limit_or_429(request: Request, *, endpoint: str, identity: str) -> None:
    window_seconds = max(1, settings.auth_rate_limit_window_seconds)
    if endpoint == "login":
        limit = max(1, settings.auth_login_rate_limit_per_minute)
    else:
        limit = max(1, settings.auth_refresh_rate_limit_per_minute)

    lock_seconds = settings.auth_rate_limit_lock_seconds if settings.auth_rate_limit_lock_enabled else 0
    key = f"{endpoint}:{identity}"
    allowed, retry_after = _AUTH_RATE_LIMITER.check(
        key,
        limit=limit,
        window_seconds=window_seconds,
        lock_seconds=max(0, lock_seconds),
    )
    if not allowed:
        raise rate_limited_error("Too many requests, retry later", retry_after=retry_after)


def _create_auth_payload(user: User, refresh_token: str) -> dict:
    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=create_access_token(user.id),
        refresh_token=refresh_token,
        access_token_expires_in=settings.access_token_expires_in,
    ).model_dump()


def _is_expired(refresh_row: RefreshToken) -> bool:
    return _as_utc(refresh_row.expires_at) < utcnow()


def _raise_revoked_or_reuse(
    refresh_repo: SQLAlchemyRefreshTokenRepository,
    refresh_row: RefreshToken,
    *,
    db: Session,
    request: Request,
) -> None:
    reused_after_rotation = refresh_repo.has_newer_token(refresh_row.user_id, refresh_row.created_at)
    if reused_after_rotation:
        emit_audit_event(
            db,
            request=request,
            user_id=refresh_row.user_id,
            resource_type="auth_session",
            resource_id=refresh_row.id,
            action="auth.refresh_token_reuse_detected",
        )
        db.commit()
        raise refresh_reuse_detected_error("Refresh token was already used and rotated")
    raise refresh_revoked_error("Refresh token is revoked")


def _revoke_refresh_token(db: Session, refresh_row: RefreshToken) -> tuple[datetime, bool]:
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
    return now, result.rowcount == 1


def _active_refresh_token_or_401(db: Session, refresh_token: str) -> RefreshToken:
    token_hash = hash_refresh_token(refresh_token)
    refresh_row = SQLAlchemyRefreshTokenRepository(db).get_by_hash(token_hash)
    if not refresh_row or _is_expired(refresh_row):
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
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    username_key = payload.username.strip().lower() if payload.username.strip() else "unknown-username"
    _auth_rate_limit_or_429(request, endpoint="login", identity=f"{username_key}:{_client_ip(request)}")

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
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    token_key = hash_refresh_token(payload.refresh_token.strip()) if payload.refresh_token.strip() else "empty-token"
    _auth_rate_limit_or_429(request, endpoint="refresh", identity=f"{token_key}:{_client_ip(request)}")

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
        if _is_expired(refresh_row):
            raise unauthorized_error("Refresh token is invalid or expired")
        if refresh_row.revoked_at is not None:
            _raise_revoked_or_reuse(refresh_repo, refresh_row, db=db, request=request)

        user = user_repo.get_by_id(refresh_row.user_id)
        if not user:
            raise unauthorized_error("Refresh token is invalid or expired")

        _, revoked = _revoke_refresh_token(db, refresh_row)
        if not revoked:
            current_row = refresh_repo.get_by_hash(token_hash)
            if not current_row or _is_expired(current_row):
                raise unauthorized_error("Refresh token is invalid or expired")
            _raise_revoked_or_reuse(refresh_repo, current_row, db=db, request=request)

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
    request: Request,
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
        emit_audit_event(
            db,
            request=request,
            user_id=current_user.id,
            resource_type="auth_session",
            resource_id=current_user.id,
            action="auth.logout",
            created_at=now,
        )
        db.commit()
        return Response(status_code=204)
