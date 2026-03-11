from datetime import datetime, timedelta
import hashlib
import hmac
import logging
import uuid

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import and_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.audit import emit_audit_event
from app.core.config import settings
from app.core.errors import APIError
from app.core.network import resolve_rate_limit_client_ip
from app.core.rate_limit import InMemoryRateLimiter, RateLimiter, log_rate_limited
from app.core.responses import vendor_response
from app.core.utils import as_utc, utcnow
from app.core.security import (
    clear_refresh_cookie,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    set_refresh_cookie,
    verify_password,
)
from app.dependencies import get_current_user
from app.db import get_db
from app.errors import (
    origin_not_allowed_error,
    rate_limited_error,
    service_unavailable_error,
    unauthorized_error,
)
from app.models import RefreshToken, User
from app.repositories import SQLAlchemyRefreshTokenRepository, SQLAlchemyUserRepository
from app.schemas import AuthSessionResponse, LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
session_router = APIRouter(tags=["auth"])
_AUTH_RATE_LIMITER: RateLimiter = InMemoryRateLimiter()
_LOGGER = logging.getLogger("app.auth")


def _auth_rate_limit_or_429(request: Request, *, endpoint: str, identity: str) -> None:
    window_seconds = max(1, settings.auth_rate_limit_window_seconds)
    if endpoint == "register":
        limit = max(1, settings.auth_register_rate_limit_per_minute)
    elif endpoint == "login":
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
        log_rate_limited(
            request,
            endpoint=endpoint,
            key=key,
            retry_after=retry_after,
            limit=limit,
            window_seconds=window_seconds,
        )
        raise rate_limited_error("Too many requests, retry later", retry_after=retry_after)


def _create_session_payload(user: User) -> dict:
    return AuthSessionResponse(
        user=UserOut.model_validate(user),
        access_token=create_access_token(user.id),
        access_token_expires_in=settings.access_token_expires_in,
    ).model_dump()


def _refresh_cookie_value(request: Request) -> str:
    return request.cookies.get(settings.refresh_cookie_name, "").strip()


def _enforce_refresh_origin_policy(request: Request) -> None:
    if settings.refresh_cookie_samesite != "none":
        return
    origin = request.headers.get("origin", "").strip()
    if origin:
        if origin in settings.auth_refresh_allowed_origins:
            return
        raise origin_not_allowed_error("Origin is not allowed for refresh")
    if settings.auth_refresh_missing_origin_mode == "allow_trusted":
        return
    raise origin_not_allowed_error("Origin header is required for refresh in current mode")


def _is_expired(refresh_row: RefreshToken, *, now: datetime | None = None) -> bool:
    now_utc = now or utcnow()
    return as_utc(refresh_row.expires_at) <= now_utc


