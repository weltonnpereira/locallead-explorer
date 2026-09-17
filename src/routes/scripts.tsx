import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Copy, Check, Plus, MessageSquare, X, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AppShell, EmptyState } from "@/components/layout/app-shell";
import { createScript, deleteScript, editScript, fetchScripts, type Script } from "@/lib/leads";
import { Button } from "@/components/ui/button";
import { ScriptCategory } from "@/schemas/script";
import { CATEGORY_LABELS, scriptCategories } from "@/lib/utils";

export const Route = createFileRoute("/scripts")({
  head: () => ({
    meta: [
      { title: "Scripts | LeadRadar" },
      {
        name: "description",
        content: "Crie e veja seus scripts de abordagem para prospecção.",
      },
      { property: "og:title", content: "Scripts de Abordagem — LeadRadar" },
      {
        property: "og:description",
        content: "Modelos e scripts prontos para contato via WhatsApp, E-mail ou Telefone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScriptsPage,
});

function ScriptsPage() {
  const [loading, setLoading] = useState(true);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ScriptCategory>("WHATSAPP");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchScripts()
      .then((result) => {
        if (active) setScripts(result);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Não foi possível carregar os scripts.",
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

  const handleOpenEdit = (script: Script) => {
    setTitle(script.title);
    setCategory(script.category);
    setContent(script.content);
    setEditingId(script.id);
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setTitle("");
    setCategory("WHATSAPP");
    setContent("");
    setEditingId(null);
    // setError(null);
  };

  const handleCreateScript = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const category = formData.get("category") as ScriptCategory;
    const content = formData.get("content") as string;
    if (!title.trim() || !content.trim()) return;

    try {
      setError(null);

      const newScript = await createScript({ title, category, content });

      setScripts([newScript, ...scripts]);
      toast.success("Script criado com sucesso!");

      setIsModalOpen(false);
    } catch (cause) {
      toast.error("Erro ao criar script.");
      setError(cause instanceof Error ? cause.message : "Erro ao criar script.");
    }
  };

  const handleEditScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !editingId) return;

    try {
      const updatedScript = await editScript(editingId, { title, category, content });

      setScripts((prev) => prev.map((s) => (s.id === editingId ? updatedScript : s)));
      toast.success("Script editado com sucesso!");

      setIsEditModalOpen(false);
      resetForm();
    } catch (cause) {
      toast.error("Erro ao editar script.");
      setError(cause instanceof Error ? cause.message : "Erro ao editar script.");
    }
  };

  const handleDeleteScript = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este script?")) return;

    try {
      setError(null);
      await deleteScript(id);

      setScripts((prev) => prev.filter((script) => script.id !== id));
      toast.success("Script excluido com sucesso!");

      if (selectedScript?.id === id) {
        setSelectedScript(null);
      }
    } catch (cause) {
      toast.error("Erro ao excluir script.");
      setError(cause instanceof Error ? cause.message : "Erro ao excluir script.");
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    <AppShell
      title="Scripts de Abordagem"
      subtitle="Modelos de mensagens prontos para otimizar sua prospecção"
    >
      {error && (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 text-xs">
          <Plus className="size-4" />
          Novo Script
        </Button>
      </div>

      {!scripts.length ? (
        <EmptyState
          title="Nenhum script encontrado"
          description="Crie seu primeiro modelo de mensagem para começar a prospectar."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scripts.map((script) => (
            <article
              key={script.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {scriptCategories(script.category)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(script.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <h2 className="mt-3 text-sm font-semibold tracking-tight">{script.title}</h2>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                  {script.content}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-1.5 border-t border-border pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => setSelectedScript(script)}
                >
                  <MessageSquare className="size-3.5" />
                  Ver Script
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenEdit(script)}
                  aria-label="Editar script"
                >
                  <Pencil className="size-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => handleCopy(script.content, script.id.toString())}
                  aria-label="Copiar script"
                >
                  {copiedId === script.id.toString() ? (
                    <Check className="size-3.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDeleteScript(script.id)}
                  aria-label="Excluir script"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-[85vh] flex flex-col rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between shrink-0">
              <div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {scriptCategories(selectedScript.category)}
                </span>
                <h3 className="mt-1 text-base font-semibold">{selectedScript.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setSelectedScript(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 text-lg leading-relaxed text-foreground whitespace-pre-line">
              {selectedScript.content}
            </div>

            <div className="mt-5 flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleDeleteScript(selectedScript.id)}
              >
                <Trash2 className="size-3.5" />
                Excluir
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedScript(null)}>
                  Fechar
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleCopy(selectedScript.content, `modal-${selectedScript.id}`)}
                >
                  {copiedId === `modal-${selectedScript.id}` ? (
                    <>
                      <Check className="size-3.5" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copiar Mensagem
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-[85vh] flex flex-col rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold">Novo Script de Abordagem</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              action={handleCreateScript}
              className="mt-4 flex-1 overflow-y-auto flex flex-col space-y-4 pr-1"
            >
              <div>
                <label className="block text-xs font-medium text-muted-foreground">Título</label>

                <input
                  type="text"
                  required
                  name="title"
                  placeholder="Ex: Abordagem Inicial - WhatsApp"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground">Canal</label>

                <select
                  name="category"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-medium text-muted-foreground">
                  Conteúdo do Script
                </label>

                <textarea
                  required
                  name="content"
                  placeholder="Escreva seu script aqui... Use [Nome] para personalizar."
                  className="mt-1 w-full flex-1 min-h-[150px] rounded-lg border border-border bg-background px-3 py-2 text-md leading-relaxed focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>

                <Button type="submit" size="sm">
                  Salvar Script
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-[85vh] flex flex-col rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold">Editar Script de Abordagem</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={handleEditScript}
              className="mt-4 flex-1 overflow-y-auto flex flex-col space-y-4 pr-1"
            >
              <div>
                <label className="block text-xs font-medium text-muted-foreground">Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Abordagem Inicial - WhatsApp"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground">Canal</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ScriptCategory)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-medium text-muted-foreground">
                  Conteúdo do Script
                </label>
                <textarea
                  required
                  placeholder="Escreva seu script aqui... Use [Nome] para personalizar."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 w-full flex-1 min-h-[150px] rounded-lg border border-border bg-background px-3 py-2 text-md leading-relaxed focus:outline-none focus:ring-1 focus:ring-foreground resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm">
                  Salvar Script
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
