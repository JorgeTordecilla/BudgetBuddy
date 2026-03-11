import re
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field, WithJsonSchema

PASSWORD_POLICY_PATTERN = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$"
PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
)
_SPECIAL_CHARACTER_RE = re.compile(r"[^A-Za-z0-9]")


def _validate_password_policy(password: str) -> str:
    has_lower = any(char.islower() for char in password)
    has_upper = any(char.isupper() for char in password)
    has_digit = any(char.isdigit() for char in password)
    has_special = _SPECIAL_CHARACTER_RE.search(password) is not None
    if not (has_lower and has_upper and has_digit and has_special):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    return password


PasswordPolicyStr = Annotated[
    str,
    Field(min_length=8),
    AfterValidator(_validate_password_policy),
    WithJsonSchema({"pattern": PASSWORD_POLICY_PATTERN}, mode="validation"),
]


class ProblemDetails(BaseModel):
    type: str
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
