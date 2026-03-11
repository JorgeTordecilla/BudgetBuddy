from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    request_id: str
    user_id: str
    resource_type: str
    resource_id: str | None
    action: str
    created_at: datetime


class AuditListResponse(BaseModel):
    items: list[AuditEventOut]
    next_cursor: str | None
