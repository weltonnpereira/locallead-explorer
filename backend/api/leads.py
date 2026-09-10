import json
import asyncio
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime

from database import config as database_config
from database.config import SessionLocal, clear_leads_cache, get_db
from database.models import Lead, LeadStatus, Search
from schemas.lead import NotesUpdateRequest, ScrapingRequest, StatusUpdateRequest, LeadResponse
from services.leads import save_scraped_leads
from services.scraper import canonical_maps_url, scrape_google_maps
from services.analyzer import get_cached_analysis
from services.rate_limit import read_rate_limit, search_rate_limit, write_rate_limit
from services.search_progress import get_progress, publish, subscribe, unsubscribe
from services.scoring import calculate_opportunity_score

router = APIRouter(
    prefix="/api/v1",
    tags=["CRM"]
)

async def _analyze_lead_with_limit(data: dict, sem: asyncio.Semaphore, db: Session):
    async with sem:
        if data.get("_skipped_refresh"):
            return data
        website = data.get("website")
        if website:
            analysis = await get_cached_analysis(website, db=db)
        else:
            analysis = {
                "has_website": False,
                "has_https": False,
                "has_whatsapp": False,
                "has_instagram": False,
                "has_form": False,
                "has_budget_cta": False,
                "has_phone_on_site": False,
                "is_custom_domain": False,
                "site_status": None,
                "keywords_found": [],
            }
        score, opportunity = calculate_opportunity_score(data, analysis)
        data["opportunity_score"] = score
        data["opportunity_reason"] = opportunity
        return data

async def _run_search(search_id: int, term: str, city: str) -> None:
    db = SessionLocal()
    try:
        await publish(search_id, status="running", progress=5, message="Preparando a busca...")
        known_leads = {
            canonical_maps_url(lead.google_maps_url): lead.last_scraped_at
            for lead in db.query(Lead).filter(Lead.google_maps_url.is_not(None)).all()
            if canonical_maps_url(lead.google_maps_url)
        }
        await publish(search_id, status="running", progress=15, message="Carregando resultados do Google Maps...")
        raw_leads = await scrape_google_maps(term, city, known_leads=known_leads)
        search = db.query(Search).filter(Search.id == search_id).first()
        if not search:
            raise RuntimeError("Busca não encontrada")
        search.total_found = len(raw_leads)

        semaphore = asyncio.Semaphore(5)
        total = len(raw_leads)
        processed = []
        for index, data in enumerate(raw_leads, start=1):
            processed.append(await _analyze_lead_with_limit(data, semaphore, db))
            progress = 20 + int(index / max(total, 1) * 60)
            await publish(
                search_id,
                status="running",
                progress=progress,
                message=f"Analisando lead {index} de {total}...",
                processed=index,
                total=total,
            )

        summary = save_scraped_leads(db, processed, search)
        db.commit()
        await clear_leads_cache()
        await publish(search_id, status="completed", progress=100, message="Busca concluída.", summary=summary)
    except Exception as error:
        db.rollback()
        await publish(search_id, status="failed", progress=100, message="A busca falhou.", error=str(error))
    finally:
        db.close()


@router.post("/leads/search", dependencies=[Depends(search_rate_limit)], status_code=202)
async def create_search(payload: ScrapingRequest, db: Session = Depends(get_db)):
    if not payload.term or not payload.city:
        raise HTTPException(status_code=400, detail="Termo e cidade são obrigatórios.")

    search = Search(category=payload.term, location=payload.city)
    db.add(search)
    db.commit()
    await publish(search.id, status="queued", progress=0, message="Busca colocada na fila.")
    asyncio.create_task(_run_search(search.id, payload.term, payload.city))
    return {"search_id": search.id, "status": "queued"}


@router.websocket("/ws/leads/search/{search_id}")
async def search_progress_socket(websocket: WebSocket, search_id: int):
    await websocket.accept()
    queue = await subscribe(search_id)
    try:
        while True:
            event = await queue.get()
            await websocket.send_json(event)
            if event.get("status") in {"completed", "failed"}:
                break
    except WebSocketDisconnect:
        pass
    finally:
        unsubscribe(search_id, queue)

@router.get("/leads/count", dependencies=[Depends(read_rate_limit)])
def get_leads_count(db: Session = Depends(get_db)):
    total_leads = db.query(Lead).count()
    return {"total": total_leads}


