import base64
import hashlib
import hmac
import json
import secrets
import time
from fastapi.responses import Response

from app.core.config import settings


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hash_hex = stored.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return hmac.compare_digest(digest.hex(), hash_hex)


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def _sign_segment(segment: str) -> bytes:
    return hmac.new(settings.jwt_secret.encode("utf-8"), segment.encode("ascii"), hashlib.sha256).digest()


def _decode_jwt_access_token(token: str) -> dict:
    try:
        header_part, payload_part, sig_part = token.split(".")
    except ValueError as exc:
        raise ValueError("invalid token format") from exc

    signing_input = f"{header_part}.{payload_part}"
    expected = _sign_segment(signing_input)
    if not hmac.compare_digest(expected, _b64decode(sig_part)):
        raise ValueError("invalid signature")

    try:
        header = json.loads(_b64decode(header_part).decode("utf-8"))
        payload = json.loads(_b64decode(payload_part).decode("utf-8"))
    except Exception as exc:
        raise ValueError("invalid token payload") from exc

    if not isinstance(header, dict):
        raise ValueError("invalid token header")
    if header.get("alg") not in {"HS256"}:
        raise ValueError("invalid token algorithm")
    if header.get("typ") not in {"JWT"}:
        raise ValueError("invalid token type")
    if not isinstance(payload, dict):
        raise ValueError("invalid token payload")

    exp = payload.get("exp")
    iat = payload.get("iat")
    sub = payload.get("sub")
    if not isinstance(exp, int) or not isinstance(iat, int) or not isinstance(sub, str) or not sub.strip():
        raise ValueError("invalid token claims")
    if exp < int(time.time()):
        raise ValueError("token expired")
    return payload


def create_access_token(user_id: str) -> str:
    now = int(time.time())
    header = {
        "alg": "HS256",
        "typ": "JWT",
    }
    payload = {
        "sub": user_id,
        "exp": now + settings.access_token_expires_in,
        "iat": now,
    }
    header_part = _b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_part}.{payload_part}"
    sig = _sign_segment(signing_input)
    return f"{signing_input}.{_b64encode(sig)}"


def decode_access_token(token: str) -> dict:
    if token.count(".") != 2:
        raise ValueError("invalid token format")
    return _decode_jwt_access_token(token)


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=settings.refresh_token_ttl_seconds,
        path=settings.refresh_cookie_path,
        domain=settings.refresh_cookie_domain,
        secure=settings.refresh_cookie_secure,
        httponly=True,
        samesite=settings.refresh_cookie_samesite,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value="",
        max_age=0,
        path=settings.refresh_cookie_path,
        domain=settings.refresh_cookie_domain,
        secure=settings.refresh_cookie_secure,
        httponly=True,
        samesite=settings.refresh_cookie_samesite,
    )
