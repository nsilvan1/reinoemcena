"use client";
import { useMemo, useState } from "react";
import { Play, ExternalLink, FileText, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";

type MediaKind = "audio" | "video" | "youtube" | "drive" | "image" | "pdf" | "other";

const AUDIO_EXT = [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac", ".flac", ".oga"];
const VIDEO_EXT = [".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"];
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"];

function detectKind(url: string): MediaKind {
  if (!url) return "other";
  const low = url.toLowerCase();
  // YouTube
  if (/youtube\.com\/watch|youtu\.be\//.test(low)) return "youtube";
  if (/youtube\.com\/embed\//.test(low)) return "youtube";
  // Google Drive
  if (/drive\.google\.com/.test(low)) return "drive";
  // Strip query for extension check
  const clean = low.split("?")[0].split("#")[0];
  if (AUDIO_EXT.some((ext) => clean.endsWith(ext))) return "audio";
  if (VIDEO_EXT.some((ext) => clean.endsWith(ext))) return "video";
  if (IMAGE_EXT.some((ext) => clean.endsWith(ext))) return "image";
  if (clean.endsWith(".pdf")) return "pdf";
  return "other";
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

function drivePreview(url: string): string | null {
  // Tentar extrair ID em /file/d/{id}/...
  const m = url.match(/\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  // ID em ?id=...
  const m2 = url.match(/[?&]id=([\w-]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  return null;
}

interface Props {
  url: string;
  className?: string;
  /** Quando true, renderiza inline (sem botão); quando false, expand-on-click */
  defaultOpen?: boolean;
  /** Tamanho compacto pra usar dentro de tabelas */
  compact?: boolean;
}

/**
 * Player inline para anexos de gravação/edição.
 * - .mp3/.wav/.m4a/.ogg → `<audio controls />` (player nativo customizado)
 * - .mp4/.webm/.mov → `<video controls />` compacto
 * - YouTube → iframe embed
 * - Google Drive → iframe preview
 * - .pdf/.imagem/outros → link "Abrir"
 */
export function InlineMedia({ url, className, defaultOpen = false, compact = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const kind = useMemo(() => detectKind(url), [url]);

  if (!url) return null;

  // Tipos não-tocáveis inline → link tradicional
  if (kind === "pdf" || kind === "image" || kind === "other") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1 text-[11px] text-primary hover:underline",
          className
        )}
      >
        {kind === "pdf" ? (
          <FileText className="h-3 w-3" />
        ) : (
          <ExternalLink className="h-2.5 w-2.5" />
        )}
        Abrir
      </a>
    );
  }

  // Botão trigger compacto (entra na célula da tabela)
  const triggerLabel = kind === "audio" ? "Ouvir" : kind === "video" ? "Assistir" : "Ver";
  const TriggerIcon = kind === "audio" ? Volume2 : Play;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md",
          "bg-primary/15 text-primary hover:bg-primary/25 active:scale-[0.97]",
          "transition-all duration-150",
          className
        )}
        aria-label={`${triggerLabel} mídia`}
      >
        <TriggerIcon className="h-3 w-3" strokeWidth={2.2} />
        {triggerLabel}
      </button>
    );
  }

  // Player renderizado
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold inline-flex items-center gap-1">
          <TriggerIcon className="h-2.5 w-2.5" />
          {kind === "audio" ? "Áudio" : kind === "video" ? "Vídeo" : kind === "youtube" ? "YouTube" : "Drive"}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Fechar player"
        >
          ✕
        </button>
      </div>

      {kind === "audio" && (
        <AudioPlayer src={url} autoPlay compact={compact} />
      )}

      {kind === "video" && (
        <video
          controls
          autoPlay
          preload="metadata"
          src={url}
          className="w-full max-h-[360px] rounded-md bg-black"
        >
          Seu navegador não suporta vídeo.
        </video>
      )}

      {kind === "youtube" && (
        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black">
          <iframe
            src={youtubeEmbed(url) || ""}
            title="YouTube"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      )}

      {kind === "drive" && (
        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black">
          <iframe
            src={drivePreview(url) || ""}
            title="Google Drive"
            allow="autoplay"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      )}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/65 hover:text-primary transition-colors"
      >
        <ExternalLink className="h-2.5 w-2.5" /> abrir em nova aba
      </a>
    </div>
  );
}

export { detectKind as detectMediaKind };
