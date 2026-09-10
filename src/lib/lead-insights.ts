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

export type ScoreFactor = { points: number; label: string };

export type LeadInsight = {
  score: number;
  factors: ScoreFactor[];
  presence: DigitalPresence;
  opportunities: string[];
  label: string;
};

export function getInsight(lead: Lead): LeadInsight {
  const site = Boolean(lead.website);
  const reasons = (lead.opportunity || "")
    .split("\n")
    .map((reason) => reason.trim())
    .filter(Boolean);
  const whatsapp = reasons.includes("WhatsApp confirmado") || /whatsapp/i.test(lead.website || "");
  const instagram =
    /instagram/i.test(lead.website || "") || reasons.some((reason) => /instagram/i.test(reason));
  const form = !reasons.includes("Sem formulário de contato");
  const https = site && !lead.website?.startsWith("http://");
  const responsive = false;
  const quotePage = !reasons.includes("Sem CTA de orçamento");

  const factors: ScoreFactor[] = reasons.map((reason) => ({ points: 0, label: reason }));
  const score = lead.score ?? 0;

  const opportunities = reasons.length ? reasons : ["Oportunidade padrão"];

  const label = reasons[0] || "Oportunidade padrão";

  return {
    score,
    factors,
    presence: { site, whatsapp, instagram, form, https, responsive, quotePage },
    opportunities,
    label,
  };
}

export function suggestionFor(lead: Lead, insight: LeadInsight) {
  const first = insight.opportunities[0] ?? "";
  return `Olá, tudo bem? Encontrei a ${lead.name} pelo Google${
    lead.rating ? ` e vi que vocês têm ${lead.rating.toFixed(1)} de avaliação` : ""
  }. ${first} Posso te mostrar rapidamente como isso pode gerar mais pedidos de orçamento?`;
}
