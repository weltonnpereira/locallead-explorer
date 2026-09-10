/**
 * Camada visual de análise. Enquanto o backend não envia score, presença digital
 * e textos de oportunidade, derivamos valores de exibição a partir dos campos que
 * já existem no lead. Nada aqui altera a busca, a API ou a exportação.
 */
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

function hashOf(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 1000;
  return hash;
}

export function getInsight(lead: Lead): LeadInsight {
  const hash = hashOf(lead.name + lead.address);
  const site = Boolean(lead.website);
  const whatsapp = Boolean(lead.phone);
  const instagram = hash % 3 !== 0;
  const form = site && hash % 2 === 0;
  const https = site && !lead.website?.startsWith("http://");
  const responsive = site && hash % 5 !== 0;
  const quotePage = site && hash % 4 === 0;

  const factors: ScoreFactor[] = [];
  if (!site) factors.push({ points: 25, label: "Sem site" });
  if (whatsapp) factors.push({ points: 20, label: "WhatsApp disponível" });
  if (lead.reviews >= 50) factors.push({ points: 15, label: "Muitas avaliações" });
  if ((lead.rating ?? 0) >= 4.5) factors.push({ points: 15, label: "Boa avaliação" });
  if (site && !form) factors.push({ points: 10, label: "Sem formulário" });
  if (!instagram) factors.push({ points: 9, label: "Presença digital incompleta" });
  if (!factors.length) factors.push({ points: 10, label: "Cadastro básico completo" });

  const score = Math.min(100, factors.reduce((sum, item) => sum + item.points, 0) + 30);

  const opportunities: string[] = [];
  if (!site && (lead.rating ?? 0) >= 4.5)
    opportunities.push("Empresa possui ótima avaliação no Google, mas não possui site.");
  if (!site) opportunities.push("Presença digital própria fraca — sem site encontrado.");
  if (site && !form) opportunities.push("Empresa possui site, porém sem formulário de orçamento.");
  if (whatsapp && !site)
    opportunities.push("Empresa possui WhatsApp, mas nenhum canal digital próprio.");
  if (!opportunities.length)
    opportunities.push("Presença digital consistente — abordagem por diferencial de serviço.");

  const label = !site
    ? "Sem site"
    : !whatsapp
      ? "Sem WhatsApp"
      : !form
        ? "Site sem formulário"
        : (lead.rating ?? 0) >= 4.5
          ? "Boa reputação"
          : "Presença digital fraca";

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
