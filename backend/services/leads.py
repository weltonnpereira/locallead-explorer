import re
import unicodedata
from sqlalchemy.orm import Session
from database.models import Lead, Search
# para comitar
def normalize_string(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('utf-8')
    return re.sub(r'\s+', '', text).lower()

def extract_digits(text: str) -> str:
    return re.sub(r'\D', '', text) if text else ""

def find_existing_lead(db: Session, lead_data: dict) -> Lead | None:
    maps_url = lead_data.get("google_maps_url")
    if maps_url:
        existing = db.query(Lead).filter(Lead.google_maps_url == maps_url).first()
        if existing:
            return existing

    phone_digits = extract_digits(lead_data.get("phone", ""))
    if len(phone_digits) >= 8:
        main_number = phone_digits[-8:]
        existing = db.query(Lead).filter(Lead.phone.like(f"%{main_number}%")).first()
        if existing:
            return existing
        
    normalized_name = normalize_string(lead_data.get("name"))
    
    if normalized_name:
        candidates = db.query(Lead).all()
        for cand in candidates:
            if normalize_string(cand.name) == normalized_name:
                cand_addr = normalize_string(cand.address)
                new_addr = normalize_string(lead_data.get("address"))
                # Se o endereço for similar ou se não houver endereço registrado mas o nome bate exato
                if cand_addr and new_addr and (cand_addr in new_addr or new_addr in cand_addr):
                    return cand
    return None

def save_scraped_leads(db: Session, scraped_leads: list, search: Search) -> dict:
    inserted = 0
    updated = 0

    for item in scraped_leads:
        existing = find_existing_lead(db, item)

        if existing:
            if search not in existing.searches:
                existing.searches.append(search)
                
            # Usa o novo valor se não for None; mantém o antigo caso contrário.
            # Evita usar `or` pois 0 e 0.0 são falsy e seriam descartados incorretamente.
            new_phone = item.get("phone")
            new_address = item.get("address")
            new_website = item.get("website")
            new_rating = item.get("rating")
            new_reviews = item.get("reviews")

            existing.phone = new_phone if new_phone is not None else existing.phone
            existing.address = new_address if new_address is not None else existing.address
            existing.website = new_website if new_website is not None else existing.website
            existing.google_rating = new_rating if new_rating is not None else existing.google_rating
            existing.google_reviews = new_reviews if new_reviews is not None else existing.google_reviews
            existing.score = item.get("opportunity_score")
            existing.opportunity = item.get("opportunity_reason")
                
            updated += 1
        else:
            new_lead = Lead(
                name=item.get("name"),
                category=item.get("category"),
                phone=item.get("phone"),
                address=item.get("address"),
                city=item.get("city"),
                google_rating=item.get("rating"),
                google_reviews=item.get("reviews"),
                website=item.get("website"),
                google_maps_url=item.get("google_maps_url"),
                score=item.get("opportunity_score"),
                opportunity=item.get("opportunity_reason")
            )
            new_lead.searches.append(search)
            db.add(new_lead)
            inserted += 1

    db.commit()
    return {"inserted": inserted, "updated": updated}
    