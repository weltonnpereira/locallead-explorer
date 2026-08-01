import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Download,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Percent,
  Phone,
  Radar,
  Search,
  Star,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fetchLeads, whatsappLink, type Lead } from "@/lib/leads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadRadar — Prospecção de Leads de Negócios Locais" },
      {
        name: "description",
        content:
          "Busque negócios locais por categoria e cidade, veja telefone, endereço, nota no Google e fale por WhatsApp em um clique.",
      },
      { property: "og:title", content: "LeadRadar — Prospecção de Leads Locais" },
      {
        property: "og:description",
        content:
          "Encontre leads de negócios locais por categoria e região, filtre oportunidades e exporte para Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Filter = "all" | "phone" | "opportunity";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "phone", label: "Com Telefone" },
  { id: "opportunity", label: "Oportunidades (Nota < 4.0)" },
];

function isOpportunity(lead: Lead) {
  return lead.rating === null || lead.rating < 4;
}

function Index() {
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState({ category: "", city: "" });

  const stats = useMemo(() => {
    if (!leads?.length) return null;
    const withPhone = leads.filter((lead) => lead.phone).length;
    const rated = leads.filter((lead) => lead.rating !== null);
    const avg = rated.length
      ? (rated.reduce((sum, lead) => sum + (lead.rating ?? 0), 0) / rated.length).toFixed(1)
      : "—";
    return {
      total: leads.length,
      phonePct: Math.round((withPhone / leads.length) * 100),
      withPhone,
      avg,
    };
  }, [leads]);

  const visibleLeads = useMemo(() => {
    if (!leads) return null;
    if (filter === "phone") return leads.filter((lead) => lead.phone);
    if (filter === "opportunity") return leads.filter(isOpportunity);
    return leads;
  }, [leads, filter]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setLeads(null);
    setFilter("all");
    try {
      const result = await fetchLeads(category, city);
      setLeads(result);
      setQuery({ category: category.trim(), city: city.trim() });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Não foi possível buscar os leads: ${cause.message}. Verifique se a API está rodando em http://localhost:8000.`
          : "Não foi possível buscar os leads.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!visibleLeads?.length) return;
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(
      visibleLeads.map((lead) => ({
        Nome: lead.name,
        Telefone: lead.phone || "—",
        Endereço: lead.address || "—",
        "Nota no Google": lead.rating ?? "N/A",
        Avaliações: lead.reviews,
        Oportunidade: isOpportunity(lead)
          ? "Melhorar Reputação"
          : (lead.rating ?? 0) >= 4.5
            ? "Alta Avaliação"
            : "Regular",
        Site: lead.website || "—",
      })),
    );
    sheet["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 42 },
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 30 },
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Leads");
    const label = [query.category, query.city].filter(Boolean).join("-").replace(/\s+/g, "_");
    XLSX.writeFile(book, `leads-${label || "export"}.xlsx`);
  }

  return (
    <main className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-25 blur-3xl"
        style={{ background: "var(--gradient-brand)" }}
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-10 md:py-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
            >
              <Radar className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">LeadRadar</h1>
              <p className="text-sm text-muted-foreground">
                Prospecção de leads de negócios locais
              </p>
            </div>
          </div>
        </header>

        <section
          className="mt-8 rounded-2xl border border-border p-6 md:p-7"
          style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}
        >
          <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <Field
              id="category"
              label="Categoria do Negócio"
              placeholder="Ex.: Restaurante, Clínica, Academia"
              icon={<Building2 className="size-4" />}
              value={category}
              onChange={setCategory}
            />
            <Field
              id="city"
              label="Cidade/Região"
              placeholder="Ex.: Curitiba - PR"
              icon={<MapPin className="size-4" />}
              value={city}
              onChange={setCity}
            />
            <div className="flex items-end">
              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-11 w-full gap-2 font-semibold md:w-auto"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                {loading ? "Buscando..." : "Buscar Leads"}
              </Button>
            </div>
          </form>

          {error && (
            <p className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
        </section>

        {stats && (
          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={<Users className="size-5" />}
              label="Total de Leads"
              value={stats.total}
              hint="resultados encontrados"
            />
            <SummaryCard
              icon={<Percent className="size-5" />}
              label="Com Telefone"
              value={`${stats.phonePct}%`}
              hint={`${stats.withPhone} de ${stats.total} empresas`}
            />
            <SummaryCard
              icon={<Star className="size-5" />}
              label="Nota Média"
              value={stats.avg}
              hint="média das avaliações"
            />
          </section>
        )}

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Resultados</h2>
              <p className="text-sm text-muted-foreground">
                {visibleLeads?.length
                  ? `${visibleLeads.length} leads para "${query.category || "todos"}" em ${query.city || "todas as regiões"}`
                  : "Faça uma busca para listar os leads encontrados."}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleExport}
              disabled={!visibleLeads?.length}
              className="gap-2"
            >
              <Download className="size-4" />
              Exportar para Excel
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={filter === item.id ? "default" : "outline"}
                onClick={() => setFilter(item.id)}
                disabled={!leads?.length}
                className="rounded-full"
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div
            className="mt-4 overflow-hidden rounded-2xl border border-border"
            style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}
          >
            {loading ? (
              <TableSkeleton />
            ) : !visibleLeads ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Radar className="size-8 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Informe a categoria e a cidade para começar a prospectar.
                </p>
              </div>
            ) : !visibleLeads.length ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Search className="size-8 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Nenhum lead corresponde a este filtro.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Telefone</TableHead>
                    <TableHead className="text-muted-foreground">Endereço</TableHead>
                    <TableHead className="text-muted-foreground">Nota no Google</TableHead>
                    <TableHead className="text-muted-foreground">Oportunidade</TableHead>
                    <TableHead className="text-muted-foreground">Site</TableHead>
                    <TableHead className="text-right text-muted-foreground">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLeads.map((lead, index) => {
                    const link = whatsappLink(lead.phone);
                    return (
                      <TableRow key={`${lead.name}-${index}`} className="border-border">
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          {lead.phone ? (
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <Phone className="size-3.5 text-primary" />
                              {lead.phone}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">sem telefone</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[20rem] text-muted-foreground">
                          {lead.address || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold">
                            <Star className="size-3.5 fill-warning text-warning" />
                            {lead.rating !== null ? lead.rating.toFixed(1) : "N/A"}
                            {lead.reviews > 0 && (
                              <span className="font-normal text-muted-foreground">
                                ({lead.reviews})
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <OpportunityBadge rating={lead.rating} />
                        </TableCell>
                        <TableCell>
                          {lead.website ? (
                            <a
                              href={
                                lead.website.startsWith("http")
                                  ? lead.website
                                  : `https://${lead.website}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-primary hover:underline"
                            >
                              <Globe className="size-3.5" />
                              {/* Remove o protocolo (http/https) e o 'www.', e opcionalmente corta após a primeira barra */}
                              {
                                lead.website
                                  .replace(/^https?:\/\//, "")
                                  .replace(/^www\./, "")
                                  .split("/")[0]
                              }
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">sem site</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild={Boolean(link)}
                            size="sm"
                            disabled={!link}
                            className="gap-1.5 bg-success font-semibold text-accent-foreground hover:bg-success/90"
                          >
                            {link ? (
                              <a href={link} target="_blank" rel="noreferrer">
                                <MessageCircle className="size-3.5" />
                                WhatsApp
                              </a>
                            ) : (
                              <span>
                                <MessageCircle className="size-3.5" />
                                WhatsApp
                              </span>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function OpportunityBadge({ rating }: { rating: number | null }) {
  const opportunity = rating === null || rating < 4;
  const high = rating !== null && rating >= 4.5;
  const label = opportunity ? "Melhorar Reputação" : high ? "Alta Avaliação" : "Regular";
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
        opportunity && "border-warning/40 bg-warning/15 text-warning",
        high && "border-success/40 bg-success/15 text-success",
        !opportunity && !high && "border-border bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border border-border p-5"
      style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Coletando telefones, endereços e avaliações...
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-6 gap-3">
          <Skeleton className="h-6 col-span-2" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ))}
    </div>
  );
}

function Field({
  id,
  label,
  placeholder,
  icon,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium tracking-wide text-muted-foreground">
        {label.toUpperCase()}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 pl-9"
        />
      </div>
    </div>
  );
}
