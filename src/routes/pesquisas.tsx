import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History, Search } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { fetchSearchHistory, type SearchHistoryItem } from "@/lib/leads";

export const Route = createFileRoute("/pesquisas")({
  head: () => ({
    meta: [
      { title: "Pesquisas recentes — LeadRadar" },
      {
        name: "description",
        content: "Histórico das suas pesquisas de leads por nicho, cidade e data.",
      },
      { property: "og:title", content: "Pesquisas recentes — LeadRadar" },
      {
        property: "og:description",
        content: "Reabra rapidamente qualquer pesquisa de leads já realizada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PesquisasPage,
});

function PesquisasPage() {
  const [searches, setSearches] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSearchHistory()
      .then(setSearches)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Não foi possível carregar as pesquisas.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Pesquisas" subtitle="Histórico das suas buscas de leads">
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando pesquisas...</p>
      ) : !searches.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma pesquisa realizada.</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {searches.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground">
                  <History className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {item.term} — {item.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.leads} leads · {new Date(item.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <a href={`/leads?search_id=${item.id}`}>
                  <Search className="size-3.5" />
                  Abrir resultado
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
