import { DashboardData } from "@/schemas/dashboard";
import { Lead, LeadStatus, OpportunityFactor } from "@/schemas/lead";
import { SearchHistoryItem, SearchProgress } from "@/schemas/search";
import { PayloadScript, Script } from "@/schemas/script";
import { Campaign } from "@/schemas/campaign";
export type { Campaign };
export type { Script };
export type { Lead };
export type { SearchProgress };
export type { LeadStatus };
export type { SearchHistoryItem };
export type { DashboardData };

const API_ROOT = "http://127.0.0.1:8000/api/v1";

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(row: Record<string, unknown>): Lead {
  const id = toNumber(row["id"]);
  return {
    name: pick(row, ["name", "nome", "title", "business_name"]) || "Sem nome",
    phone: pick(row, ["phone", "telefone", "phone_number", "whatsapp"]),
    address: pick(row, ["address", "endereco", "endereço", "full_address", "location"]),
    rating: toNumber(row["google_rating"] ?? row["nota"] ?? row["rating"] ?? row["stars"]),
    reviews:
      toNumber(
        row["google_reviews"] ?? row["avaliacoes"] ?? row["reviews"] ?? row["user_ratings_total"],
      ) ?? 0,
    website: pick(row, ["website", "site", "url", "web"]) || null,
    score: toNumber(row["score"] ?? row["opportunity_score"]),
    ...(typeof row["status"] === "string" ? { status: row["status"] as LeadStatus } : {}),
    ...(typeof row["in_prospecting"] === "boolean"
      ? { in_prospecting: row["in_prospecting"] }
      : {}),
    ...(typeof row["proposal_value"] === "number" ? { proposal_value: row["proposal_value"] } : {}),
    ...(typeof row["deal_value"] === "number" ? { deal_value: row["deal_value"] } : {}),
    ...(typeof row["deal_closed_at"] === "string" ? { deal_closed_at: row["deal_closed_at"] } : {}),
    notes: typeof row["notes"] === "string" ? row["notes"] : null,
    ...(id !== null ? { id } : {}),
    ...(Array.isArray(row["factors"])
      ? { factors: row["factors"] as OpportunityFactor[] }
      : { factors: [] }),
  };
}

export async function addLeadsToProspecting(leadIds: number[]): Promise<void> {
  const response = await fetch(`${API_ROOT}/leads/prospecting`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadIds),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function deleteLead(leadIds: number[]): Promise<void> {
  const response = await fetch(`${API_ROOT}/leads/`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadIds),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function fetchProspectingLeads(campaignId?: number): Promise<Lead[]> {
  let url = `${API_ROOT}/leads?prospecting=true&limit=100`;
  if (campaignId) {
    url += `&campaign_id=${campaignId}`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as unknown;
  return Array.isArray(payload)
    ? payload
        .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
        .map(normalize)
    : [];
}

export async function fetchAllLeads(): Promise<Lead[]> {
  const response = await fetch(`${API_ROOT}/leads?limit=100`);
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as unknown;
  return Array.isArray(payload)
    ? payload
        .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
        .map(normalize)
    : [];
}

export async function fetchLeadsBySearch(searchId: number): Promise<Lead[]> {
  const response = await fetch(`${API_ROOT}/leads?search_id=${searchId}&limit=100`);
  if (!response.ok) throw new Error(await readError(response));
  const payload = (await response.json()) as unknown;
  return Array.isArray(payload)
    ? payload
        .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
        .map(normalize)
    : [];
}

export async function fetchSearchHistory(): Promise<SearchHistoryItem[]> {
  const response = await fetch(`${API_ROOT}/searches?limit=100`);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as SearchHistoryItem[];
}

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_ROOT}/dashboard`);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as DashboardData;
}

export async function fetchCampaigns(prospecting: boolean): Promise<Campaign[]> {
  let url = `${API_ROOT}/campaigns`;
  if (prospecting) {
    url += `?prospecting=${prospecting}`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Campaign[];
}

export async function fetchScripts(): Promise<Script[]> {
  const response = await fetch(`${API_ROOT}/scripts`);
  if (!response.ok) throw new Error(await readError(response));
  console.log(response.json);
  return (await response.json()) as Script[];
}

export async function createCampaign(input: {
  name: string;
  category: string;
  city: string;
}): Promise<Campaign> {
  const response = await fetch(`${API_ROOT}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Campaign;
}

export async function addLeadsToCampaign(campaignId: number, leadIds: number[]): Promise<void> {
  const response = await fetch(`${API_ROOT}/campaigns/${campaignId}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(leadIds),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function updateLeadStatus(
  id: number,
  status: LeadStatus,
  extraValue?: number,
): Promise<void> {
  const payload: Record<string, unknown> = { status };

  if (status === "PROPOSAL" && extraValue) {
    payload["proposal_value"] = extraValue;
  } else if (status === "CUSTOMER" && extraValue) {
    payload["deal_value"] = extraValue;
  }

  const response = await fetch(`${API_ROOT}/leads/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await readError(response));
}

export async function updateLeadNotes(id: number, notes: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/leads/${id}/notes`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function updateLeadProposal(id: number, value: number): Promise<void> {
  const response = await fetch(`${API_ROOT}/leads/${id}/proposal`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function updateLeadDeal(id: number, value: number, closedAt?: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/leads/${id}/deal`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value, closed_at: closedAt }),
  });
  if (!response.ok) throw new Error(await readError(response));
}

