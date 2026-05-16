"use client";
import { useEffect, useState, useRef } from "react";
import {
  Upload,
  Paperclip,
  Download,
  FileText,
  FileAudio,
  FileVideo,
  FileImage,
  File as FileIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Attachment {
  _id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedBy: { _id: string; name: string };
  createdAt: string;
}

interface Props {
  scaleId: string;
  weekNumber: number;
  stage: string;
  currentUserId?: string;
  canDeleteAny?: boolean;
  accentColor?: string;
}

function iconForMime(mime: string) {
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("image/")) return FileImage;
  if (
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime === "text/plain"
  )
    return FileText;
  return FileIcon;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StageAttachments({
  scaleId,
  weekNumber,
  stage,
  currentUserId,
  canDeleteAny,
}: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attachments?scaleId=${scaleId}&weekNumber=${weekNumber}&stage=${stage}`
      );
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleId, weekNumber, stage]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 50MB)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("scaleId", scaleId);
      fd.append("weekNumber", String(weekNumber));
      fd.append("stage", stage);
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no upload");
        return;
      }
      toast.success("Anexo enviado");
      await load();
    } catch {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este anexo?")) return;
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao remover");
        return;
      }
      toast.success("Anexo removido");
      await load();
    } catch {
      toast.error("Erro ao remover");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3 w-3" /> Anexos{" "}
          {items.length > 0 && (
            <span className="text-muted-foreground/50">({items.length})</span>
          )}
        </p>
        <label className="cursor-pointer">
          <span
            className={cn(
              "text-[11px] text-primary hover:underline font-medium flex items-center gap-1",
              uploading && "opacity-50 pointer-events-none"
            )}
          >
            <Upload className="h-3 w-3" />{" "}
            {uploading ? "Enviando..." : "Adicionar"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
            accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt"
          />
        </label>
      </div>

      {loading ? (
        <div className="h-12 skeleton rounded-lg" />
      ) : items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/40 text-center py-2 italic">
          Nenhum anexo nesta etapa
        </p>
      ) : (
        <div className="space-y-1">
          {items.map((a) => {
            const Icon = iconForMime(a.mimeType);
            const canDelete =
              canDeleteAny || a.uploadedBy?._id === currentUserId;
            return (
              <div
                key={a._id}
                className="flex items-center gap-2 p-2 rounded-lg bg-[oklch(0.235_0.015_172)] border border-border hover:border-primary/30 transition-colors text-xs"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={a.name}
                  className="flex-1 min-w-0 hover:text-primary transition-colors"
                >
                  <p className="font-medium truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {a.uploadedBy?.name} · {formatSize(a.size)} ·{" "}
                    {format(new Date(a.createdAt), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </a>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={a.name}
                  className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center"
                  title="Baixar"
                >
                  <Download className="h-3 w-3 text-muted-foreground" />
                </a>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(a._id)}
                    className="h-6 w-6 rounded-md hover:bg-[oklch(0.22_0.030_25)] hover:text-[oklch(0.82_0.14_25)] flex items-center justify-center text-muted-foreground"
                    title="Remover"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
