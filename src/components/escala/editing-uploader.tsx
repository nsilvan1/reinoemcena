"use client";
import { useEffect, useRef, useState } from "react";
import {
  Film,
  Upload,
  Link2,
  Trash2,
  Check,
  AlertCircle,
  FileVideo,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Cut {
  _id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface Props {
  scaleId: string;
  weekNumber: number;
  currentUserId: string;
  hasRoteiro: boolean;
  notes: string;
  completed: boolean;
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewReason?: string;
  rejectionCount?: number;
  onChanged: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function EditingUploader({
  scaleId,
  weekNumber,
  currentUserId,
  hasRoteiro,
  notes: initialNotes,
  completed,
  reviewStatus,
  reviewReason,
  rejectionCount,
  onChanged,
}: Props) {
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [submittingLink, setSubmittingLink] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadCuts() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attachments?scaleId=${scaleId}&weekNumber=${weekNumber}&stage=edicao`
      );
      if (res.ok) {
        const all = (await res.json()) as Array<Cut & { uploadedBy: { _id: string } }>;
        setCuts(all.filter((a) => a.uploadedBy?._id === currentUserId));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCuts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleId, weekNumber, currentUserId]);

  useEffect(() => {
    setNotes(initialNotes || "");
  }, [initialNotes]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!hasRoteiro) {
      toast.error("Crie o roteiro antes de enviar vídeo");
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 200MB)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/scales/${scaleId}/weeks/${weekNumber}/video`,
        { method: "POST", body: fd }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no upload");
        return;
      }
      toast.success("Vídeo enviado");
      await loadCuts();
      onChanged();
    } catch {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteCut(cut: Cut) {
    if (!confirm(`Remover "${cut.name}"?`)) return;
    try {
      const res = await fetch(`/api/attachments/${cut._id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao remover");
        return;
      }
      toast.success("Corte removido");
      await loadCuts();
    } catch {
      toast.error("Erro ao remover");
    }
  }

  async function handleSubmitLink() {
    if (!linkUrl.trim()) return;
    if (!hasRoteiro) {
      toast.error("Crie o roteiro antes de enviar vídeo");
      return;
    }
    setSubmittingLink(true);
    try {
      const res = await fetch(`/api/scales/${scaleId}/weeks/${weekNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "editor",
          completed: true,
          linkUrl: linkUrl.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao enviar link");
        return;
      }
      toast.success("Link enviado");
      setLinkUrl("");
      onChanged();
    } catch {
      toast.error("Erro ao enviar link");
    } finally {
      setSubmittingLink(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/scales/${scaleId}/weeks/${weekNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "editor",
          completed,
          notes: notes.trim(),
        }),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar observação");
        return;
      }
      toast.success("Observação salva");
      onChanged();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleToggleComplete() {
    try {
      const res = await fetch(`/api/scales/${scaleId}/weeks/${weekNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "editor",
          completed: !completed,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro");
        return;
      }
      toast.success(completed ? "Marcado como pendente" : "Concluído!");
      onChanged();
    } catch {
      toast.error("Erro");
    }
  }

  const notesDirty = notes.trim() !== (initialNotes || "").trim();

  return (
    <div className="p-3 rounded-lg border border-violet-200/60 bg-violet-50/30 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Film className="h-4 w-4 text-violet-600" />
          <div>
            <p className="text-sm font-bold text-violet-800">Meus cortes</p>
            <p className="text-[11px] text-muted-foreground/70">
              Envie quantos precisar — o último conta como entrega
            </p>
          </div>
        </div>
        {completed ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md shrink-0">
            <Check className="h-3 w-3" /> Concluído
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-violet-700 bg-violet-100 px-2 py-1 rounded-md shrink-0">
            <AlertCircle className="h-3 w-3" /> Pendente
          </span>
        )}
      </div>

      {!hasRoteiro && (
        <div className="text-[11px] text-violet-700 bg-violet-100/70 border border-violet-200 rounded-md px-2 py-1.5 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 shrink-0" /> Crie o roteiro antes de enviar vídeo
        </div>
      )}

      {reviewStatus === "rejected" && reviewReason && (
        <div className="text-[11px] bg-red-50 border border-red-300 rounded-md px-2.5 py-2 text-red-800 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Ajuste solicitado
            </p>
            {!!rejectionCount && rejectionCount > 0 && (
              <span className="text-[9px] px-1 py-0 rounded bg-red-200 text-red-800 font-bold uppercase tracking-wider">
                {rejectionCount}× refeito
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap">{reviewReason}</p>
          <p className="text-[10px] text-red-600/70 italic pt-0.5">
            Envie um novo corte abaixo para reenviar à revisão
          </p>
        </div>
      )}

      {reviewStatus === "approved" && (
        <div className="text-[11px] bg-emerald-50 border border-emerald-300 rounded-md px-2.5 py-2 text-emerald-800 flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">Seu vídeo foi aprovado!</span>
        </div>
      )}

      {/* Lista de cortes */}
      {loading ? (
        <div className="h-12 bg-muted/30 animate-pulse rounded-lg" />
      ) : cuts.length > 0 ? (
        <ul className="space-y-1.5">
          {cuts.map((c, idx) => (
            <li
              key={c._id}
              className="p-2 rounded-lg bg-white border border-violet-100 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs">
                <FileVideo className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    Corte {cuts.length - idx} · {c.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatSize(c.size)} ·{" "}
                    {format(new Date(c.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteCut(c)}
                  className="h-6 w-6 rounded-md hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-muted-foreground shrink-0"
                  title="Remover"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <video controls className="w-full rounded-md bg-black max-h-[260px]" src={c.url}>
                Seu navegador não suporta vídeo.
              </video>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground/40 italic text-center py-2">
          Nenhum corte enviado
        </p>
      )}

      {/* Upload */}
      <label className={cn("cursor-pointer block", (!hasRoteiro || uploading) && "pointer-events-none opacity-50")}>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-violet-300/60 hover:border-violet-400 hover:bg-violet-50 transition-colors text-xs font-semibold text-violet-700">
          {uploading ? (
            <>
              <Upload className="h-3.5 w-3.5 animate-pulse" /> Enviando...
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />{" "}
              {cuts.length > 0 ? "Adicionar novo corte" : "Enviar primeiro corte"}
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleUpload}
          disabled={!hasRoteiro || uploading}
        />
      </label>

      {/* Link externo opcional */}
      <details className="group">
        <summary className="cursor-pointer text-[11px] text-violet-700 hover:underline list-none flex items-center gap-1">
          <Link2 className="h-3 w-3" /> Ou colar link externo (Drive, YouTube…)
        </summary>
        <div className="flex gap-2 mt-2">
          <Input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 h-8 text-xs"
            disabled={!linkUrl.trim() || !hasRoteiro || submittingLink}
            onClick={handleSubmitLink}
          >
            {submittingLink ? "Enviando…" : "Enviar link"}
          </Button>
        </div>
      </details>

      {/* Observações */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Observação (opcional)
        </p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: render em baixa qualidade, posso refazer em 4K"
          className="text-xs min-h-[60px] bg-white"
          maxLength={2000}
        />
        {notesDirty && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] border"
              disabled={savingNotes}
              onClick={handleSaveNotes}
            >
              {savingNotes ? "Salvando…" : "Salvar observação"}
            </Button>
          </div>
        )}
      </div>

      {/* Botão concluir / desmarcar */}
      {(cuts.length > 0 || linkUrl) && (
        <Button
          size="sm"
          variant={completed ? "outline" : "default"}
          className={cn(
            "w-full h-9 text-xs",
            !completed && "bg-violet-600 hover:bg-violet-700"
          )}
          onClick={handleToggleComplete}
        >
          {completed ? (
            <>Marcar como pendente</>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 mr-1" /> Marcar como concluído
            </>
          )}
        </Button>
      )}
    </div>
  );
}
