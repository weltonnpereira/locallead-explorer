from typing import Dict, Any, Tuple

def calculate_opportunity_score(
    lead_data: Dict[str, Any],
    analysis: Dict[str, Any]
) -> Tuple[float, str]:

    score = 0.0
    reasons = []
    
    # site

    if not analysis.get("has_website"):
        score += 35
        reasons.append("Sem site")

    else:
        if not analysis.get("is_custom_domain"):
            score += 10
            reasons.append("Presença digital em domínio de terceiros")

        if not analysis.get("has_whatsapp"):
            score += 10
            reasons.append("Site sem WhatsApp")

        if not analysis.get("has_form"):
            score += 10
            reasons.append("Sem formulário de contato")

        if not analysis.get("has_budget_cta"):
            score += 10
            reasons.append("Sem CTA de orçamento")
            
    # google
    reviews = lead_data.get("google_reviews") or lead_data.get("reviews") or 0

    if reviews >= 100:
        score += 10
        reasons.append("Muitas avaliações")

    elif reviews >= 30:
        score += 5
        reasons.append("Boa quantidade de avaliações")

    rating = lead_data.get("google_rating") or lead_data.get("rating") or 0

    if rating >= 4.5:
        score += 10
        reasons.append("Ótima reputação")

    # contato

    if analysis.get("has_whatsapp"):
        score += 10
        reasons.append("WhatsApp confirmado")

    # reducao

    if (
        analysis.get("has_https")
        and analysis.get("has_form")
        and analysis.get("has_whatsapp")
        and analysis.get("has_budget_cta")
    ):
        score -= 20
        reasons.append("Presença digital bem estruturada")

    # limit

    final_score = max(
        0.0,
        min(100.0, score)
    )

    opportunity = "\n".join(reasons)

    if not opportunity:
        opportunity = "Oportunidade padrão"

    return final_score, opportunity