from cProfile import label
from typing import Optional

from pydantic import BaseModel
from datetime import datetime
from services.auxiliaries import parse_currency_to_cents
from database.models import LeadStatus
from pydantic import field_validator
from services.sanitization import sanitize_city, sanitize_search_term

class ScrapingRequest(BaseModel):
    term: str
    city: str

    @field_validator("term")
    @classmethod
    def validate_term(cls, value: str) -> str:
        return sanitize_search_term(value)

    @field_validator("city")
    @classmethod
    def validate_city(cls, value: str) -> str:
        return sanitize_city(value)
    
class SearchRequest(BaseModel):
    term: str
    city: str

    @field_validator("term")
    @classmethod
    def validate_term(cls, value: str) -> str:
        return sanitize_search_term(value)

    @field_validator("city")
    @classmethod
    def validate_city(cls, value: str) -> str:
        return sanitize_city(value)

class StatusUpdateRequest(BaseModel):
    status: LeadStatus
    proposal_value: Optional[int] = None
    deal_value: Optional[int] = None

    @field_validator("proposal_value", "deal_value", mode="before")
    @classmethod
    def convert_values(cls, v: any) -> Optional[int]:
        return parse_currency_to_cents(v)

class NotesUpdateRequest(BaseModel):
    notes: str

class OpportunityFactor(BaseModel):
    label: str
    points: float
    
class LeadResponse(BaseModel):
    id: int
    name: str
    phone: str | None
    address: str | None
    website: str | None
    google_maps_url: str | None
    google_rating: float | None
    google_reviews: int | None
    opportunity_score: float | None
    status: LeadStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime
    in_prospecting: bool = False
    proposal_value: float | None = None
    deal_value: float | None = None
    deal_closed_at: datetime | None = None
    factors: list[OpportunityFactor] = []
    
    class ConfigDict:
        from_attributes = True