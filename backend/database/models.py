import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.config import Base

class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    REPLIED = "REPLIED"
    MEETING = "MEETING"
    PROPOSAL = "PROPOSAL"
    CUSTOMER = "CUSTOMER"
    LOST = "LOST"
    
search_lead_association = Table(
    'search_lead', Base.metadata,
    Column('search_id', Integer, ForeignKey('searches.id'), primary_key=True),
    Column('lead_id', Integer, ForeignKey('leads.id'), primary_key=True)
)

class Search(Base):
    __tablename__ = 'searches'
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)
    location = Column(String, nullable=False)
    total_found = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    # para comitar
    leads = relationship('Lead', secondary=search_lead_association, back_populates='searches')
    
class Lead(Base):
    __tablename__ = 'leads'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    phone = Column(String)
    whatsapp = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    google_rating = Column(Float)
    google_reviews = Column(Integer)
    website = Column(String)
    instagram = Column(String)
    google_maps_url = Column(String, unique=True)
    source = Column(String)
    
    # Qualificação
    score = Column(Float)
    opportunity = Column(Text) # Guardamos os motivos aqui
    
    # CRM
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_contact_at = Column(DateTime, nullable=True)
    last_analyzed_at = Column(DateTime, nullable=True)
    
    searches = relationship('Search', secondary=search_lead_association, back_populates='leads')