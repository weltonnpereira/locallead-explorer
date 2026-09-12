from typing import Dict, Any, Tuple

def calculate_opportunity_score(
    lead_data: Dict[str, Any],
    analysis: Dict[str, Any]
) -> Tuple[float, str, list[dict[str, Any]]]:

    score = 0.0
    reasons = []
    factors = []

    def add_factor(label: str, points: float):
        nonlocal score
        score += points
        reasons.append(label)
        factors.append({
            "label": label,
            "points": points
        })

    if not analysis.get("has_website"):
        add_factor("Sem site", 50)
    else:
        if not analysis.get("is_custom_domain"):
            add_factor("Presença digital em domínio de terceiros", 15)

        if not analysis.get("has_whatsapp"):
            add_factor("Site sem WhatsApp", 15)

        if not analysis.get("has_form"):
            add_factor("Sem formulário de contato", 15)

        if not analysis.get("has_budget_cta"):
            add_factor("Sem CTA de orçamento", 15)

    reviews = (
        lead_data.get("google_reviews")
        or lead_data.get("reviews")
        or 0
    )

    if reviews >= 100:
        add_factor("Muitas avaliações", 15)
    elif reviews >= 30:
        add_factor("Boa quantidade de avaliações", 10)

    rating = (
        lead_data.get("google_rating")
        or lead_data.get("rating")
        or 0
    )

    if rating >= 4.5:
        add_factor("Ótima reputação", 15)

    if analysis.get("has_whatsapp"):
        add_factor("WhatsApp confirmado", 15)

    if (
        analysis.get("has_https")
        and analysis.get("has_form")
        and analysis.get("has_whatsapp")
        and analysis.get("has_budget_cta")
    ):
        score -= 25

        factors.append({
            "label": "Presença digital bem estruturada",
            "points": -25
        })
        reasons.append("Presença digital bem estruturada")

    final_score = max(0.0, min(100.0, score))

    return final_score, factors