import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { fetchCampaigns, type Campaign } from "@/lib/leads";
import { formatBRL } from "@/lib/utils";

export const Route = createFileRoute("/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas — LeadRadar" },
      {
        name: "description",
        content:
          "Acompanhe o desempenho das suas campanhas de prospecção por nicho, localização e receita gerada.",
      },
      { property: "og:title", content: "Campanhas — LeadRadar" },
      {
        property: "og:description",
        content: "Resultados de cada campanha: leads, oportunidades, respostas e valor gerado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampanhasPage,
});

function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns()
      .then(setCampaigns)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Não foi possível carregar as campanhas.",
        ),
      );
  }, []);

  return (
    <AppShell title="Campanhas" subtitle="Resultado comercial de cada campanha de prospecção">
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {campaigns.map((campaign) => (
          <article key={campaign.name} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{campaign.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {campaign.category} · {campaign.city} ·{" "}
                  {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {campaign.status}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              {[
                ["Leads", campaign.leads],
                ["Oportunidades", campaign.opportunities],
                ["Contatados", campaign.contacted],
                ["Respostas", campaign.replies],
                ["Reuniões", campaign.meetings],
                ["Clientes", campaign.customers],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Valor gerado: </span>
              <span className="font-semibold">
                {formatBRL(campaign.generated_value.toString())}
              </span>
            </p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
