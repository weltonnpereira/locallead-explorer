from enum import Enum
from pydantic import BaseModel
from typing import Optional

class ChannelEnum(str, Enum):
    whatsapp = "whatsapp"
    email = "email"
    
class TargetTypeEnum(str, Enum):
    agency = "agency"
    niche_company = "niche_company"
    
class MessageRequest(BaseModel):
    channel: ChannelEnum = ChannelEnum.whatsapp
    target_type: TargetTypeEnum = TargetTypeEnum.niche_company
    company_name: str
    city: str
    niche: Optional[str] = "negócios locais"
    lead_count: int = 50