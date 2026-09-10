import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PIPELINE_STAGES,
  pipelineCards,
  type PipelineCard,
  type PipelineStage,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type PendingMove = {
  cardId: string;
  cardName: string;
  stage: "Proposta" | "Cliente";
};

function formatBRL(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export const Route = createFileRoute("/prospeccao")({
  head: () => ({
    meta: [
      { title: "Prospecção — LeadRadar" },
      {
        name: "description",
        content:
          "Acompanhe seus leads selecionados por etapa: novo, contatado, respondeu, reunião, proposta e cliente.",
      },
      { property: "og:title", content: "Prospecção — LeadRadar" },
      {
        property: "og:description",
        content: "Kanban de prospecção comercial dos leads selecionados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProspeccaoPage,
});

function ProspeccaoPage() {
  const [cards, setCards] = useState<PipelineCard[]>(pipelineCards);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [valueInput, setValueInput] = useState("");

  function applyMove(cardId: string, stage: PipelineStage, extra?: Partial<PipelineCard>) {
    setCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, ...extra, stage } : card)),
    );
  }

  function moveTo(stage: PipelineStage) {
    if (!dragging) return;
    const card = cards.find((item) => item.id === dragging);
    if (!card) {
      setDragging(null);
      return;
    }
    if (stage === "Proposta" || stage === "Cliente") {
      setPendingMove({ cardId: card.id, cardName: card.name, stage });
      setValueInput(stage === "Proposta" ? (card.proposalValue ?? "") : (card.closedValue ?? ""));
    } else {
      applyMove(card.id, stage);
    }
    setDragging(null);
  }

  function confirmValue() {
    if (!pendingMove) return;
    const extra: Partial<PipelineCard> =
      pendingMove.stage === "Proposta"
        ? { proposalValue: valueInput }
        : { closedValue: valueInput };
    applyMove(pendingMove.cardId, pendingMove.stage, extra);
    setPendingMove(null);
    setValueInput("");
  }

  return (
    <AppShell title="Prospecção" subtitle="Acompanhe os leads selecionados por etapa">
      <div className="flex gap-3 overflow-x-auto pb-3">
        {PIPELINE_STAGES.map((stage) => {
          const list = cards.filter((card) => card.stage === stage);
          return (
            <div
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveTo(stage)}
              className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-card/60 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stage}
                </p>
                <span className="text-xs tabular-nums text-muted-foreground">{list.length}</span>
              </div>
              <div className="space-y-2">
                {list.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={() => setDragging(card.id)}
                    onDragEnd={() => setDragging(null)}
                    className={cn(
                      "cursor-grab rounded-lg border border-border bg-card p-3 transition-opacity active:cursor-grabbing",
                      dragging === card.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{card.name}</p>
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] tabular-nums">
                        {card.score}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card.niche} · {card.city}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Último contato: {card.lastContact}
                    </p>
                    {card.proposalValue && (
                      <p className="mt-1 text-[11px] font-medium">
                        Proposta: {card.proposalValue}
                      </p>
                    )}
                    {card.closedValue && (
                      <p className="mt-1 text-[11px] font-medium">
                        Fechamento: {card.closedValue}
                      </p>
                    )}
                  </article>
                ))}
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

      <Dialog
        open={pendingMove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingMove(null);
            setValueInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingMove?.stage === "Proposta" ? "Valor da proposta" : "Valor de fechamento"}
            </DialogTitle>
            <DialogDescription>
              {pendingMove?.stage === "Proposta"
                ? `Informe o valor da proposta enviada para ${pendingMove?.cardName ?? "o lead"}.`
                : `Informe o valor fechado com ${pendingMove?.cardName ?? "o lead"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deal-value">Valor (R$)</Label>
            <Input
              id="deal-value"
              inputMode="numeric"
              placeholder="R$ 0,00"
              autoFocus
              value={valueInput}
              onChange={(event) => setValueInput(formatBRL(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmValue();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMove(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmValue} disabled={!valueInput.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
