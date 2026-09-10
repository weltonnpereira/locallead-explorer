import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  MessageSquare,
  Search,
  Send,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AppShell, MetricCard, PageSection } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { campaigns, dashboardMetrics, funnelStages, nichePerformance } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LeadRadar | Prospecção de leads locais" },
      {
        name: "description",
        content:
          "Visão geral da sua prospecção: leads, oportunidades, contatos, respostas, reuniões e clientes.",
      },
      { property: "og:title", content: "LeadRadar — Dashboard de prospecção" },
      {
        property: "og:description",
        content: "Acompanhe funil, desempenho por nicho e campanhas de prospecção local.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  target: Target,
  send: Send,
  message: MessageSquare,
  calendar: CalendarCheck,
  trophy: Trophy,
};

function Dashboard() {
  const max = Math.max(...funnelStages.map((stage) => stage.value));

  return (
    <AppShell
      title="Dashboard"
      subtitle="Visão geral da sua prospecção"
      actions={
        <Button asChild size="sm" className="gap-1.5 text-xs">
          <Link to="/leads">
            <Search className="size-3.5" />
            Encontrar Leads
          </Link>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardMetrics.map((metric) => {
          const Icon = ICONS[metric.icon] ?? Users;
          return (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
              icon={<Icon className="size-4" />}
            />
          );
        })}
      </div>

      <PageSection title="Funil de prospecção" description="Do lead encontrado ao cliente fechado">
        <div className="space-y-2 rounded-xl border border-border bg-card p-5">
          {funnelStages.map((stage) => (
            <div key={stage.label} className="flex items-center gap-4">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{stage.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/80"
                  style={{ width: `${Math.max(2, (stage.value / max) * 100)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-xs tabular-nums">{stage.value}</span>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Desempenho por nicho" description="Onde a sua prospecção converte melhor">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nicho</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Contatados</TableHead>
                <TableHead className="text-right">Respostas</TableHead>
                <TableHead className="text-right">Reuniões</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nichePerformance.map((row) => (
                <TableRow key={row.niche}>
                  <TableCell className="font-medium">{row.niche}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.contacted}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.replies}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.meetings}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.clients}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.conversion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageSection>

      <PageSection
        title="Campanhas recentes"
        description="Resultado comercial das últimas campanhas"
        action={
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link to="/campanhas">Ver todas</Link>
          </Button>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Campanha</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Oportunidades</TableHead>
                <TableHead className="text-right">Contatados</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.name}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="text-muted-foreground">{campaign.niche}</TableCell>
                  <TableCell className="text-muted-foreground">{campaign.location}</TableCell>
                  <TableCell className="text-right tabular-nums">{campaign.leads}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {campaign.opportunities}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{campaign.contacted}</TableCell>
                  <TableCell className="text-right tabular-nums">{campaign.clients}</TableCell>
                  <TableCell className="text-right tabular-nums">{campaign.revenue}</TableCell>
                  <TableCell className="text-right">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {campaign.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageSection>
    </AppShell>
  );
}