def _derive_child_refresh_token(parent_token: str, parent_row: RefreshToken) -> str:
    rotated_at = as_utc(parent_row.rotated_at) if parent_row.rotated_at is not None else utcnow()
    material = ":".join(
        [
            parent_token,
            parent_row.user_id,
            parent_row.family_id or "",
            str(int(rotated_at.timestamp())),
        ]
    )
    digest = hmac.new(
        key=settings.jwt_secret.encode("utf-8"),
        msg=material.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return f"rt_{digest}"


def _create_root_refresh(user_id: str, refresh_token: str) -> RefreshToken:
    return RefreshToken(
        user_id=user_id,
        token_hash=hash_refresh_token(refresh_token),
        family_id=str(uuid.uuid4()),
        parent_hash=None,
        rotated_at=None,
        grace_until=None,
        expires_at=utcnow() + timedelta(seconds=settings.refresh_token_ttl_seconds),
    )


def _revoke_compromised_family(
    *,
    refresh_repo: SQLAlchemyRefreshTokenRepository,
    refresh_row: RefreshToken,
    request: Request,
    db: Session,
) -> None:
    refresh_repo.revoke_family(refresh_row.family_id, user_id=refresh_row.user_id)
    emit_audit_event(
        db,
        request=request,
        user_id=refresh_row.user_id,
        resource_type="auth_session",
        resource_id=refresh_row.family_id or refresh_row.user_id,
        action="auth.refresh_token_family_revoked",
    )
    db.commit()


def _active_refresh_token_or_401(db: Session, refresh_token: str) -> RefreshToken:
    token_hash = hash_refresh_token(refresh_token)
    refresh_row = SQLAlchemyRefreshTokenRepository(db).get_by_hash(token_hash)
    now = utcnow()
    if not refresh_row or _is_expired(refresh_row, now=now):
        raise unauthorized_error("Refresh token is invalid or expired")
    return refresh_row


@router.post("/register")
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    _auth_rate_limit_or_429(request, endpoint="register", identity=resolve_rate_limit_client_ip(request))

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
    refresh_repo.add(_create_root_refresh(user.id, refresh_token))
    db.commit()
    response = vendor_response(_create_session_payload(user), status_code=201)
    set_refresh_cookie(response, refresh_token)
    return response


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    username_key = payload.username.strip().lower() if payload.username.strip() else "unknown-username"
    _auth_rate_limit_or_429(request, endpoint="login", identity=f"{username_key}:{resolve_rate_limit_client_ip(request)}")

    user_repo = SQLAlchemyUserRepository(db)
    refresh_repo = SQLAlchemyRefreshTokenRepository(db)
    user = user_repo.get_by_username(payload.username)
    if not user or not verify_password(payload.password, user.password_hash):
        raise unauthorized_error("User or password invalid")

    refresh_token = generate_refresh_token()
    refresh_repo.add(_create_root_refresh(user.id, refresh_token))
    db.commit()
    response = vendor_response(_create_session_payload(user), status_code=200)
    set_refresh_cookie(response, refresh_token)
    return response


@router.post("/refresh")
def refresh(request: Request, db: Session = Depends(get_db)):
    refresh_token = _refresh_cookie_value(request)
    _enforce_refresh_origin_policy(request)
    if not refresh_token:
        raise unauthorized_error("Refresh token is invalid or expired")

    _auth_rate_limit_or_429(request, endpoint="refresh", identity=resolve_rate_limit_client_ip(request))

    user_repo = SQLAlchemyUserRepository(db)
    refresh_repo = SQLAlchemyRefreshTokenRepository(db)

    token_hash = hash_refresh_token(refresh_token)
    request_now = utcnow()

    try:
        rotated_parent = refresh_repo.rotate_atomically(token_hash, settings.refresh_grace_period_seconds)
        if rotated_parent is not None:
            if _is_expired(rotated_parent, now=request_now):
                db.rollback()
                raise unauthorized_error("Refresh token is invalid or expired")
            user = user_repo.get_by_id(rotated_parent.user_id)
            if not user:
                db.rollback()
                raise unauthorized_error("Refresh token is invalid or expired")

            child_refresh_token = _derive_child_refresh_token(refresh_token, rotated_parent)
            refresh_repo.add(
                RefreshToken(
                    user_id=user.id,
                    token_hash=hash_refresh_token(child_refresh_token),
                    family_id=rotated_parent.family_id,
                    parent_hash=rotated_parent.token_hash,
                    rotated_at=None,
                    grace_until=None,
                    expires_at=request_now + timedelta(seconds=settings.refresh_token_ttl_seconds),
                )
            )
            db.commit()
            response = vendor_response(_create_session_payload(user), status_code=200)
            set_refresh_cookie(response, child_refresh_token)
            return response

        current_row = refresh_repo.get_by_hash(token_hash)
        if not current_row or _is_expired(current_row, now=request_now):
            raise unauthorized_error("Refresh token is invalid or expired")

        within_grace = (
            current_row.rotated_at is not None
            and current_row.grace_until is not None
            and as_utc(current_row.grace_until) > request_now
        )
        if within_grace:
            child = refresh_repo.get_child_of(token_hash)
            if child and child.revoked_at is None and not _is_expired(child, now=request_now):
                user = user_repo.get_by_id(child.user_id)
                if not user:
                    db.rollback()
                    raise unauthorized_error("Refresh token is invalid or expired")
                child_refresh_token = _derive_child_refresh_token(refresh_token, current_row)
                if hash_refresh_token(child_refresh_token) == child.token_hash:
                    emit_audit_event(
                        db,
                        request=request,
                        user_id=current_row.user_id,
                        resource_type="auth_session",
                        resource_id=current_row.id,
                        action="auth.refresh_grace_hit",
                    )
                    db.commit()
                    response = vendor_response(_create_session_payload(user), status_code=200)
                    set_refresh_cookie(response, child_refresh_token)
                    return response

        _revoke_compromised_family(refresh_repo=refresh_repo, refresh_row=current_row, request=request, db=db)
        raise unauthorized_error("Refresh token is invalid or expired")
    except OperationalError as exc:
        db.rollback()
        request_id = getattr(request.state, "request_id", "")
        _LOGGER.warning(
            "auth_refresh_db_operational_error request_id=%s path=%s error=%s",
            request_id,
            request.url.path,
            exc.__class__.__name__,
        )
        raise service_unavailable_error("Service temporarily unavailable, please retry")


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    db: Session = Depends(get_db),
):
    refresh_token = _refresh_cookie_value(request)
    if not refresh_token:
        raise unauthorized_error("Refresh token is invalid or expired")

    refresh_row = _active_refresh_token_or_401(db, refresh_token)
    if refresh_row.revoked_at is not None:
        raise unauthorized_error("Refresh token is invalid or expired")

    now = utcnow()
    stmt = (
        update(RefreshToken)
        .where(
            and_(
                RefreshToken.user_id == refresh_row.user_id,
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
        user_id=refresh_row.user_id,
        resource_type="auth_session",
        resource_id=refresh_row.user_id,
        action="auth.logout",
        created_at=now,
    )
    db.commit()
    response = Response(status_code=204)
    clear_refresh_cookie(response)
    return response


@session_router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return vendor_response(UserOut.model_validate(current_user).model_dump(), status_code=200)
