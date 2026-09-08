import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — LeadRadar" },
      {
        name: "description",
        content: "Ajuste preferências da sua conta LeadRadar e padrões de prospecção.",
      },
      { property: "og:title", content: "Configurações — LeadRadar" },
      {
        property: "og:description",
        content: "Preferências de conta, exportação e prospecção do LeadRadar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Configurações" subtitle="Preferências da conta e da prospecção">
      <div className="max-w-2xl space-y-4">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Perfil</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs text-muted-foreground">
                Nome
              </Label>
              <Input id="nome" defaultValue="Welton Pereira" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                E-mail
              </Label>
              <Input id="email" defaultValue="pereirawelton206@gmail.com" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Prospecção</h2>
          <div className="mt-4 space-y-4">
            {[
              ["Priorizar empresas sem site", true],
              ["Incluir aba comercial na exportação", true],
              ["Notificar novas respostas", false],
            ].map(([label, checked]) => (
              <div key={String(label)} className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Switch defaultChecked={Boolean(checked)} aria-label={String(label)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  ),
});
