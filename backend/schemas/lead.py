from pydantic import BaseModel
from database.models import LeadStatus

class ScrapingRequest(BaseModel):
    term: str
    city: str
    
class SearchRequest(BaseModel):
    term: str
    city: str

class StatusUpdateRequest(BaseModel):
    status: LeadStatus

class NotesUpdateRequest(BaseModel):
    notes: str