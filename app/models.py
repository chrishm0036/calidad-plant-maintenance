"""Validated API and domain models."""
from datetime import date, datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

Priority = Literal["normal", "high", "critical"]


class CreateJobRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    customer_name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=1000)
    priority: Priority = "normal"
    location: str = Field(default="Unspecified", min_length=1, max_length=180)
    technician: str = Field(default="Unassigned", min_length=1, max_length=120)
    due_date: Optional[date] = None

    @field_validator("due_date", mode="before")
    @classmethod
    def validate_due_date(cls, value):
        if value is None or (isinstance(value, date) and not isinstance(value, datetime)):
            return value
        if not isinstance(value, str):
            raise ValueError("due_date must use YYYY-MM-DD")
        try:
            parsed = date.fromisoformat(value)
        except ValueError:
            raise ValueError("due_date must use YYYY-MM-DD") from None
        if parsed.isoformat() != value:
            raise ValueError("due_date must use YYYY-MM-DD")
        return parsed


class Job(CreateJobRequest):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid", frozen=True)

    id: int = Field(gt=0)
    status: Literal["open"] = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
