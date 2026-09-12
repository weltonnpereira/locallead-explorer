import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Globe,
  Instagram,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Star,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell, EmptyState, MetricCard } from "@/components/layout/app-shell";
import { AddToProspectingDialog } from "@/components/leads/add-to-prospecting-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInsight, suggestionFor, type LeadInsight } from "@/lib/lead-insights";
import {
  addLeadsToProspecting,
  fetchAllLeads,
  fetchLeads,
  fetchLeadsBySearch,
  whatsappLink,
  type Lead,
  type SearchProgress,
} from "@/lib/leads";
import { cn, formatBRL, prettyStatus } from "@/lib/utils";
import { statusTextColors } from "@/lib_tsx/utils";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Encontrar Leads — LeadRadar" },
      {
        name: "description",
        content:
          "Encontre empresas locais por nicho e cidade, identifique oportunidades comerciais e priorize a prospecção.",
      },
      { property: "og:title", content: "Encontrar Leads — LeadRadar" },
      {
        property: "og:description",
        content: "Busque negócios locais, analise presença digital e priorize oportunidades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});

const PAGE_SIZE = 10;
const STORAGE_KEY = "leadradar:last-search";

type FilterId =
  "all" | "high" | "no-site" | "whatsapp" | "site" | "no-form" | "high-rating" | "low-rating";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "high", label: "Alta oportunidade" },
  { id: "no-site", label: "Sem site" },
  { id: "whatsapp", label: "Com WhatsApp" },
  { id: "site", label: "Site existente" },
  { id: "no-form", label: "Sem formulário" },
  { id: "high-rating", label: "Alta avaliação" },
  { id: "low-rating", label: "Baixa avaliação" },
];

type SortKey = "score" | "rating" | "name" | "reviews";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "score", label: "Score" },
  { id: "rating", label: "Avaliação" },
  { id: "name", label: "Nome" },
  { id: "reviews", label: "Avaliações" },
];

type Row = { lead: Lead; insight: LeadInsight };

function matches(row: Row, filter: FilterId) {
  const { lead, insight } = row;
  switch (filter) {
    case "high":
      return insight.score >= 80;
    case "no-site":
      return !insight.presence.site;
    case "whatsapp":
      return insight.presence.whatsapp;
    case "site":
      return insight.presence.site;
    case "no-form":
      return !insight.presence.form;
    case "high-rating":
      return (lead.rating ?? 0) >= 4.5;
    case "low-rating":
      return lead.rating === null || lead.rating < 4;
    default:
      return true;
  }
}

