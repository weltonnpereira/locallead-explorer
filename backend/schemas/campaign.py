from datetime import datetime
from pydantic import BaseModel, Field
from database.models import CampaignStatus

class CampaignCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: str | None = None
    city: str | None = None

class CampaignStatusUpdateRequest(BaseModel):
    status: CampaignStatus

class CampaignResponse(BaseModel):
    id: int
    name: str
    category: str | None
    city: str | None
    status: CampaignStatus
    leads: int
    opportunities: int
    contacted: int
    replies: int
    meetings: int
    customers: int
    generated_value: int
    created_at: datetime

class ProposalUpdateRequest(BaseModel):
    value: int = Field(ge=0)

class DealUpdateRequest(BaseModel):
    value: int = Field(ge=0)
    closed_at: datetime | None = None
