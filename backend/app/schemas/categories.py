from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CategoryType


class CategoryBase(BaseModel):
    name: str = Field(min_length=1)
    type: CategoryType
    note: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    note: str | None = None
    archived_at: datetime | None = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    archived_at: datetime | None