async function readError(response: Response): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return data.detail || `Erro HTTP: ${response.status}`;
}

export async function fetchLeads(
  category: string,
  city: string,
  onProgress?: (progress: SearchProgress) => void,
): Promise<Lead[]> {
  const response = await fetch(`${API_ROOT}/leads/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term: category.trim(), city: city.trim() }),
  });

  if (!response.ok) throw new Error(await readError(response));
  const { search_id: searchId } = (await response.json()) as { search_id: number };
  await waitForSearch(searchId, onProgress);

  const leadsResponse = await fetch(`${API_ROOT}/leads?limit=100`);
  if (!leadsResponse.ok) throw new Error(await readError(leadsResponse));
  const payload = (await leadsResponse.json()) as unknown;
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map(normalize);
}

async function waitForSearch(
  searchId: number,
  onProgress?: (progress: SearchProgress) => void,
): Promise<void> {
  const websocketUrl = `${API_ROOT.replace(/^http/, "ws")}/ws/leads/search/${searchId}`;
  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(websocketUrl);
    socket.onmessage = (event) => {
      const update = JSON.parse(event.data) as {
        status?: string;
        message?: string;
        error?: string;
        progress?: number;
        processed?: number;
        total?: number;
      };
      const progress: SearchProgress = {
        status: (update.status || "running") as SearchProgress["status"],
        progress: update.progress ?? 0,
        message: update.message || "Processando busca...",
        ...(update.processed !== undefined ? { processed: update.processed } : {}),
        ...(update.total !== undefined ? { total: update.total } : {}),
      };
      onProgress?.(progress);
      if (update.status === "completed") {
        socket.close();
        resolve();
      } else if (update.status === "failed") {
        socket.close();
        reject(new Error(update.error || update.message || "A busca falhou."));
      }
    };
    socket.onerror = () => reject(new Error("Não foi possível acompanhar o progresso da busca."));
  });
}

export async function createScript(payload: PayloadScript): Promise<Script> {
  const response = await fetch(`${API_ROOT}/scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Script;
}

export async function editScript(id: number, payload: PayloadScript): Promise<Script> {
  const response = await fetch(`${API_ROOT}/scripts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as Script;
}

export async function deleteScript(id: number): Promise<void> {
  const response = await fetch(`${API_ROOT}/scripts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await readError(response));
}

/** Monta o link do WhatsApp a partir de um telefone em qualquer formato. */
export function whatsappLink(phone: string | null): string | null {
  let digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (!digits.startsWith("55")) digits = `55${digits}`;
  if (digits.length < 12) return null;
  return `https://wa.me/${digits}`;
}
