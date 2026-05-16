"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  ExternalLink,
  FileText,
  FileDown,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoteiroFile {
  _id?: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

interface RoteiroLike {
  _id: string;
  title?: string;
  content?: string;
  fileUrl?: string;
  files?: RoteiroFile[];
}

interface Props {
  roteiro: RoteiroLike;
  /** Mostra o botão "Editar roteiro". Quando true, exige onEdit. */
  canEdit?: boolean;
  /** Click do botão "Editar roteiro" (abre TipTap). */
  onEdit?: () => void;
  /** Cor/classes herdadas do step (azul roteiro). */
  accentText?: string;
}

function isPdf(mime: string, url: string) {
  return mime === "application/pdf" || /\.pdf(\?|#|$)/i.test(url);
}
function isWord(mime: string, url: string) {
  return (
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx?(\?|#|$)/i.test(url)
  );
}

/**
 * RoteiroPreview — modo leitura para a fase "roteiro".
 * Mostra:
 *  - conteúdo HTML do TipTap em .prose (já estilizado no globals.css)
 *  - viewer do arquivo principal (PDF inline ou Word/link para download)
 *  - botão "Editar roteiro" (quando o usuário pode editar) que abre o TipTap
 *
 * Não fetcha nada: recebe o roteiro já populado pelo /api/scales/[id].
 */
export function RoteiroPreview({ roteiro, canEdit, onEdit, accentText }: Props) {
  const [contentOpen, setContentOpen] = useState(true);

  const primaryFile = useMemo<RoteiroFile | null>(() => {
    if (roteiro.files && roteiro.files.length > 0) return roteiro.files[0];
    if (roteiro.fileUrl) {
      // Compat: legacy roteiros guardam só fileUrl.
      const name = roteiro.fileUrl.split("/").pop() || "arquivo";
      const isP = /\.pdf(\?|#|$)/i.test(roteiro.fileUrl);
      return {
        url: roteiro.fileUrl,
        name,
        mimeType: isP ? "application/pdf" : "application/octet-stream",
        size: 0,
      };
    }
    return null;
  }, [roteiro.files, roteiro.fileUrl]);

  const hasContent = !!roteiro.content && roteiro.content.trim().length > 0;
  const hasFile = !!primaryFile;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className={cn("h-4 w-4 shrink-0", accentText || "text-[oklch(0.78_0.13_220)]")} />
          <div className="min-w-0">
            <p className={cn("text-sm font-bold truncate", accentText || "text-[oklch(0.86_0.13_220)]")}>
              {roteiro.title || "Roteiro sem título"}
            </p>
            <p className="text-[11px] text-muted-foreground/70 truncate">
              {hasContent && hasFile && "Conteúdo + arquivo anexo"}
              {hasContent && !hasFile && "Roteiro escrito"}
              {!hasContent && hasFile && "Arquivo anexo"}
              {!hasContent && !hasFile && "Sem conteúdo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/roteiros/${roteiro._id}`}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground rounded-md h-7 px-2 border"
          >
            <ExternalLink className="h-3 w-3" /> Página
          </Link>
          {canEdit && onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] rounded-md"
              onClick={onEdit}
              title="Editar roteiro"
            >
              <Pencil className="h-3 w-3 mr-1" /> Editar
            </Button>
          )}
        </div>
      </div>

      {/* HTML preview */}
      {hasContent && (
        <div className="rounded-lg border border-border bg-[oklch(0.200_0.016_172)] overflow-hidden">
          <button
            type="button"
            onClick={() => setContentOpen((v) => !v)}
            className="w-full px-3 py-1.5 border-b bg-muted/30 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Eye className="h-3 w-3" />
            Conteúdo escrito
            <span className="ml-auto text-[10px] font-medium normal-case tracking-normal text-muted-foreground/60">
              {contentOpen ? "ocultar" : "mostrar"}
            </span>
          </button>
          {contentOpen && (
            <div className="px-4 py-3 max-h-[420px] overflow-y-auto">
              <div
                className="prose prose-sm max-w-none"
                // O conteúdo já foi sanitizado no backend (sanitizeHtml).
                dangerouslySetInnerHTML={{ __html: roteiro.content || "" }}
              />
            </div>
          )}
        </div>
      )}

      {/* File viewer */}
      {primaryFile && (
        <div className="rounded-lg border border-border bg-[oklch(0.200_0.016_172)] overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-muted/30 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <FileDown className="h-3 w-3" />
            Arquivo anexo
            <a
              href={primaryFile.url}
              target="_blank"
              rel="noopener noreferrer"
              download={primaryFile.name}
              className="ml-auto text-[10px] font-medium normal-case tracking-normal text-primary hover:underline inline-flex items-center gap-0.5"
            >
              baixar <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          {isPdf(primaryFile.mimeType, primaryFile.url) ? (
            <iframe
              src={primaryFile.url}
              title={primaryFile.name}
              className="w-full h-[600px] bg-muted"
            />
          ) : isWord(primaryFile.mimeType, primaryFile.url) ? (
            <div className="p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">{primaryFile.name}</p>
              <p>
                O navegador não pré-visualiza arquivos Word. Baixe o arquivo
                acima para abrir no Word, Pages ou Google Docs.
              </p>
            </div>
          ) : (
            <div className="p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">{primaryFile.name}</p>
              <p>Tipo {primaryFile.mimeType || "desconhecido"}.</p>
            </div>
          )}
        </div>
      )}

      {!hasContent && !hasFile && (
        <p className="text-[11px] text-muted-foreground/60 italic">
          Este roteiro ainda não tem conteúdo nem arquivo anexo.
        </p>
      )}
    </div>
  );
}
