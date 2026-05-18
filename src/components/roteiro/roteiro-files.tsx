"use client";
import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  FileAudio,
  File as FileIcon,
  FileImage,
  Maximize2,
  Minimize2,
  Eye,
  Sparkles,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AudioPlayer } from "@/components/escala/audio-player";

interface RoteiroFile {
  _id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedBy: { _id: string; name: string } | string | null;
  uploadedAt: string;
}

interface Props {
  roteiroId: string;
  canEdit: boolean;
  /**
   * Quando passado, mostra botão "Importar texto" em anexos PDF/DOC/DOCX
   * que ao clicar extrai o conteúdo e chama esse callback com HTML pronto pro TipTap.
   */
  onImportText?: (html: string) => void;
}

function isImportable(file: RoteiroFile) {
  const mt = file.mimeType.toLowerCase();
  return (
    mt === "application/pdf" ||
    mt === "application/msword" ||
    mt ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function iconFor(file: RoteiroFile) {
  const mime = file.mimeType || "";
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf" || mime.includes("word") || mime === "text/plain") return FileText;
  return FileIcon;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExt(file: RoteiroFile) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

function isPdf(file: RoteiroFile) {
  return file.mimeType === "application/pdf" || getExt(file) === "pdf";
}
function isAudio(file: RoteiroFile) {
  return file.mimeType.startsWith("audio/") ||
    ["mp3", "wav", "m4a", "ogg", "webm"].includes(getExt(file));
}
function isImage(file: RoteiroFile) {
  return file.mimeType.startsWith("image/");
}

export function RoteiroFiles({ roteiroId, canEdit, onImportText }: Props) {
  const [files, setFiles] = useState<RoteiroFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleImportText(file: RoteiroFile) {
    if (!onImportText || !isImportable(file)) return;
    setImportingId(file._id);
    try {
      const res = await fetch("/api/roteiros/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: file.url, mimeType: file.mimeType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha na extração");
      if (!json.html || json.html.length < 5) {
        toast.warning("Nenhum texto extraível encontrado");
        return;
      }
      onImportText(json.html);
      toast.success(
        json.warnings?.length
          ? `Texto importado · ${json.warnings.length} aviso${json.warnings.length > 1 ? "s" : ""}`
          : "Texto importado pro editor"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao extrair texto");
    } finally {
      setImportingId(null);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/roteiros/${roteiroId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        if (data.length > 0 && !previewId) {
          const firstPreviewable = data.find((f: RoteiroFile) => isPdf(f) || isAudio(f) || isImage(f));
          if (firstPreviewable) setPreviewId(firstPreviewable._id);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roteiroId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 10MB)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/roteiros/${roteiroId}/files`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no upload");
        return;
      }
      const added = (await res.json()) as RoteiroFile;
      toast.success("Arquivo enviado");
      setPreviewId(added._id);
      await load();
    } catch {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(file: RoteiroFile) {
    if (!confirm(`Remover "${file.name}"?`)) return;
    try {
      const res = await fetch(`/api/roteiros/${roteiroId}/files/${file._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao remover");
        return;
      }
      toast.success("Arquivo removido");
      if (previewId === file._id) setPreviewId(null);
      await load();
    } catch {
      toast.error("Erro ao remover");
    }
  }

  const preview = files.find((f) => f._id === previewId);

  return (
    <div className="card-glass rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Arquivos
        </p>
        {files.length > 0 && (
          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full h-4 min-w-4 flex items-center justify-center px-1">
            {files.length}
          </span>
        )}
        {canEdit && (
          <label className="ml-auto cursor-pointer">
            <span
              className={cn(
                "text-[11px] text-primary hover:underline font-medium flex items-center gap-1",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              <Upload className="h-3 w-3" /> {uploading ? "Enviando..." : "Adicionar"}
            </span>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.mp3,.wav,.m4a,.ogg,.webm,.txt,.png,.jpg,.jpeg,.webp"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        )}
      </div>

      <div className="p-3 space-y-2">
        {loading ? (
          <div className="h-16 skeleton rounded-lg" />
        ) : files.length === 0 ? (
          <p className="text-xs text-muted-foreground/40 text-center py-4">
            Nenhum arquivo anexado
          </p>
        ) : (
          <>
            <ul className="space-y-1">
              {files.map((f) => {
                const Icon = iconFor(f);
                const isSelected = previewId === f._id;
                const canPreview = isPdf(f) || isAudio(f) || isImage(f);
                const uploader =
                  typeof f.uploadedBy === "object" && f.uploadedBy
                    ? f.uploadedBy.name
                    : null;
                return (
                  <li
                    key={f._id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors text-xs bg-white/50",
                      isSelected
                        ? "border-blue-300 bg-blue-50/60"
                        : "hover:border-primary/30"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {uploader ? `${uploader} · ` : ""}
                        {formatSize(f.size)} ·{" "}
                        {format(new Date(f.uploadedAt), "dd/MM HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {canPreview && (
                      <button
                        onClick={() => setPreviewId(isSelected ? null : f._id)}
                        className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center",
                          isSelected
                            ? "bg-blue-100 text-blue-700"
                            : "hover:bg-muted text-muted-foreground"
                        )}
                        title={isSelected ? "Fechar pré-visualização" : "Pré-visualizar"}
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                    )}
                    {onImportText && canEdit && isImportable(f) && (
                      <button
                        onClick={() => handleImportText(f)}
                        disabled={importingId === f._id}
                        className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                          "text-[oklch(0.80_0.14_158)] hover:bg-[oklch(0.22_0.030_158)]",
                          importingId === f._id && "opacity-60 cursor-wait"
                        )}
                        title="Importar texto pro editor"
                      >
                        {importingId === f._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                      </button>
                    )}
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={f.name}
                      className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center"
                      title="Baixar"
                    >
                      <Download className="h-3 w-3 text-muted-foreground" />
                    </a>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(f)}
                        className="h-6 w-6 rounded-md hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-muted-foreground"
                        title="Remover"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {preview && (isPdf(preview) || isAudio(preview) || isImage(preview)) && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                    Pré-visualização · {preview.name}
                  </p>
                  {isPdf(preview) && (
                    <button
                      onClick={() => setExpanded((v) => !v)}
                      className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center shrink-0"
                      title={expanded ? "Recolher" : "Expandir"}
                    >
                      {expanded ? (
                        <Minimize2 className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Maximize2 className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
                {isPdf(preview) && (
                  <div
                    className={cn(
                      "rounded-lg overflow-hidden border bg-muted/20 transition-all",
                      expanded ? "h-[600px]" : "h-72"
                    )}
                  >
                    <iframe
                      src={preview.url}
                      className="w-full h-full"
                      title={preview.name}
                    />
                  </div>
                )}
                {isAudio(preview) && (
                  <AudioPlayer src={preview.url} title={preview.name} />
                )}
                {isImage(preview) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview.url}
                    alt={preview.name}
                    className="w-full max-h-80 object-contain rounded-lg border bg-muted/20"
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
