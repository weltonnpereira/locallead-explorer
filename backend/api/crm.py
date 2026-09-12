from datetime import datetime
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.config import get_db
from database import config as database_config
from database.models import Campaign, CampaignStatus, Lead, LeadStatus
from schemas.campaign import (
    CampaignCreateRequest,
    CampaignResponse,
    CampaignStatusUpdateRequest,
    DealUpdateRequest,
    ProposalUpdateRequest,
)
from services.rate_limit import read_rate_limit, write_rate_limit

router = APIRouter(prefix="/api/v1", tags=["CRM Analytics"])


def campaign_response(campaign: Campaign) -> CampaignResponse:
    leads = campaign.leads
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        category=campaign.category,
        city=campaign.city,
        status=campaign.status,
        leads=len(leads),
        opportunities=sum((lead.score or 0) >= 80 for lead in leads),
        contacted=sum(lead.status != LeadStatus.NEW for lead in leads),
        replies=sum(lead.status in {LeadStatus.REPLIED, LeadStatus.MEETING, LeadStatus.PROPOSAL, LeadStatus.CUSTOMER} for lead in leads),
        meetings=sum(lead.status in {LeadStatus.MEETING, LeadStatus.PROPOSAL, LeadStatus.CUSTOMER} for lead in leads),
        customers=sum(lead.status == LeadStatus.CUSTOMER for lead in leads),
        generated_value=sum(lead.deal_value or 0 for lead in leads if lead.status == LeadStatus.CUSTOMER),
        created_at=campaign.created_at,
    )


@router.get("/dashboard", dependencies=[Depends(read_rate_limit)])
async def dashboard(db: Session = Depends(get_db)):
    cache_key = "dashboard:v1"

    redis = database_config.redis_client

    if redis:
        try:
            cached_dashboard = await redis.get(cache_key)
            if cached_dashboard:
                return json.loads(cached_dashboard)
        except Exception:
            redis = None

    leads = db.query(Lead).all()
    customers = [lead for lead in leads if lead.status == LeadStatus.CUSTOMER]
    funnel = [
        {"label": "Leads", "value": len(leads)},
        {"label": "Selecionados", "value": sum(lead.in_prospecting for lead in leads)},
        {"label": "Contatados", "value": sum(lead.status != LeadStatus.NEW for lead in leads)},
        {"label": "Respostas", "value": sum(lead.status in {LeadStatus.REPLIED, LeadStatus.MEETING, LeadStatus.PROPOSAL, LeadStatus.CUSTOMER} for lead in leads)},
        {"label": "Reuniões", "value": sum(lead.status in {LeadStatus.MEETING, LeadStatus.PROPOSAL, LeadStatus.CUSTOMER} for lead in leads)},
        {"label": "Clientes", "value": len(customers)},
    ]
    metrics = [
        {"label": "Total de leads", "value": len(leads), "hint": "cadastros persistidos"},
        {"label": "Oportunidades", "value": sum((lead.score or 0) >= 80 for lead in leads), "hint": "score 80 ou mais"},
        {"label": "Contatados", "value": sum(lead.status != LeadStatus.NEW for lead in leads), "hint": "fora da etapa novo"},
        {"label": "Respostas", "value": sum(lead.status in {LeadStatus.REPLIED, LeadStatus.MEETING, LeadStatus.PROPOSAL, LeadStatus.CUSTOMER} for lead in leads), "hint": "respostas registradas"},
        {"label": "Reuniões", "value": sum(lead.status in {LeadStatus.MEETING, LeadStatus.PROPOSAL, LeadStatus.CUSTOMER} for lead in leads), "hint": "reuniões registradas"},
        {"label": "Clientes", "value": len(customers), "hint": "negócios fechados"},
        {"label": "Valor gerado", "value": sum(lead.deal_value or 0 for lead in customers), "hint": "soma dos negócios"},
    ]
    niches = []
    categories = sorted({lead.category or "Sem categoria" for lead in leads})
    for category in categories:
        group = [lead for lead in leads if (lead.category or "Sem categoria") == category]
        customer_count = sum(lead.status == LeadStatus.CUSTOMER for lead in group)
        niches.append({
            "niche": category,
            "leads": len(group),
            "contacted": sum(lead.status != LeadStatus.NEW for lead in group),
            "replies": sum(lead.status in {LeadStatus.REPLIED, LeadStatus.MEETING, LeadStatus.PROPOSAL, LeadStatus.CUSTOMER} for lead in group),
            "meetings": sum(lead.status in {LeadStatus.MEETING, LeadStatus.PROPOSAL, LeadStatus.CUSTOMER} for lead in group),
            "customers": customer_count,
            "conversion": f"{(customer_count / len(group) * 100) if group else 0:.1f}%",
        })
    campaigns = [campaign_response(campaign).model_dump(mode="json") for campaign in db.query(Campaign).order_by(Campaign.created_at.desc()).limit(10).all()]

    result = {"metrics": metrics, "funnel": funnel, "niches": niches, "campaigns": campaigns}

    if redis:
        try:
            await redis.set(cache_key, json.dumps(result), ex=300)
        except Exception:
            pass

    return result


@router.get("/campaigns", response_model=list[CampaignResponse], dependencies=[Depends(read_rate_limit)])
def list_campaigns(db: Session = Depends(get_db)):
    return [campaign_response(campaign) for campaign in db.query(Campaign).order_by(Campaign.created_at.desc()).all()]


@router.post("/campaigns", response_model=CampaignResponse, dependencies=[Depends(write_rate_limit)])
def create_campaign(payload: CampaignCreateRequest, db: Session = Depends(get_db)):
    campaign = Campaign(name=payload.name, category=payload.category, city=payload.city)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign_response(campaign)


@router.patch("/campaigns/{campaign_id}/status", response_model=CampaignResponse, dependencies=[Depends(write_rate_limit)])
def update_campaign_status(campaign_id: int, payload: CampaignStatusUpdateRequest, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = payload.status
    db.commit()
    db.refresh(campaign)
    return campaign_response(campaign)


@router.post("/campaigns/{campaign_id}/leads", dependencies=[Depends(write_rate_limit)])
def add_campaign_leads(campaign_id: int, lead_ids: list[int], db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    leads = db.query(Lead).filter(Lead.id.in_(set(lead_ids))).all()
    if len(leads) != len(set(lead_ids)):
        raise HTTPException(status_code=404, detail="One or more leads not found")
    for lead in leads:
        if lead not in campaign.leads:
            campaign.leads.append(lead)
    db.commit()
    return {"campaign_id": campaign_id, "updated": len(leads)}


@router.patch("/leads/{lead_id}/proposal", dependencies=[Depends(write_rate_limit)])
def update_proposal(lead_id: int, payload: ProposalUpdateRequest, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.in_prospecting:
        raise HTTPException(status_code=409, detail="Adicione o lead à prospecção antes de criar uma proposta.")
    lead.proposal_value = payload.value
    lead.status = LeadStatus.PROPOSAL
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/leads/{lead_id}/deal", dependencies=[Depends(write_rate_limit)])
def update_deal(lead_id: int, payload: DealUpdateRequest, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.in_prospecting:
        raise HTTPException(status_code=409, detail="Adicione o lead à prospecção antes de registrar o negócio.")
    lead.deal_value = payload.value
    lead.deal_closed_at = payload.closed_at or datetime.utcnow()
    lead.status = LeadStatus.CUSTOMER
    db.commit()
    db.refresh(lead)
    return lead
