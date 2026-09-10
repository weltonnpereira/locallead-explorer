import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Loader2, MapPin, MessageCircle } from "lucide-react";

import { AppShell, EmptyState } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getInsight, suggestionFor } from "@/lib/lead-insights";
import {
  fetchProspectingLeads,
  updateLeadStatus,
  whatsappLink,
  type Lead,
  type LeadStatus,
} from "@/lib/leads";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospeccao")({
  head: () => ({ meta: [{ title: "Prospecção — LeadRadar" }] }),
  component: ProspeccaoPage,
});

const STAGES: { id: LeadStatus; label: string }[] = [
  { id: "NEW", label: "Novo" },
  { id: "CONTACTED", label: "Contatado" },
  { id: "REPLIED", label: "Respondeu" },
  { id: "MEETING", label: "Reunião" },
  { id: "PROPOSAL", label: "Proposta" },
  { id: "CUSTOMER", label: "Cliente" },
  { id: "LOST", label: "Perdido" },
];

function ProspeccaoPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);

  useEffect(() => {
    let active = true;
    fetchProspectingLeads()
      .then((result) => {
        console.log(result);
        if (active) setLeads(result);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Não foi possível carregar a prospecção.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function moveTo(status: LeadStatus) {
    if (dragging === null) return;
    const leadId = dragging;
    const previous = leads;
    setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));
    setDragging(null);

    try {
      await updateLeadStatus(leadId, status);
    } catch (cause) {
      setLeads(previous);
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o status.");
    }
  }

  if (loading) {
    return (
      <AppShell title="Prospecção" subtitle="Acompanhe os leads selecionados por etapa">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando prospecção...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Prospecção" subtitle="Acompanhe os leads selecionados por etapa">
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {!leads.length ? (
        <EmptyState
          title="Nenhum lead na prospecção"
          description="Selecione leads na página Encontrar Leads para começar."
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {STAGES.map((stage) => {
            const list = leads.filter((lead) => (lead.status ?? "NEW") === stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void moveTo(stage.id)}
                className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-card/60 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stage.label}
                  </p>
                  <span className="text-xs tabular-nums text-muted-foreground">{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map((lead) => {
                    const link = whatsappLink(lead.phone);
                    return (
                      <article
                        key={lead.id}
                        draggable
                        onDragStart={() => setDragging(lead.id ?? null)}
                        onDragEnd={() => setDragging(null)}
                        className={cn(
                          "cursor-grab rounded-lg border border-border bg-card p-3 active:cursor-grabbing",
                          dragging === lead.id && "opacity-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{lead.name}</p>
                          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] tabular-nums">
                            {lead.score ?? 0}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lead.address || "Endereço não informado"}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setDetail(lead)}
                          >
                            Detalhes
                          </Button>
                          {link && (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                            >
                              <a href={link} target="_blank" rel="noreferrer">
                                <MessageCircle className="size-3" />
                                WhatsApp
                              </a>
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {!list.length && (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
                      Arraste leads para cá
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetTitle className="sr-only">Detalhes do lead</SheetTitle>
          {detail && <ProspectingLeadDetails lead={detail} />}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function ProspectingLeadDetails({ lead }: { lead: Lead }) {
  const insight = getInsight(lead);
  const message = suggestionFor(lead, insight);
  const link = whatsappLink(lead.phone);

  return (
    <div className="space-y-6 pt-2">
      <div>
        <p className="text-lg font-semibold tracking-tight">{lead.name}</p>
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
      </div>

      <div className="grid gap-2 text-sm">
        <DetailRow label="Telefone" value={lead.phone || "—"} />
        <DetailRow label="Endereço" value={lead.address || "—"} />
        <DetailRow
          label="Avaliação"
          value={`${lead.rating !== null ? lead.rating.toFixed(1) : "N/A"} · ${lead.reviews} avaliações`}
        />
        <DetailRow label="Site" value={lead.website || "—"} />
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
            href={`https://www.google.com/maps/search/${encodeURIComponent(`${lead.name} ${lead.address || ""}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin className="size-3.5" />
            Google Maps
          </a>
        </Button>
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
