import { ArrowLeft, FolderPlus, Layers, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addLeadsToCampaign,
  createCampaign,
  fetchCampaigns,
  type Campaign,
} from "@/lib/leads";

type Step = "choice" | "create" | "existing";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: number[];
  onSuccess: (leadIds: number[]) => void;
};

export function AddToProspectingDialog({ open, onOpenChange, leadIds, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("choice");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("choice");
      setError(null);
      setBusy(false);
      setName("");
      setCategory("");
      setCity("");
      setCampaigns(null);
    }
  }, [open]);

  async function loadCampaigns() {
    setStep("existing");
    setError(null);
    setLoadingCampaigns(true);
    try {
      setCampaigns(await fetchCampaigns());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível carregar as campanhas.",
      );
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        category: category.trim(),
        city: city.trim(),
      });
      await addLeadsToCampaign(campaign.id, leadIds);
      toast.success(`Campanha criada e ${leadIds.length} leads adicionados.`);
      onSuccess(leadIds);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a campanha.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddExisting(campaign: Campaign) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await addLeadsToCampaign(campaign.id, leadIds);
      toast.success(`${leadIds.length} leads adicionados à campanha.`);
      onSuccess(leadIds);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível adicionar os leads.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar à prospecção</DialogTitle>
          <DialogDescription>
            {step === "create"
              ? "Crie uma campanha para organizar estes leads."
              : step === "existing"
                ? "Escolha a campanha que receberá estes leads."
                : "Escolha como deseja organizar os leads selecionados."}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">{leadIds.length} leads selecionados</p>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {step === "choice" && (
          <div className="grid gap-3 py-1">
            <button
              type="button"
              onClick={() => setStep("create")}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <FolderPlus className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium">Criar nova campanha</span>
                <span className="block text-xs text-muted-foreground">
                  Crie uma nova campanha para organizar estes leads.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => void loadCampaigns()}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <Layers className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium">Adicionar à campanha existente</span>
                <span className="block text-xs text-muted-foreground">
                  Adicione estes leads a uma campanha que já existe.
                </span>
              </span>
            </button>
          </div>
        )}

        {step === "create" && (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-name">Nome da campanha</Label>
              <Input
                id="campaign-name"
                autoFocus
                placeholder="Ex: Climatização — Rio Grande"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-category">Categoria</Label>
              <Input
                id="campaign-category"
                placeholder="Ex: Climatização"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-city">Cidade</Label>
              <Input
                id="campaign-city"
                placeholder="Ex: Rio Grande - RS"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" disabled={busy} onClick={() => setStep("choice")}>
                <ArrowLeft className="size-3.5" />
                Voltar
              </Button>
              <Button onClick={() => void handleCreate()} disabled={busy || !name.trim()}>
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                Criar campanha
              </Button>
            </div>
          </div>
        )}

        {step === "existing" && (
          <div className="space-y-3 py-1">
            {loadingCampaigns ? (
              <div className="flex items-center gap-2 px-1 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Carregando campanhas...
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{campaign.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[campaign.category, campaign.city].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {campaign.leads} leads · {campaign.status}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 text-xs"
                      disabled={busy}
                      onClick={() => void handleAddExisting(campaign)}
                    >
                      {busy && <Loader2 className="size-3.5 animate-spin" />}
                      Adicionar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma campanha encontrada.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs"
                  onClick={() => setStep("create")}
                >
                  Criar nova campanha
                </Button>
              </div>
            )}
            <div className="flex justify-start pt-1">
              <Button variant="outline" disabled={busy} onClick={() => setStep("choice")}>
                <ArrowLeft className="size-3.5" />
                Voltar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
