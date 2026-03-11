from pydantic import BaseModel


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: PushKeys
    user_agent: str | None = None


class PushSubscribeResponse(BaseModel):
    subscribed: bool
    endpoint: str


class VapidPublicKeyResponse(BaseModel):
    public_key: str


class PushTestRequest(BaseModel):
    title: str = "Test - BudgetBuddy"
    body: str = "Push notifications are working."
