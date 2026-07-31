export type Lead = {
  name: string;
  phone: string;
  address: string;
  rating: number;
  reviews: number;
  website: string;
};

const SUFFIXES = [
  "Central",
  "Express",
  "Prime",
  "do Bairro",
  "& Cia",
  "Premium",
  "Studio",
  "Casa",
  "Ponto",
  "Vip",
  "Plus",
  "Boutique",
];

const STREETS = [
  "Av. Paulista",
  "Rua das Flores",
  "Av. Brasil",
  "Rua XV de Novembro",
  "Av. Getúlio Vargas",
  "Rua Sete de Setembro",
  "Av. Beira Mar",
  "Rua do Comércio",
];

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Mocked prospecting result set — replace with a real provider later. */
export function generateLeads(category: string, city: string, count = 12): Lead[] {
  const base = category.trim() || "Negócio";
  const place = city.trim() || "Brasil";

  return Array.from({ length: count }, (_, index) => {
    const suffix = SUFFIXES[index % SUFFIXES.length];
    const name = `${base} ${suffix}`;
    const hasSite = index % 4 !== 0;
    return {
      name,
      phone: `(${11 + (index % 78)}) 9${(10000000 + index * 132457).toString().slice(0, 4)}-${(1000 + index * 37).toString().slice(0, 4)}`,
      address: `${STREETS[index % STREETS.length]}, ${100 + index * 17} — ${place}`,
      rating: Number((3.4 + ((index * 7) % 16) / 10).toFixed(1)),
      reviews: 18 + ((index * 53) % 480),
      website: hasSite ? `www.${slug(name)}.com.br` : "",
    };
  });
}