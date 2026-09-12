import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, Enum, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
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

class CampaignStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    
search_lead_association = Table(
    'search_lead', Base.metadata,
    Column('search_id', Integer, ForeignKey('searches.id'), primary_key=True),
    Column('lead_id', Integer, ForeignKey('leads.id'), primary_key=True)
)

campaign_lead_association = Table(
    'campaign_lead', Base.metadata,
    Column('campaign_id', Integer, ForeignKey('campaigns.id'), primary_key=True),
    Column('lead_id', Integer, ForeignKey('leads.id'), primary_key=True)
)

class Search(Base):
    __tablename__ = 'searches'
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)
    location = Column(String, nullable=False)
    total_found = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    
    leads = relationship('Lead', secondary=search_lead_association, back_populates='searches')


class Campaign(Base):
    __tablename__ = 'campaigns'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    city = Column(String)
    status = Column(Enum(CampaignStatus), nullable=False, default=CampaignStatus.ACTIVE)
    created_at = Column(DateTime, default=func.now())
    leads = relationship('Lead', secondary=campaign_lead_association, back_populates='campaigns')


class WebsiteAnalysis(Base):
    __tablename__ = 'website_analyses'

    id = Column(Integer, primary_key=True, index=True)
    website_url = Column(String, nullable=False, unique=True, index=True)
    has_website = Column(Boolean, nullable=False, default=False)
    has_https = Column(Boolean, nullable=False, default=False)
    has_whatsapp = Column(Boolean, nullable=False, default=False)
    has_instagram = Column(Boolean, nullable=False, default=False)
    has_form = Column(Boolean, nullable=False, default=False)
    has_budget_cta = Column(Boolean, nullable=False, default=False)
    has_phone_on_site = Column(Boolean, nullable=False, default=False)
    is_custom_domain = Column(Boolean, nullable=False, default=False)
    site_status = Column(String)
    keywords_found = Column(Text, nullable=False, default='[]')
    analyzed_at = Column(DateTime, nullable=False, default=func.now())
    
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
    opportunity_factors = Column(JSONB, nullable=True) # Guardamos os fatores aqui, como JSON, eles são as oportunidades e os pontos atribuidos por ela 
    
    # CRM
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_contact_at = Column(DateTime, nullable=True)
    last_analyzed_at = Column(DateTime, nullable=True)
    last_scraped_at = Column(DateTime, nullable=True)
    in_prospecting = Column(Boolean, nullable=False, default=False, index=True)
    proposal_value = Column(Integer, nullable=True)
    deal_value = Column(Integer, nullable=True)
    deal_closed_at = Column(DateTime, nullable=True)
    
    searches = relationship('Search', secondary=search_lead_association, back_populates='leads')
    campaigns = relationship('Campaign', secondary=campaign_lead_association, back_populates='leads')