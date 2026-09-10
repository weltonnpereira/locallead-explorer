import asyncio
import httpx
import json
import re
import time
from datetime import datetime, timedelta
from hashlib import sha256
from typing import Dict, Any

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from database import config as database_config
from database.models import WebsiteAnalysis

ANALYSIS_CACHE: Dict[str, Dict[str, Any]] = {}
ANALYSIS_CACHE_TIMESTAMPS: Dict[str, float] = {}
DEFAULT_ANALYSIS_TTL_SECONDS = 24 * 60 * 60
ANALYSIS_LOCKS: Dict[str, asyncio.Lock] = {}

def _empty_analysis() -> Dict[str, Any]:
    return {
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

def _normalize_url(website_url: str) -> str:
    return website_url.strip().lower().rstrip("/")

def _redis_key(website_url: str) -> str:
    url_hash = sha256(website_url.encode("utf-8")).hexdigest()
    return f"website-analysis:{url_hash}"

def _analysis_from_model(record: WebsiteAnalysis) -> Dict[str, Any]:
    try:
        keywords = json.loads(record.keywords_found or "[]")
    except json.JSONDecodeError:
        keywords = []

    return {
        "has_website": record.has_website,
        "has_https": record.has_https,
        "has_whatsapp": record.has_whatsapp,
        "has_instagram": record.has_instagram,
        "has_form": record.has_form,
        "has_budget_cta": record.has_budget_cta,
        "has_phone_on_site": record.has_phone_on_site,
        "is_custom_domain": record.is_custom_domain,
        "site_status": record.site_status,
        "keywords_found": keywords,
    }


async def _get_redis_analysis(website_url: str) -> Dict[str, Any] | None:
    client = database_config.redis_client
    if not client:
        return None

    try:
        cached = await client.get(_redis_key(website_url))
        return json.loads(cached) if cached else None
    except Exception:
        return None


async def _set_redis_analysis(website_url: str, analysis: Dict[str, Any], ttl_seconds: int) -> None:
    client = database_config.redis_client
    if not client:
        return

    try:
        await client.set(_redis_key(website_url), json.dumps(analysis), ex=ttl_seconds)
    except Exception:
        pass


def _save_database_analysis(db: Session, website_url: str, analysis: Dict[str, Any]) -> None:
    values = {
        "website_url": website_url,
        "has_website": analysis["has_website"],
        "has_https": analysis["has_https"],
        "has_whatsapp": analysis["has_whatsapp"],
        "has_instagram": analysis["has_instagram"],
        "has_form": analysis["has_form"],
        "has_budget_cta": analysis["has_budget_cta"],
        "has_phone_on_site": analysis["has_phone_on_site"],
        "is_custom_domain": analysis["is_custom_domain"],
        "site_status": str(analysis["site_status"]) if analysis["site_status"] is not None else None,
        "keywords_found": json.dumps(analysis["keywords_found"]),
        "analyzed_at": datetime.utcnow(),
    }
    statement = insert(WebsiteAnalysis).values(**values)
    statement = statement.on_conflict_do_update(
        index_elements=[WebsiteAnalysis.website_url],
        set_={key: statement.excluded[key] for key in values if key != "website_url"},
    )
    db.execute(statement)
    db.flush()


async def get_cached_analysis(
    website_url: str | None,
    db: Session | None = None,
    ttl_seconds: int = DEFAULT_ANALYSIS_TTL_SECONDS,
) -> Dict[str, Any]:
    if not website_url:
        return _empty_analysis()

    normalized_url = _normalize_url(website_url)
    lock = ANALYSIS_LOCKS.setdefault(normalized_url, asyncio.Lock())

    async with lock:
        now = time.time()

        cached = ANALYSIS_CACHE.get(normalized_url)
        cached_at = ANALYSIS_CACHE_TIMESTAMPS.get(normalized_url)
        if cached and cached_at and (now - cached_at) < ttl_seconds:
            return cached

        redis_cached = await _get_redis_analysis(normalized_url)
        if redis_cached:
            ANALYSIS_CACHE[normalized_url] = redis_cached
            ANALYSIS_CACHE_TIMESTAMPS[normalized_url] = now
            return redis_cached

        if db:
            record = db.query(WebsiteAnalysis).filter(
                WebsiteAnalysis.website_url == normalized_url
            ).first()
            if record and record.analyzed_at >= datetime.utcnow() - timedelta(seconds=ttl_seconds):
                result = _analysis_from_model(record)
                ANALYSIS_CACHE[normalized_url] = result
                ANALYSIS_CACHE_TIMESTAMPS[normalized_url] = now
                await _set_redis_analysis(normalized_url, result, ttl_seconds)
                return result

        result = await analyze_digital_presence(normalized_url)
        ANALYSIS_CACHE[normalized_url] = result
        ANALYSIS_CACHE_TIMESTAMPS[normalized_url] = now
        await _set_redis_analysis(normalized_url, result, ttl_seconds)
        if db:
            _save_database_analysis(db, normalized_url, result)
        return result

async def analyze_digital_presence(website_url: str | None) -> Dict[str, Any]:
    analysis: Dict[str, Any] = {
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
   # para comitar
    if not website_url:
        return analysis
    
    analysis["has_website"] = True

    if not website_url.startswith(("http://", "https://")):
        website_url = f"https://{website_url}"
        
    analysis["has_https"] = website_url.startswith("https://")
    
    social_domains = [
        "instagram.com",
        "facebook.com",
        "wa.me",
        "api.whatsapp.com",
        "whatsapp.com",
        "linktr.ee",
    ]
    
    analysis["is_custom_domain"] = not any(
        domain in website_url.lower()
        for domain in social_domains
    )
    
    if not analysis["is_custom_domain"]:
        if "instagram.com" in website_url.lower():
            analysis["has_instagram"] = True

        if any(
            domain in website_url.lower()
            for domain in ["wa.me", "api.whatsapp.com", "whatsapp.com"]
        ):
            analysis["has_whatsapp"] = True

        return analysis
    
    try:
        async with httpx.AsyncClient(
            timeout=8.0,
            follow_redirects=True,
            verify=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 "
                    "(KHTML, like Gecko) "
                    "Chrome/120.0 Safari/537.36"
                )
            }
        ) as client:
            response = await client.get(website_url)
            
            analysis["site_status"] = response.status_code
            
            if response.status_code >= 400:
                return analysis
            
            html = response.text.lower()
            
            # whats
            if any(
                value in html
                for value in [
                    "wa.me/",
                    "api.whatsapp.com",
                    "whatsapp.com",
                ]
            ):
                analysis["has_whatsapp"] = True
                
            # insta
            if "instagram.com" in html:
                analysis["has_instagram"] = True
            
            # form
            if re.search(r"<form\b", html):
                analysis["has_form"] = True

            phone_pattern = r"""
                \(?\d{2}\)?
                [\s.-]?
                9?\d{4}
                [\s.-]?
                \d{4}
            """
            
            if re.search(phone_pattern, html, re.VERBOSE):
                analysis["has_phone_on_site"] = True
                
            keywords = [
                "orçamento",
                "orcamento",
                "solicite",
                "contato",
                "fale conosco",
                "fale com a gente",
                "peça seu orçamento",
                "peca seu orcamento",
                "ligue agora"
            ]
            
            for keyword in keywords:
                if keyword in html:
                    analysis["keywords_found"].append(keyword)

            if analysis["keywords_found"]:
                analysis["has_budget_cta"] = True
    except Exception:
        analysis["site_status"] = "error"
    
    return analysis