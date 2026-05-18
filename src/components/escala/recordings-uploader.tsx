"use client";
import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Upload,
  Link2,
  Trash2,
  Check,
  AlertCircle,
  FileAudio,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LiveRecorder } from "@/components/escala/live-recorder";
import { AudioPlayer } from "@/components/escala/audio-player";

interface Take {
  _id: string;
  url: string;
  name: string;
  size: number;
  createdAt: string;
}

interface Props {
  scaleId: string;
  weekNumber: number;
  currentUserId: string;
  /** Nome do usuário logado — usado pra nomear o arquivo gerado pelo gravador in-browser. */
  currentUserName?: string;
  hasRoteiro: boolean;
  notes: string;
  completed: boolean;
  onChanged: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RecordingsUploader({
  scaleId,
  weekNumber,
  currentUserId,
  currentUserName,
  hasRoteiro,
  notes: initialNotes,
  completed,
  onChanged,
}: Props) {
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [submittingLink, setSubmittingLink] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadTakes() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attachments?scaleId=${scaleId}&weekNumber=${weekNumber}&stage=gravacao`
      );
      if (res.ok) {
        const all = (await res.json()) as Array<Take & { uploadedBy: { _id: string } }>;
        setTakes(all.filter((a) => a.uploadedBy?._id === currentUserId));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTakes();
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
      toast.error("Crie o roteiro antes de enviar áudio");
      return;
    }
    if (!file.type.startsWith("audio/")) {
      toast.error("Selecione um arquivo de áudio");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 30MB)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/scales/${scaleId}/weeks/${weekNumber}/audio`,
        { method: "POST", body: fd }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no upload");
        return;
      }
      toast.success("Áudio enviado");
      await loadTakes();
      onChanged();
    } catch {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteTake(take: Take) {
    if (!confirm(`Remover "${take.name}"?`)) return;
    try {
      const res = await fetch(`/api/attachments/${take._id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao remover");
        return;
      }
      toast.success("Tomada removida");
      await loadTakes();
    } catch {
      toast.error("Erro ao remover");
    }
  }

  async function handleSubmitLink() {
    if (!linkUrl.trim()) return;
    if (!hasRoteiro) {
      toast.error("Crie o roteiro antes de enviar áudio");
      return;
    }
    setSubmittingLink(true);
    try {
      const res = await fetch(`/api/scales/${scaleId}/weeks/${weekNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "narrador",
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
          role: "narrador",
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
          role: "narrador",
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
    <div className="p-3 rounded-lg border border-[oklch(0.35_0.06_60)] bg-[oklch(0.22_0.030_60)] space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Mic className="h-4 w-4 text-[oklch(0.82_0.13_60)]" />
          <div>
            <p className="text-sm font-bold text-[oklch(0.88_0.13_60)]">Minhas tomadas</p>
            <p className="text-[11px] text-muted-foreground/70">
              Envie quantas precisar — a última conta como entrega
            </p>
          </div>
        </div>
        {completed ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[oklch(0.82_0.13_158)] bg-[oklch(0.22_0.030_158)] px-2 py-1 rounded-md shrink-0">
            <Check className="h-3 w-3" /> Concluído
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[oklch(0.82_0.13_60)] bg-[oklch(0.28_0.040_60)] px-2 py-1 rounded-md shrink-0">
            <AlertCircle className="h-3 w-3" /> Pendente
          </span>
        )}
      </div>

      {!hasRoteiro && (
        <div className="text-[11px] text-[oklch(0.82_0.13_60)] bg-[oklch(0.28_0.040_60)] border border-[oklch(0.40_0.07_60)] rounded-md px-2 py-1.5 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 shrink-0" /> Crie o roteiro antes de enviar áudio
        </div>
      )}

      {/* Lista de tomadas */}
      {loading ? (
        <div className="h-12 skeleton rounded-lg" />
      ) : takes.length > 0 ? (
        <ul className="space-y-1.5">
          {takes.map((t, idx) => (
            <li
              key={t._id}
              className="p-2 rounded-lg bg-[oklch(0.200_0.016_172)] border border-[oklch(0.30_0.04_60)] space-y-2"
            >
              <div className="flex items-center gap-2 text-xs">
                <FileAudio className="h-3.5 w-3.5 text-[oklch(0.78_0.13_60)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    Tomada {takes.length - idx} · {t.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatSize(t.size)} ·{" "}
                    {format(new Date(t.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteTake(t)}
                  className="h-6 w-6 rounded-md hover:bg-[oklch(0.22_0.030_25)] hover:text-[oklch(0.82_0.14_25)] flex items-center justify-center text-muted-foreground shrink-0"
                  title="Remover"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <AudioPlayer src={t.url} compact />

            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground/40 italic text-center py-2">
          Nenhuma tomada enviada
        </p>
      )}

      {/* Gravar in-browser */}
      <LiveRecorder
        uploadEndpoint={`/api/scales/${scaleId}/weeks/${weekNumber}/audio`}
        username={currentUserName || "narrador"}
        disabled={!hasRoteiro || uploading}
        onUploaded={() => {
          loadTakes();
          onChanged();
        }}
      />

      {/* Upload arquivo já gravado */}
      <label className={cn("cursor-pointer block", (!hasRoteiro || uploading) && "pointer-events-none opacity-50")}>
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-[oklch(0.40_0.07_60)] hover:border-[oklch(0.55_0.10_60)] hover:bg-[oklch(0.25_0.035_60)] transition-colors text-xs font-semibold text-[oklch(0.82_0.13_60)]">
          {uploading ? (
            <>
              <Upload className="h-3.5 w-3.5 animate-pulse" /> Enviando...
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />{" "}
              {takes.length > 0 ? "Anexar arquivo existente" : "Anexar arquivo"}
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm"
          onChange={handleUpload}
          disabled={!hasRoteiro || uploading}
        />
      </label>

      {/* Link externo opcional */}
      <details className="group">
        <summary className="cursor-pointer text-[11px] text-[oklch(0.78_0.13_60)] hover:underline list-none flex items-center gap-1">
          <Link2 className="h-3 w-3" /> Ou colar link externo (Drive, SoundCloud…)
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
            className="bg-[oklch(0.55_0.15_60)] hover:bg-[oklch(0.48_0.15_60)] h-8 text-xs"
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
          placeholder="Ex: gravei só a primeira parte, refaço amanhã"
          className="text-xs min-h-[60px] bg-[oklch(0.235_0.015_172)]"
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
      {(takes.length > 0 || linkUrl) && (
        <Button
          size="sm"
          variant={completed ? "outline" : "default"}
          className={cn(
            "w-full h-9 text-xs",
            !completed && "bg-[oklch(0.55_0.15_60)] hover:bg-[oklch(0.48_0.15_60)]"
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
