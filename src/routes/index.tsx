import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Building2,
  Download,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Radar,
  Search,
  Star,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateLeads, type Lead } from "@/lib/leads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LeadRadar — Prospecção de Leads de Negócios Locais" },
      {
        name: "description",
        content:
          "Busque negócios locais por categoria e cidade, veja telefone, endereço e nota no Google, e exporte tudo para Excel.",
      },
      { property: "og:title", content: "LeadRadar — Prospecção de Leads Locais" },
      {
        property: "og:description",
        content:
          "Encontre leads de negócios locais por categoria e região e exporte a lista completa para Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [query, setQuery] = useState({ category: "", city: "" });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stats = useMemo(() => {
    if (!leads?.length) return null;
    const withSite = leads.filter((lead) => lead.website).length;
    const avg = leads.reduce((sum, lead) => sum + lead.rating, 0) / leads.length;
    return { total: leads.length, withSite, avg: avg.toFixed(1) };
  }, [leads]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLoading(true);
    setProgress(8);
    setLeads(null);

    [22, 41, 63, 84, 96].forEach((value, index) => {
      timers.current.push(setTimeout(() => setProgress(value), 300 * (index + 1)));
    });

    timers.current.push(
      setTimeout(() => {
        setProgress(100);
        setLeads(generateLeads(category, city));
        setQuery({ category: category.trim(), city: city.trim() });
        setLoading(false);
      }, 2000),
    );
  }

  async function handleExport() {
    if (!leads?.length) return;
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(
      leads.map((lead) => ({
        Nome: lead.name,
        Telefone: lead.phone,
        Endereço: lead.address,
        "Nota no Google": lead.rating,
        Avaliações: lead.reviews,
        Site: lead.website || "—",
      })),
    );
    sheet["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 42 }, { wch: 14 }, { wch: 12 }, { wch: 30 }];
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
          {stats && (
            <div className="flex gap-6 text-sm">
              <StatItem icon={<Users className="size-4" />} label="Leads" value={stats.total} />
              <StatItem icon={<Star className="size-4" />} label="Nota média" value={stats.avg} />
              <StatItem
                icon={<Globe className="size-4" />}
                label="Com site"
                value={stats.withSite}
              />
            </div>
          )}
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

          {loading && (
            <div className="mt-6 space-y-2" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Varrendo negócios em {city.trim() || "sua região"}...</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Resultados</h2>
              <p className="text-sm text-muted-foreground">
                {leads?.length
                  ? `${leads.length} leads para "${query.category || "todos"}" em ${query.city || "todas as regiões"}`
                  : "Faça uma busca para listar os leads encontrados."}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleExport}
              disabled={!leads?.length}
              className="gap-2"
            >
              <Download className="size-4" />
              Exportar para Excel
            </Button>
          </div>

          <div
            className="mt-4 overflow-hidden rounded-2xl border border-border"
            style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-card)" }}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-muted-foreground">
                <Loader2 className="size-7 animate-spin text-primary" />
                <p className="text-sm">Coletando telefones, endereços e avaliações...</p>
              </div>
            ) : !leads ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Radar className="size-8 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Informe a categoria e a cidade para começar a prospectar.
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
                    <TableHead className="text-muted-foreground">Site</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.name} className="border-border">
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <Phone className="size-3.5 text-primary" />
                          {lead.phone}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[22rem] text-muted-foreground">
                        {lead.address}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold">
                          <Star className="size-3.5 fill-warning text-warning" />
                          {lead.rating.toFixed(1)}
                          <span className="font-normal text-muted-foreground">
                            ({lead.reviews})
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        {lead.website ? (
                          <a
                            href={`https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <Globe className="size-3.5" />
                            {lead.website}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">sem site</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <div className="leading-tight">
        <p className="font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
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
