import type { Lead } from "@/lib/leads";

export type DigitalPresence = {
  site: boolean;
  whatsapp: boolean;
  instagram: boolean;
  form: boolean;
  https: boolean;
  responsive: boolean;
  quotePage: boolean;
};

export type ScoreFactor = { label: string; points: number };

export type LeadInsight = {
  score: number;
  factors: ScoreFactor[];
  presence: DigitalPresence;
  opportunities: string[];
  label: string;
};

export function getInsight(lead: Lead): LeadInsight {
  const site = Boolean(lead.website);

  const factors: ScoreFactor[] = (lead.factors || [])
    .filter((f) => f.label != null && f.points != null)
    .map((f) => ({
      label: String(f.label),
      points: Number(f.points),
    }));

  const opportunityLabels = factors.map((f) => f.label);

  const whatsapp =
    opportunityLabels.includes("WhatsApp confirmado") || /whatsapp/i.test(lead.website || "");

  const instagram =
    /instagram/i.test(lead.website || "") ||
    opportunityLabels.some((label) => /instagram/i.test(label));

  const form = !opportunityLabels.includes("Sem formulário de contato");
  const https = site && !lead.website?.startsWith("http://");
  const responsive = false;
  const quotePage = !opportunityLabels.includes("Sem CTA de orçamento");

  const score = lead.score ?? 0;
  const label = factors[0]?.label || "Oportunidade padrão";

  return {
    score,
    factors,
    presence: { site, whatsapp, instagram, form, https, responsive, quotePage },
    opportunities: opportunityLabels.length ? opportunityLabels : ["Oportunidade padrão"],
    label,
  };
}

export function suggestionFor(lead: Lead, insight: LeadInsight) {
  const first = insight.opportunities[0] ?? "";
  return `Olá, tudo bem? Encontrei a ${lead.name} pelo Google${
    lead.rating ? ` e vi que vocês têm ${lead.rating.toFixed(1)} de avaliação` : ""
  }. ${first} Posso te mostrar rapidamente como isso pode gerar mais pedidos de orçamento?`;
}
