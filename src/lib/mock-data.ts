/**
 * DADOS MOCKADOS — ISOLADOS PROPOSITALMENTE.
 * Nenhuma destas informações vem do backend hoje. Substituir por dados reais
 * quando os endpoints correspondentes existirem. Nada aqui altera a busca de leads.
 */

export const dashboardMetrics = [
  { label: "Total de leads", value: "1.254", hint: "+124 nesta semana", icon: "users" },
  { label: "Oportunidades", value: "327", hint: "26% dos leads", icon: "target" },
  { label: "Contatados", value: "184", hint: "14,7% do total", icon: "send" },
  { label: "Respostas", value: "37", hint: "20,1% dos contatos", icon: "message" },
  { label: "Reuniões", value: "12", hint: "32,4% das respostas", icon: "calendar" },
  { label: "Clientes", value: "4", hint: "R$ 2.794 gerados", icon: "trophy" },
] as const;

export const funnelStages = [
  { label: "Leads", value: 1254 },
  { label: "Selecionados", value: 612 },
  { label: "Contatados", value: 184 },
  { label: "Respostas", value: 37 },
  { label: "Reuniões", value: 12 },
  { label: "Propostas", value: 7 },
  { label: "Clientes", value: 4 },
];

export const nichePerformance = [
  {
    niche: "Climatização",
    leads: 120,
    contacted: 60,
    replies: 13,
    meetings: 4,
    clients: 2,
    conversion: "3,3%",
  },
  {
    niche: "Guinchos",
    leads: 100,
    contacted: 50,
    replies: 3,
    meetings: 0,
    clients: 0,
    conversion: "0%",
  },
  {
    niche: "Assistência Técnica",
    leads: 90,
    contacted: 42,
    replies: 8,
    meetings: 2,
    clients: 1,
    conversion: "2,4%",
  },
];

export type Campaign = {
  name: string;
  niche: string;
  location: string;
  date: string;
  leads: number;
  opportunities: number;
  contacted: number;
  replies: number;
  meetings: number;
  clients: number;
  revenue: string;
  status: "Ativa" | "Pausada" | "Concluída";
};

export const campaigns: Campaign[] = [
  {
    name: "Climatização — Rio Grande",
    niche: "Climatização",
    location: "Rio Grande - RS",
    date: "08/09/2026",
    leads: 39,
    opportunities: 17,
    contacted: 12,
    replies: 3,
    meetings: 1,
    clients: 1,
    revenue: "R$ 497",
    status: "Ativa",
  },
  {
    name: "Guinchos — Pelotas",
    niche: "Guinchos",
    location: "Pelotas - RS",
    date: "07/09/2026",
    leads: 52,
    opportunities: 21,
    contacted: 18,
    replies: 2,
    meetings: 0,
    clients: 0,
    revenue: "R$ 0",
    status: "Ativa",
  },
  {
    name: "Assistência Técnica — São Paulo",
    niche: "Assistência Técnica",
    location: "São Paulo - SP",
    date: "06/09/2026",
    leads: 87,
    opportunities: 34,
    contacted: 40,
    replies: 9,
    meetings: 3,
    clients: 2,
    revenue: "R$ 2.297",
    status: "Concluída",
  },
];

export const recentSearches = [
  { term: "Climatização", city: "Rio Grande - RS", leads: 39, date: "08/09/2026" },
  { term: "Guinchos", city: "Pelotas - RS", leads: 52, date: "07/09/2026" },
  { term: "Assistência Técnica", city: "São Paulo - SP", leads: 87, date: "06/09/2026" },
];

export const PIPELINE_STAGES = [
  "Novo",
  "Contatado",
  "Respondeu",
  "Reunião",
  "Proposta",
  "Cliente",
  "Perdido",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type PipelineCard = {
  id: string;
  name: string;
  niche: string;
  city: string;
  score: number;
  lastContact: string;
  stage: PipelineStage;
  proposalValue?: string;
  closedValue?: string;
};

export const pipelineCards: PipelineCard[] = [
  {
    id: "1",
    name: "Climatizei",
    niche: "Climatização",
    city: "Rio Grande - RS",
    score: 94,
    lastContact: "08/09/2026",
    stage: "Novo",
  },
  {
    id: "2",
    name: "Ar Frio Serviços",
    niche: "Climatização",
    city: "Rio Grande - RS",
    score: 81,
    lastContact: "07/09/2026",
    stage: "Novo",
  },
  {
    id: "3",
    name: "Guincho 24h Sul",
    niche: "Guinchos",
    city: "Pelotas - RS",
    score: 77,
    lastContact: "06/09/2026",
    stage: "Contatado",
  },
  {
    id: "4",
    name: "TecFix Assistência",
    niche: "Assistência Técnica",
    city: "São Paulo - SP",
    score: 88,
    lastContact: "05/09/2026",
    stage: "Respondeu",
  },
  {
    id: "5",
    name: "Clima Norte",
    niche: "Climatização",
    city: "Pelotas - RS",
    score: 69,
    lastContact: "04/09/2026",
    stage: "Reunião",
  },
  {
    id: "6",
    name: "Reboque Já",
    niche: "Guinchos",
    city: "Rio Grande - RS",
    score: 72,
    lastContact: "03/09/2026",
    stage: "Proposta",
  },
  {
    id: "7",
    name: "Refrigera Sul",
    niche: "Climatização",
    city: "Rio Grande - RS",
    score: 91,
    lastContact: "01/09/2026",
    stage: "Cliente",
  },
];
