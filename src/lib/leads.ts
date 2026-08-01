export type Lead = {
  name: string;
  phone: string;
  address: string;
  rating: number | null;
  reviews: number;
  website: string;
};

const API_URL = "http://localhost:8000/api/v1/scrape";

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
  return {
    name: pick(row, ["name", "nome", "title", "business_name"]) || "Sem nome",
    phone: pick(row, ["phone", "telefone", "phone_number", "whatsapp"]),
    address: pick(row, ["address", "endereco", "endereço", "full_address", "location"]),
    rating: toNumber(row["rating"] ?? row["nota"] ?? row["score"] ?? row["stars"]),
    reviews: toNumber(row["reviews"] ?? row["avaliacoes"] ?? row["reviews_count"] ?? row["user_ratings_total"]) ?? 0,
    website: pick(row, ["website", "site", "url", "web"]),
  };
}

/** Chama o backend Python de scraping de negócios locais. */
export async function fetchLeads(category: string, city: string): Promise<Lead[]> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term: category.trim(), city: city.trim() }),
  });

  if (!response.ok) {
    throw new Error(`A API respondeu com status ${response.status}`);
  }

  const payload: unknown = await response.json();
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { results?: unknown[] })?.results)
      ? (payload as { results: unknown[] }).results
      : Array.isArray((payload as { data?: unknown[] })?.data)
        ? (payload as { data: unknown[] }).data
        : Array.isArray((payload as { leads?: unknown[] })?.leads)
          ? (payload as { leads: unknown[] }).leads
          : [];

  return rows.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null).map(normalize);
}

/** Monta o link do WhatsApp a partir de um telefone em qualquer formato. */
export function whatsappLink(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (!digits.startsWith("55")) digits = `55${digits}`;
  if (digits.length < 12) return null;
  return `https://wa.me/${digits}`;
}