function LeadsPage() {
  const [isClient, setIsClient] = useState(false);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [query, setQuery] = useState({ category: "", city: "" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogIds, setDialogIds] = useState<number[]>([]);
  const [detail, setDetail] = useState<Row | null>(null);

  // Preserva a última pesquisa realizada
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { category?: string; city?: string };
      setQuery({ category: saved.category ?? "", city: saved.city ?? "" });
      setCategory(saved.category ?? "");
      setCity(saved.city ?? "");
    } catch {
      /* ignora cache inválido */
    }
    const searchId = Number(new URLSearchParams(window.location.search).get("search_id"));
    const loadLeads =
      Number.isInteger(searchId) && searchId > 0 ? fetchLeadsBySearch(searchId) : fetchAllLeads();
    void loadLeads.then(setLeads).catch(() => undefined);

    setIsClient(true);
  }, []);

  const rows = useMemo<Row[] | null>(
    () => leads?.map((lead) => ({ lead, insight: getInsight(lead) })) ?? null,
    [leads],
  );

  const isBtnDisabled = isClient ? !rows?.length : true;

  const stats = useMemo(() => {
    if (!rows?.length) return null;
    return {
      total: rows.length,
      phone: rows.filter((r) => r.insight.presence.whatsapp).length,
      site: rows.filter((r) => r.insight.presence.site).length,
      opportunities: rows.filter((r) => r.insight.score >= 80).length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    if (!rows) return null;
    const list = rows.filter((row) => matches(row, filter) && row.insight.score >= minScore);
    return [...list].sort((a, b) => {
      if (sortKey === "name") return a.lead.name.localeCompare(b.lead.name);
      if (sortKey === "rating") return (b.lead.rating ?? -1) - (a.lead.rating ?? -1);
      if (sortKey === "reviews") return b.lead.reviews - a.lead.reviews;
      return b.insight.score - a.insight.score;
    });
  }, [rows, filter, sortKey, minScore]);

  const totalPages = Math.max(1, Math.ceil((visible?.length ?? 0) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) ?? [];

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setSearchProgress({ status: "queued", progress: 0, message: "Iniciando busca..." });
    setError(null);
    setLeads(null);
    setFilter("all");
    setPage(1);
    setSelected(new Set());
    try {
      const result = await fetchLeads(category, city, setSearchProgress);
      setLeads(result);
      const next = { category: category.trim(), city: city.trim() };
      setQuery(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage indisponível */
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Não foi possível buscar os leads: ${cause.message}.`
          : "Não foi possível buscar os leads.",
      );
    } finally {
      setLoading(false);
    }
  }

  function selectedLeadIds() {
    return [...selected]
      .map((key) => rows?.find((row) => rowKey(row) === key)?.lead.id)
      .filter((id): id is number => id !== undefined);
  }

  function openProspectingDialog() {
    const ids = selectedLeadIds();
    if (!ids.length) return;
    setDialogIds(ids);
    setDialogOpen(true);
  }

  async function handleProspectingSuccess(ids: number[]) {
    try {
      await addLeadsToProspecting(ids);
    } catch {
      /* o lead já foi vinculado à campanha */
    }
    setLeads(
      (current) =>
        current?.map((lead) =>
          ids.includes(lead.id ?? -1) ? { ...lead, in_prospecting: true } : lead,
        ) ?? null,
    );
    setSelected(new Set());
  }

  async function handleExport() {
    if (!visible?.length) return;
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(
      visible.map(({ lead, insight }) => ({
        Nome: lead.name,
        Telefone: lead.phone || "—",
        Endereço: lead.address || "—",
        "Nota no Google": lead.rating ?? "N/A",
        Avaliações: lead.reviews || "—",
        Score: `${insight.score}/100`,
        Oportunidade: insight.label,
        Site: lead.website || "—",
      })),
    );
    sheet["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 42 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 22 },
      { wch: 30 },
    ];

    const pitchData = [
      ["GOSTARIA DE MAIS LEADS COMO ESTES?"],
      [""],
      ["Se a sua equipe comercial gostou desta amostra, nós podemos fornecer muito mais!"],
      ["Entregamos listas validadas, segmentadas e prontas para colocar dinheiro no seu bolso."],
      [""],
      ["Nossos Planos:"],
      ["100 Leads: R$ 20,00"],
      ["500 Leads: R$ 97,00"],
      ["1.000 Leads: R$ 147,00"],
      ["Assinatura Mensal (Ilimitado): Consulte-nos!"],
      [""],
      ["Entre em contato e escale suas vendas hoje mesmo:"],
      ["WhatsApp: (53) 984431591"],
      ["E-mail: pereirawelton206@gmail.com"],
    ];
    const pitchSheet = XLSX.utils.aoa_to_sheet(pitchData);
    pitchSheet["!cols"] = [{ wch: 80 }];

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Leads (Grátis)");
    XLSX.utils.book_append_sheet(book, pitchSheet, "Gostaria de mais leads");
    const label = [query.category, query.city].filter(Boolean).join("-").replace(/\s+/g, "_");
    XLSX.writeFile(book, `leads-${label || "export"}.xlsx`);
  }

  function toggleRow(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)));

  return (
    <AppShell
      title="Encontrar Leads"
      subtitle="Encontre empresas locais e identifique oportunidades comerciais."
    >
      <form onSubmit={handleSearch} className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label
              htmlFor="category"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Categoria do negócio
            </Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex.: Climatização"
                className="h-11 pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="city"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Cidade / Região
            </Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex.: Rio Grande - RS"
                className="h-11 pl-9"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading} className="h-11 w-full gap-2 md:w-auto">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {loading ? "Buscando..." : "Buscar Leads"}
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <SlidersHorizontal className="size-3.5" />
          Configurações avançadas
        </button>

        {advanced && (
          <div className="mt-3 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Score mínimo: {minScore}</p>
              <Slider
                value={[minScore]}
                onValueChange={([value]) => {
                  setMinScore(value ?? 0);
                  setPage(1);
                }}
                max={100}
                step={5}
                className="mt-3"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ordenar por</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SORTS.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={sortKey === item.id ? "secondary" : "ghost"}
                    onClick={() => setSortKey(item.id)}
                    className="h-7 rounded-full px-3 text-xs"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
      </form>

      {stats && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total de leads" value={stats.total} hint="resultados da pesquisa" />
          <MetricCard label="Com telefone" value={stats.phone} hint="contato direto disponível" />
          <MetricCard label="Com site" value={stats.site} hint="presença digital própria" />
          <MetricCard label="Oportunidades" value={stats.opportunities} hint="score 80 ou mais" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? "default" : "outline"}
              disabled={isBtnDisabled}
              onClick={() => {
                setFilter(item.id);
                setPage(1);
              }}
              className="h-8 rounded-full px-3 text-xs"
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selecionados` : "Selecionar leads"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={selected.size === 0}
            onClick={handleAddToProspecting}
          >
            <Target className="size-3.5" />
            Adicionar à prospecção
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={!visible?.length}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="size-3.5" />
            Exportar para Excel
          </Button>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton progress={searchProgress} />
        ) : !visible ? (
          <EmptyState
            icon={<Search className="size-4" />}
            title="Nenhuma pesquisa realizada"
            description="Pesquise um nicho e uma localização para começar."
          />
        ) : !visible.length ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Não encontramos empresas correspondentes aos filtros selecionados."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPageSelected}
                        aria-label="Selecionar página"
                        onCheckedChange={(checked) =>
                          setSelected((current) => {
                            const next = new Set(current);
                            pageRows.forEach((r) =>
                              checked ? next.add(rowKey(r)) : next.delete(rowKey(r)),
                            );
                            return next;
                          })
                        }
                      />
                    </TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Presença</TableHead>
                    <TableHead>Oportunidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const key = rowKey(row);
                    const link = whatsappLink(row.lead.phone);
                    return (
                      <TableRow key={key} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selected.has(key)}
                            onCheckedChange={() => toggleRow(key)}
                            aria-label={`Selecionar ${row.lead.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setDetail(row)}
                            className="text-left"
                          >
                            <span className="style text-sm font-medium group-hover:underline">
                              {row.lead.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {row.lead.address?.split(",")[0] || "Local não informado"}
                            </span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={row.insight.score} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.lead.phone || "—"}
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
                          {row.lead.address || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1">
                            <Star className="size-3.5 fill-foreground text-foreground" />
                            {row.lead.rating !== null ? row.lead.rating.toFixed(1) : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <PresenceIcons insight={row.insight} />
                        </TableCell>
                        <TableCell>
                          <OpportunityBadge label={row.insight.label} score={row.insight.score} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.lead.status || ""} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => setDetail(row)}
                            >
                              Detalhes
                            </Button>
                            <Button
                              asChild={Boolean(link)}
                              variant="outline"
                              size="icon"
                              className="size-8"
                              disabled={!link}
                              aria-label="WhatsApp"
                            >
                              {link ? (
                                <a href={link} target="_blank" rel="noreferrer">
                                  <MessageCircle className="size-3.5" />
                                </a>
                              ) : (
                                <span>
                                  <MessageCircle className="size-3.5" />
                                </span>
                              )}
                            </Button>
                            <CopyButton value={`${row.lead.name} — ${row.lead.phone}`} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {pageRows.map((row) => {
                const link = whatsappLink(row.lead.phone);
                return (
                  <div key={rowKey(row)} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => setDetail(row)} className="text-left">
                        <p className="text-sm font-medium">{row.lead.name}</p>
                        <p className="text-xs text-muted-foreground">{row.lead.address || "—"}</p>
                      </button>
                      <ScoreBadge score={row.insight.score} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <OpportunityBadge label={row.insight.label} score={row.insight.score} />
                      <PresenceIcons insight={row.insight} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 text-xs"
                        onClick={() => setDetail(row)}
                      >
                        Ver detalhes
                      </Button>
                      {link && (
                        <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
                          <a href={link} target="_blank" rel="noreferrer">
                            <MessageCircle className="size-3.5" />
                            WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {visible && visible.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={visible.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetTitle className="sr-only">Detalhes do lead</SheetTitle>
          {detail && <LeadDetails row={detail} />}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function rowKey(row: Row) {
  return row.lead.id !== undefined
    ? String(row.lead.id)
    : row.lead.google_maps_url || `${row.lead.name}-${row.lead.address}`;
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 rounded-md border border-border px-2 py-1">
      <span className="text-sm font-semibold tabular-nums">{score}</span>
      <span className="text-[10px] text-muted-foreground">/100</span>
    </span>
  );
}

function OpportunityBadge({ label, score }: { label: string; score: number }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px]",
        score >= 80
          ? "border-foreground/30 bg-foreground/10 font-medium text-foreground"
          : "border-border text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  CONTACTED:
    "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800",
  REPLIED:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  MEETING:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  PROPOSAL:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  CUSTOMER:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  LOST: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

export function StatusBadge({ status }: { status?: string }) {
  const colorClass =
    status && statusColors[status]
      ? statusColors[status]
      : "bg-secondary text-secondary-foreground border-border";

  return (
    <span
      className={`inline-flex font-medium rounded-full border px-2 py-0.5 text-[11px] ${colorClass}`}
    >
      {prettyStatus(status)}
    </span>
  );
}

function PresenceIcons({ insight }: { insight: LeadInsight }) {
  const items = [
    { icon: Globe, on: insight.presence.site, label: "Site" },
    { icon: MessageCircle, on: insight.presence.whatsapp, label: "WhatsApp" },
    { icon: Instagram, on: insight.presence.instagram, label: "Instagram" },
  ];
  return (
    <span className="flex items-center gap-1.5">
      {items.map((item) => (
        <item.icon
          key={item.label}
          aria-label={item.label}
          className={cn("size-3.5", item.on ? "text-foreground" : "text-muted-foreground/35")}
        />
      ))}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      aria-label="Copiar contato"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

function LeadDetails({ row }: { row: Row }) {
  const { lead, insight } = row;
  const link = whatsappLink(lead.phone);
  const message = suggestionFor(lead, insight);
  const presence: [string, boolean][] = [
    ["Site", insight.presence.site],
    ["WhatsApp", insight.presence.whatsapp],
    ["Instagram", insight.presence.instagram],
    ["Formulário", insight.presence.form],
    ["HTTPS", insight.presence.https],
    ["Responsivo", insight.presence.responsive],
    ["Página de orçamento", insight.presence.quotePage],
  ];

  const textColor =
    lead.status && statusTextColors[lead.status]
      ? statusTextColors[lead.status]
      : "text-foreground";

  return (
    <div className="space-y-6 pt-2">
      <div>
        <p
          className={`text-lg font-semibold tracking-tight ${textColor}`}
        >
          {lead.name}
        </p>
        <p className="text-xs text-muted-foreground">{lead.address || "Endereço não informado"}</p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Score de oportunidade
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {insight.score}
            <span className="text-sm text-muted-foreground">/100</span>
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-foreground" style={{ width: `${insight.score}%` }} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {insight.factors.map((factor) => (
            <li key={factor.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{factor.label}</span>
              <span className="tabular-nums">+{factor.points}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2 text-sm">
        <DetailRow label="Telefone" value={lead.phone || "—"} />
        <DetailRow label="Endereço" value={lead.address || "—"} />
        <DetailRow
          label="Avaliação"
          value={`${lead.rating !== null ? lead.rating.toFixed(1) : "N/A"} · ${lead.reviews} avaliações`}
        />
        <DetailRow label="Site" value={lead.website || "—"} />
        <DetailRow
          label="Proposta"
          value={lead.proposal_value != null ? formatBRL(lead.proposal_value.toString()) : "—"}
        />
        <DetailRow
          label="Negócio fechado"
          value={lead.deal_value != null ? formatBRL(lead.deal_value.toString()) : "—"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {link && (
          <Button asChild size="sm" className="gap-1.5">
            <a href={link} target="_blank" rel="noreferrer">
              <MessageCircle className="size-3.5" />
              WhatsApp
            </a>
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(`${lead.name} ${lead.address}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin className="size-3.5" />
            Google Maps
          </a>
        </Button>
      </div>

      <div>
        <p className="text-sm font-medium">Presença digital</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {presence.map(([label, on]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground">{label}</span>
              {on ? (
                <Check className="size-3.5 text-foreground" />
              ) : (
                <X className="size-3.5 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Oportunidades detectadas</p>
        <ul className="mt-2 space-y-2">
          {insight.opportunities.map((text) => (
            <li
              key={text}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
            >
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium">Sugestão de abordagem</p>
        <p className="mt-2 rounded-lg border border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          {message}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5 text-xs"
          onClick={() => navigator.clipboard.writeText(message)}
        >
          <Copy className="size-3.5" />
          Copiar mensagem
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs">{value}</span>
    </div>
  );
}

function TableSkeleton({ progress }: { progress: SearchProgress | null }) {
  return (
    <div className="space-y-3 p-5" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {progress?.message || "Coletando empresas, contatos e avaliações..."}
        <span className="ml-auto tabular-nums">{progress?.progress ?? 0}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground transition-[width] duration-300"
          style={{ width: `${progress?.progress ?? 0}%` }}
        />
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-6 gap-3">
          <Skeleton className="col-span-2 h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ))}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pages = useMemo<(number | string)[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3)
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="text-foreground">{start}</span>–
        <span className="text-foreground">{end}</span> de{" "}
        <span className="text-foreground">{totalItems}</span> leads
      </p>
      <div className="flex items-center gap-1.5" aria-label="Paginação">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2.5"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        {pages.map((page, index) =>
          typeof page === "string" ? (
            <span key={`e-${index}`} className="px-1 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-8 px-2.5"
              aria-current={currentPage === page ? "page" : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2.5"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
