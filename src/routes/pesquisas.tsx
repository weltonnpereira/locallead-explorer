import { createFileRoute, Link } from "@tanstack/react-router";
import { History, Search } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { recentSearches } from "@/lib/mock-data";

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
  component: () => (
    <AppShell title="Pesquisas" subtitle="Histórico das suas buscas de leads">
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {recentSearches.map((item) => (
          <div
            key={`${item.term}-${item.city}`}
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
                  {item.leads} leads · {item.date}
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
              <Link to="/leads">
                <Search className="size-3.5" />
                Abrir resultado
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </AppShell>
  ),
});
