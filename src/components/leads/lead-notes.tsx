import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadNotes, type Lead } from "@/lib/leads";

type LeadNotesProps = {
  lead: Lead;
  onSaved?: (notes: string) => void;
};

export function LeadNotes({ lead, onSaved }: LeadNotesProps) {
  const [value, setValue] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(lead.notes ?? "");
    setError(null);
  }, [lead.id, lead.notes]);

  async function save() {
    if (saving || lead.id === undefined) return;
    setSaving(true);
    setError(null);
    try {
      await updateLeadNotes(lead.id, value);
      onSaved?.(value);
      toast.success("Nota salva com sucesso.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a nota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium">Notas</p>
      <Textarea
        className="mt-2 min-h-32 text-xs leading-relaxed"
        placeholder="Adicione informações importantes sobre este lead..."
        value={value}
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
      />
      {error && (
        <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 gap-1.5 text-xs"
        disabled={saving || lead.id === undefined}
        onClick={() => void save()}
      >
        {saving && <Loader2 className="size-3.5 animate-spin" />}
        Salvar nota
      </Button>
    </div>
  );
}
