export type Lead = {
  id?: number;
  name: string;
  phone: string | null;
  address: string | null;
  rating: number | null;
  reviews: number;
  website: string | null;
  google_maps_url?: string | null;
  score?: number | null;
  opportunity?: string | null;
  status?: LeadStatus;
  in_prospecting?: boolean;
};

export type LeadStatus =
  "NEW" | "CONTACTED" | "REPLIED" | "MEETING" | "PROPOSAL" | "CUSTOMER" | "LOST";

export type SearchProgress = {
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  processed?: number;
  total?: number;
};

export type SearchHistoryItem = {
  id: number;
  term: string;
  city: string;
  leads: number;
  created_at: string;
};

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
    opportunity: pick(row, ["opportunity", "opportunity_reason"]) || null,
    ...(typeof row["status"] === "string" ? { status: row["status"] as LeadStatus } : {}),
    ...(typeof row["in_prospecting"] === "boolean"
      ? { in_prospecting: row["in_prospecting"] }
      : {}),
    ...(id !== null ? { id } : {}),
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

export async function fetchProspectingLeads(): Promise<Lead[]> {
  const response = await fetch(`${API_ROOT}/leads?prospecting=true&limit=100`);
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

export async function updateLeadStatus(id: number, status: LeadStatus): Promise<void> {
  const response = await fetch(`${API_ROOT}/leads/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error(await readError(response));
}

async function readError(response: Response): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return data.detail || `Erro HTTP: ${response.status}`;
}

/** Inicia a busca no backend e acompanha seu progresso pelo WebSocket. */
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

/** Monta o link do WhatsApp a partir de um telefone em qualquer formato. */
export function whatsappLink(phone: string | null): string | null {
  let digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (!digits.startsWith("55")) digits = `55${digits}`;
  if (digits.length < 12) return null;
  return `https://wa.me/${digits}`;
}
