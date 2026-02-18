import base64
import json
from datetime import datetime

from app.core.errors import APIError


def encode_cursor(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def decode_cursor(value: str) -> dict:
    try:
        decoded = base64.urlsafe_b64decode(value.encode("ascii"))
        data = json.loads(decoded.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("cursor must decode to object")
        return data
    except Exception as exc:
        raise APIError(status=400, title="Invalid request", detail="Invalid cursor") from exc


def parse_datetime(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise APIError(status=400, title="Invalid request", detail="Invalid cursor value") from exc