@router.get("/searches", dependencies=[Depends(read_rate_limit)])
def list_searches(limit: int = 50, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 100)
    searches = db.query(Search).order_by(Search.created_at.desc()).limit(limit).all()
    return [
        {
            "id": search.id,
            "term": search.category,
            "city": search.location,
            "leads": search.total_found or 0,
            "created_at": search.created_at,
        }
        for search in searches
    ]

@router.get("/leads", dependencies=[Depends(read_rate_limit)])
async def list_leads(
    skip: int = 0,
    limit: int = 50,
    prospecting: bool = False,
    search_id: int | None = None,
    db: Session = Depends(get_db),
):
    skip = max(skip, 0)
    limit = min(max(limit, 1), 100)
    cache_key = f"leads:v3:skip:{skip}:limit:{limit}:prospecting:{prospecting}:search:{search_id}"
    
    redis = database_config.redis_client
    if redis:
        try:
            cached_leads = await redis.get(cache_key)
            if cached_leads:
                return json.loads(cached_leads)
        except Exception:
            redis = None
    
    query = db.query(Lead)
    if prospecting:
        query = query.filter(Lead.in_prospecting.is_(True))
    if search_id is not None:
        query = query.filter(Lead.searches.any(Search.id == search_id))
    leads = query.order_by(Lead.score.desc()).offset(skip).limit(limit).all()
    
    leads_list_json = []
    seen_leads = set()
    for lead in leads:
        identity = canonical_maps_url(lead.google_maps_url)
        if not identity:
            identity = f"id:{lead.id}"
        if identity in seen_leads:
            continue
        seen_leads.add(identity)
        leads_list_json.append(LeadResponse(
            id=lead.id,
            name=lead.name,
            phone=lead.phone,
            address=lead.address,
            website=lead.website,
            google_maps_url=lead.google_maps_url,
            google_rating=lead.google_rating,
            google_reviews=lead.google_reviews,
            opportunity_score=lead.score,
            opportunity_reason=lead.opportunity,
            status=lead.status,
            notes=lead.notes,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
            in_prospecting=lead.in_prospecting,
        ).model_dump(mode="json"))
    
    if redis:
        try:
            await redis.set(cache_key, json.dumps(leads_list_json), ex=300)
        except Exception:
            pass
    
    return leads_list_json


@router.post("/leads/prospecting", dependencies=[Depends(write_rate_limit)])
async def add_to_prospecting(lead_ids: list[int], db: Session = Depends(get_db)):
    unique_ids = list(dict.fromkeys(lead_ids))
    if not unique_ids or len(unique_ids) > 100:
        raise HTTPException(status_code=400, detail="Envie entre 1 e 100 leads.")

    leads = db.query(Lead).filter(Lead.id.in_(unique_ids)).all()
    found_ids = {lead.id for lead in leads}
    missing_ids = [lead_id for lead_id in unique_ids if lead_id not in found_ids]
    if missing_ids:
        raise HTTPException(status_code=404, detail="Um ou mais leads não foram encontrados.")

    for lead in leads:
        lead.in_prospecting = True
    db.commit()
    await clear_leads_cache()
    return {"updated": len(leads), "lead_ids": unique_ids}
    

@router.get("/leads/{lead_id}", dependencies=[Depends(read_rate_limit)])
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

# no futuro por isso pode ser atualizado a todo momento podemos simplesmente adicionar em um cache
# primeiro e depois trabalhar em escrever na tabela permanentemente
@router.patch("/leads/{lead_id}/status", dependencies=[Depends(write_rate_limit)])
async def update_status(lead_id: int, payload: StatusUpdateRequest, db: Session = Depends(get_db)):
    """Move o lead pelo Kanban (NEW, CONTACTED, etc)"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = payload.status
    if payload.status != LeadStatus.NEW:
        lead.last_contact_at = datetime.utcnow()
        
    db.commit()
    db.refresh(lead)
    await clear_leads_cache()
    return lead

@router.patch("/leads/{lead_id}/notes", dependencies=[Depends(write_rate_limit)])
async def update_notes(lead_id: int, payload: NotesUpdateRequest, db: Session = Depends(get_db)):
    """Adiciona anotações pós-ligação/contato"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.notes = payload.notes
    db.commit()
    db.refresh(lead)
    
    await clear_leads_cache()  # Clear the cache after updating notes
    
    return lead