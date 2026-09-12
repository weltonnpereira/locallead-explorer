import re
import unicodedata
import urllib.parse
from datetime import datetime
from sqlalchemy.orm import Session
from database.models import Lead, Search
from sqlalchemy.dialects.postgresql import insert

def normalize_string(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('utf-8')
    return re.sub(r'\s+', '', text).lower()

def extract_digits(text: str) -> str:
    return re.sub(r'\D', '', text) if text else ""

def is_valid_address(address: str | None) -> bool:
    if not address:
        return False

    normalized = " ".join(address.split()).casefold()
    invalid_fragments = (
        "aberto",
        "fecha",
        "fechado",
        "open",
        "closes",
        "horário",
        "hours",
    )
    return (
        len(normalized) >= 8
        and any(character.isdigit() for character in normalized)
        and not any(fragment in normalized for fragment in invalid_fragments)
    )

def canonical_maps_url(url: str | None) -> str | None:
    if not url:
        return None
    place_match = re.search(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+)", url, re.IGNORECASE)
    if place_match:
        return f"google-place:{place_match.group(1).lower()}"
    parsed = urllib.parse.urlsplit(url)
    return f"{parsed.netloc}{parsed.path}".rstrip("/").lower()

def lead_batch_identity(item: dict) -> tuple[str, str]:
    phone_digits = extract_digits(item.get("phone", ""))
    if len(phone_digits) >= 8:
        return "phone", phone_digits[-8:]

    name = normalize_string(item.get("name"))
    address = normalize_string(item.get("address"))
    return "name-address", f"{name}:{address}"

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
    seen_batch_urls: set[str] = set()
    seen_batch_identities: set[tuple[str, str]] = set()
    existing_by_canonical_url = {
        canonical_maps_url(lead.google_maps_url): lead
        for lead in db.query(Lead).filter(Lead.google_maps_url.is_not(None)).all()
        if canonical_maps_url(lead.google_maps_url)
    }

    for item in scraped_leads:
        address = item.get("address") if is_valid_address(item.get("address")) else None
        maps_url = item.get("google_maps_url")
        canonical_url = canonical_maps_url(maps_url)
        identity = lead_batch_identity({**item, "address": address})
        if canonical_url and canonical_url in seen_batch_urls:
            continue
        has_strong_identity = identity[0] == "phone" or bool(identity[1].split(":", 1)[-1])
        if has_strong_identity and identity in seen_batch_identities:
            continue
        if canonical_url:
            seen_batch_urls.add(canonical_url)
        seen_batch_identities.add(identity)
        existing = existing_by_canonical_url.get(canonical_url) if canonical_url else None

        if existing:
            existing.phone = item.get("phone") if item.get("phone") is not None else existing.phone
            if is_valid_address(item.get("address")):
                existing.address = item["address"]
            existing.website = item.get("website") if item.get("website") is not None else existing.website
            existing.google_rating = item.get("rating") if item.get("rating") is not None else existing.google_rating
            existing.google_reviews = item.get("reviews") if item.get("reviews") is not None else existing.google_reviews
            if item.get("opportunity_score") is not None:
                existing.score = item["opportunity_score"]
            if item.get("opportunity_factors") is not None:
                existing.opportunity_factors = item["opportunity_factors"]
            if not item.get("_skipped_refresh"):
                existing.last_scraped_at = datetime.utcnow()
            if search not in existing.searches:
                existing.searches.append(search)
            updated += 1
            continue

        stmt = insert(Lead).values(
            name=item.get("name"),
            category=item.get("category"),
            phone=item.get("phone"),
            address=address,
            city=item.get("city"),
            google_rating=item.get("rating"),
            google_reviews=item.get("reviews"),
            website=item.get("website"),
            google_maps_url=item.get("google_maps_url"),
            score=item.get("opportunity_score"),
            opportunity_factors=item.get("opportunity_factors"),
            last_scraped_at=datetime.utcnow(),
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[Lead.google_maps_url],
            set_={
                "name": stmt.excluded.name,
                "category": stmt.excluded.category,
                "phone": stmt.excluded.phone,
                "address": stmt.excluded.address,
                "city": stmt.excluded.city,
                "google_rating": stmt.excluded.google_rating,
                "google_reviews": stmt.excluded.google_reviews,
                "website": stmt.excluded.website,
                "score": stmt.excluded.score,
                "last_scraped_at": stmt.excluded.last_scraped_at,
            }
        )

        db.execute(stmt)
        db.flush()

        lead = existing_by_canonical_url.get(canonical_maps_url(maps_url)) if maps_url else None
        if lead is None and maps_url:
            lead = db.query(Lead).filter(Lead.google_maps_url == maps_url).first()
        if lead and search not in lead.searches:
            lead.searches.append(search)
        if lead and canonical_maps_url(lead.google_maps_url):
            existing_by_canonical_url[canonical_maps_url(lead.google_maps_url)] = lead
        inserted += 1

    db.commit()
    return {"inserted": inserted, "updated": updated}
    