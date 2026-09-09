from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from database.config import get_db
from database.models import Lead, LeadStatus, Search
from schemas.lead import NotesUpdateRequest, ScrapingRequest, StatusUpdateRequest
from services.leads import save_scraped_leads
from services.scraper import scrape_google_maps
from services.analyzer import analyze_digital_presence
from services.scoring import calculate_opportunity_score

router = APIRouter(
    prefix="/api/v1",
    tags=["CRM"]
)

@router.post("/leads/search")
async def create_search(payload: ScrapingRequest, db: Session = Depends(get_db)):
    if not payload.term or not payload.city:
        raise HTTPException(status_code=400, detail="Termo e cidade são obrigatórios.")
    
    search = Search(category=payload.term, location=payload.city)
    db.add(search)
    db.commit()
    
    raw_leads = await scrape_google_maps(payload.term, payload.city)
    search.total_found = len(raw_leads)
    
    processed = []
    for data in raw_leads:
        analysis = await analyze_digital_presence(data.get("website"))
        score, opportunity = calculate_opportunity_score(data, analysis)
        
        data["opportunity_score"] = score
        data["opportunity_reason"] = opportunity
        processed.append(data)

    summary = save_scraped_leads(db, processed, search)

    return {"search_id": search.id, "summary": summary}

@router.get("/leads")
def list_leads(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    leads = db.query(Lead).order_by(Lead.score.desc()).offset(skip).limit(limit).all()
    return leads

@router.get("/leads/{lead_id}")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.patch("/leads/{lead_id}/status")
def update_status(lead_id: int, payload: StatusUpdateRequest, db: Session = Depends(get_db)):
    """Move o lead pelo Kanban (NEW, CONTACTED, etc)"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = payload.status
    if payload.status != LeadStatus.NEW:
        lead.last_contact_at = datetime.utcnow()
        
    db.commit()
    db.refresh(lead)
    return lead

@router.patch("/leads/{lead_id}/notes")
def update_notes(lead_id: int, payload: NotesUpdateRequest, db: Session = Depends(get_db)):
    """Adiciona anotações pós-ligação/contato"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.notes = payload.notes
    db.commit()
    db.refresh(lead)
    return lead

# @router.post("/scrape")
# async def init_scraping(payload: ScrapingRequest, db: Session = Depends(get_db)):
#     if not payload.term or not payload.city:
#         raise HTTPException(status_code=400, detail="Termo e cidade são obrigatórios.")
    
#     results = await scrape_google_maps(payload.term, payload.city)

#     return {
#         "status": "success",
#         "total_founded": len(results),
#         "data": results
#     }