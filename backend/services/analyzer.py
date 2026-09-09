import httpx
import re
from typing import Dict, Any

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