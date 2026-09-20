import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteLead, deleteScript } from "@/lib/leads";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number[];
  onSuccess: (id: number[]) => void;
};

export function DeleteDialog({ open, onOpenChange, id, onSuccess }: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setBusy(false);
    }
  }, [open]);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      await deleteLead(id);

      onSuccess(id);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setBusy(false);
    }
  };

  const isMultiple = id.length > 1;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {isMultiple ? "Leads" : "Lead"}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir {isMultiple ? `estes ${id.length} leads` : "este lead"}?
            Esta ação não pode ser desfeita e os dados serão removidos permanentemente do CRM.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>

          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            {busy ? "Excluindo..." : "Confirmar exclusão"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
