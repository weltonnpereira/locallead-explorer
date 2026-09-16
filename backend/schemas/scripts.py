from pydantic import BaseModel
from datetime import datetime
from database.models import ScriptCategory

class ScriptResponse(BaseModel):
    id: int
    title: str
    category: ScriptCategory
    content: str
    created_at: datetime
    
class PayloadScript(BaseModel):
    title: str
    category: ScriptCategory
    content: str