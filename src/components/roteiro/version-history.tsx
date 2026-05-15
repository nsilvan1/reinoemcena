"use client";
import { useEffect, useState } from "react";
import { History, RotateCcw, User2, Eye, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { RichTextViewer } from "@/components/editor/rich-text-editor";
import { cn } from "@/lib/utils";

interface Version {
  _id: string;
  title: string;
  content: string;
  snapshotBy: { _id: string; name: string } | null;
  createdAt: string;
}

interface Props {
  roteiroId: string;
  canEdit: boolean;
  onRestore?: (data: { title: string; content: string }) => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function VersionHistory({ roteiroId, canEdit, onRestore }: Props) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/roteiros/${roteiroId}/versions`);
      if (res.ok) setVersions(await res.json());
      else toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleRestore(v: Version) {
    if (
      !confirm(
        `Restaurar versão de ${format(new Date(v.createdAt), "dd/MM HH:mm", { locale: ptBR })}? A versão atual será salva no histórico.`
      )
    ) {
      return;
    }
    setRestoringId(v._id);
    try {
      const res = await fetch(
        `/api/roteiros/${roteiroId}/versions/${v._id}/restore`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao restaurar");
        return;
      }
      const updated = await res.json();
      toast.success("Versão restaurada");
      onRestore?.({ title: updated.title, content: updated.content || "" });
      setOpen(false);
    } catch {
      toast.error("Erro ao restaurar");
    } finally {
      setRestoringId(null);
    }
  }

  const previewVersion = versions.find((v) => v._id === previewId);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-8 text-xs gap-1 border"
        title="Histórico de versões"
      >
        <History className="h-3.5 w-3.5" /> Histórico
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico de versões
          </SheetTitle>
        </SheetHeader>

        {previewVersion ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b flex items-center justify-between bg-muted/20">
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{previewVersion.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(previewVersion.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {previewVersion.snapshotBy ? ` · por ${previewVersion.snapshotBy.name}` : ""}
                </p>
              </div>
              <button
                onClick={() => setPreviewId(null)}
                className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center shrink-0"
                title="Fechar pré-visualização"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {previewVersion.content ? (
                <RichTextViewer content={previewVersion.content} />
              ) : (
                <p className="text-xs text-muted-foreground/40 italic">Sem conteúdo</p>
              )}
            </div>
            {canEdit && (
              <div className="border-t p-3">
                <Button
                  size="sm"
                  className="w-full h-9 text-xs"
                  disabled={restoringId === previewVersion._id}
                  onClick={() => handleRestore(previewVersion)}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  {restoringId === previewVersion._id
                    ? "Restaurando..."
                    : "Restaurar esta versão"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 skeleton rounded-lg" />
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="p-8 text-center">
                <History className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground/60">
                  Nenhuma versão anterior
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">
                  Cada edição de título ou conteúdo cria uma versão
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {versions.map((v) => {
                  const preview = stripHtml(v.content).slice(0, 120);
                  return (
                    <li
                      key={v._id}
                      className={cn(
                        "p-3 hover:bg-muted/30 transition-colors",
                        restoringId === v._id && "opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {v.snapshotBy?.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{v.title}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User2 className="h-2.5 w-2.5" />
                            {v.snapshotBy?.name ?? "—"} ·{" "}
                            {format(new Date(v.createdAt), "dd/MM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                      {preview && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 pl-9">
                          {preview}
                        </p>
                      )}
                      <div className="flex gap-1.5 pl-9">
                        <button
                          onClick={() => setPreviewId(v._id)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Pré-visualizar
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleRestore(v)}
                            disabled={restoringId === v._id}
                            className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 disabled:opacity-50"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {restoringId === v._id ? "Restaurando..." : "Restaurar"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        </SheetContent>
      </Sheet>
    </>
  );
}
