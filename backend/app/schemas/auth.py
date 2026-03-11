from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import PasswordPolicyStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    currency_code: Literal["USD", "COP", "EUR", "MXN"]


class RegisterRequest(BaseModel):
    username: str = Field(pattern=r"^[a-zA-Z0-9_]{3,20}$")
    password: PasswordPolicyStr
    currency_code: Literal["USD", "COP", "EUR", "MXN"]


class LoginRequest(BaseModel):
    username: str = Field(pattern=r"^[a-zA-Z0-9_]{3,20}$")
    password: PasswordPolicyStr


class AuthSessionResponse(BaseModel):
    user: UserOut
    access_token: str
    access_token_expires_in: int
