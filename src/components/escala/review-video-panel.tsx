"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Link2,
  Save,
  RotateCcw,
  AlertTriangle,
  Play,
  Film,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  scaleId: string;
  weekNumber: number;
  initialUrl: string;
  /** true = quem está olhando pode aprovar/rejeitar (coord+) */
  canReview: boolean;
  onChanged: () => void;
}

type RejectTarget = "roteiro" | "gravacao" | "edicao";

const REJECT_OPTIONS: { value: RejectTarget; label: string }[] = [
  { value: "roteiro", label: "Voltar ao Roteiro" },
  { value: "gravacao", label: "Voltar à Gravação" },
  { value: "edicao", label: "Voltar à Edição" },
];

interface Embed {
  kind: "youtube" | "drive" | "direct";
  src: string;
}

/**
 * Tenta extrair um embed amigável do URL do vídeo final.
 * - YouTube: aceita youtu.be/{id} e youtube.com/watch?v=ID
 * - Google Drive: aceita .../file/d/{id}/(view|preview|edit) e converte
 *   para .../file/d/{id}/preview que é o formato suportado em iframe
 * - Demais URLs http(s) com extensão de vídeo → embed direto (<video>)
 */
function parseEmbed(rawUrl: string): Embed | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) return null;

  // YouTube
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return { kind: "youtube", src: `https://www.youtube.com/embed/${v}` };
      // youtube.com/embed/{id} ou /shorts/{id}
      const m = u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{6,})/);
      if (m) return { kind: "youtube", src: `https://www.youtube.com/embed/${m[1]}` };
    }
    // Google Drive
    if (host === "drive.google.com") {
      const m = u.pathname.match(/^\/file\/d\/([\w-]{10,})/);
      if (m) {
        return { kind: "drive", src: `https://drive.google.com/file/d/${m[1]}/preview` };
      }
      // open?id=ID
      const openId = u.searchParams.get("id");
      if (openId) {
        return { kind: "drive", src: `https://drive.google.com/file/d/${openId}/preview` };
      }
    }
  } catch {
    return null;
  }

  // Vídeo direto por extensão
  if (/\.(mp4|webm|mov|ogv)(\?|#|$)/i.test(url)) {
    return { kind: "direct", src: url };
  }

  return null;
}

export function ReviewVideoPanel({
  scaleId,
  weekNumber,
  initialUrl,
  canReview,
  onChanged,
}: Props) {
  const [url, setUrl] = useState(initialUrl || "");
  const [savingUrl, setSavingUrl] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget>("edicao");
  const [reason, setReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    setUrl(initialUrl || "");
  }, [initialUrl]);

  const embed = useMemo(() => parseEmbed(url), [url]);
  const dirty = (url || "").trim() !== (initialUrl || "").trim();

  async function saveUrl() {
    const trimmed = url.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      toast.error("URL inválida (use http(s)://)");
      return;
    }
    setSavingUrl(true);
    try {
      const res = await fetch(`/api/scales/${scaleId}/weeks/${weekNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewVideoUrl: trimmed || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao salvar link");
        return;
      }
      toast.success(trimmed ? "Link salvo" : "Link removido");
      onChanged();
    } catch {
      toast.error("Erro ao salvar link");
    } finally {
      setSavingUrl(false);
    }
  }

  async function approveAll() {
    setSubmittingDecision("approve");
    try {
      const res = await fetch(`/api/scales/${scaleId}/weeks/${weekNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "concluido" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao aprovar");
        return;
      }
      toast.success("Semana aprovada e concluída");
      onChanged();
    } catch {
      toast.error("Erro ao aprovar");
    } finally {
      setSubmittingDecision(null);
    }
  }

  async function rejectWithReason() {
    if (!reason.trim()) {
      toast.error("Descreva o motivo do ajuste");
      return;
    }
    setSubmittingDecision("reject");
    try {
      const res = await fetch(`/api/scales/${scaleId}/weeks/${weekNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: rejectTarget }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao rejeitar");
        return;
      }
      // Registra o motivo como comentário da fase de revisão para histórico
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaleId,
          weekNumber,
          stage: "revisao",
          message: `Rejeitado para ${REJECT_OPTIONS.find((o) => o.value === rejectTarget)?.label.toLowerCase() || rejectTarget}: ${reason.trim()}`,
        }),
      }).catch(() => {
        // não bloqueia a rejeição
      });
      toast.success("Vídeo rejeitado com apontamentos");
      setReason("");
      setReasonOpen(false);
      onChanged();
    } catch {
      toast.error("Erro ao rejeitar");
    } finally {
      setSubmittingDecision(null);
    }
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border border-dashed border-[oklch(0.35_0.06_25)] bg-[oklch(0.22_0.030_25)]/50">
      <div className="flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 text-[oklch(0.82_0.13_25)]" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[oklch(0.82_0.13_25)]">
          Link do vídeo final
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Cole o link do Drive, YouTube ou MP4…"
          className="h-8 text-xs bg-[oklch(0.235_0.015_172)]"
          disabled={!canReview}
        />
        {canReview && dirty && (
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={savingUrl}
            onClick={saveUrl}
          >
            <Save className="h-3 w-3 mr-1" />
            {savingUrl ? "Salvando…" : "Salvar"}
          </Button>
        )}
      </div>

      {url && !embed && (
        <div className="text-[11px] text-[oklch(0.82_0.13_60)] bg-[oklch(0.22_0.030_60)] border border-[oklch(0.35_0.06_60)] rounded-md px-2 py-1.5 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>
            URL não reconhecida como YouTube, Drive ou vídeo direto.{" "}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline inline-flex items-center gap-0.5"
            >
              abrir <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </span>
        </div>
      )}

      {embed && (
        <div className="rounded-lg overflow-hidden border bg-black/80">
          {embed.kind === "direct" ? (
            <video
              controls
              preload="metadata"
              src={embed.src}
              className="w-full max-h-[420px] bg-black"
            >
              Seu navegador não suporta vídeo.
            </video>
          ) : (
            <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
              <iframe
                src={embed.src}
                title="Vídeo final da revisão"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
          <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-white/70 border-t border-white/10">
            {embed.kind === "youtube" && <Play className="h-3 w-3" />}
            {embed.kind === "drive" && <Film className="h-3 w-3" />}
            {embed.kind === "direct" && <Film className="h-3 w-3" />}
            <span className="uppercase tracking-widest font-bold">{embed.kind}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-0.5 hover:text-white"
            >
              abrir externo <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      )}

      {/* Ações grandes — aprovar / rejeitar com apontamentos */}
      {canReview && (
        <div className="pt-1 space-y-2">
          {!reasonOpen ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-bold"
                disabled={submittingDecision === "approve"}
                onClick={approveAll}
              >
                <Check className="h-4 w-4 mr-1.5" />
                {submittingDecision === "approve" ? "Aprovando…" : "Aprovar e concluir"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 text-sm font-bold border-[oklch(0.40_0.08_25)] text-[oklch(0.82_0.13_25)] hover:bg-[oklch(0.22_0.030_25)]"
                onClick={() => setReasonOpen(true)}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Rejeitar com apontamentos
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[oklch(0.22_0.030_25)] border border-[oklch(0.35_0.06_25)] space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[oklch(0.82_0.13_25)]">
                  Apontamentos da revisão
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-muted-foreground"
                  onClick={() => {
                    setReasonOpen(false);
                    setReason("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: trocar trilha aos 0:23, regravar narração da intro, melhorar cor da cena 3…"
                className="text-xs min-h-[80px] bg-[oklch(0.235_0.015_172)]"
                maxLength={1000}
              />
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Voltar para qual fase?
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {REJECT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRejectTarget(opt.value)}
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors",
                        rejectTarget === opt.value
                          ? "border-[oklch(0.55_0.17_25)] bg-[oklch(0.22_0.030_25)] text-[oklch(0.82_0.13_25)]"
                          : "border-border text-muted-foreground hover:border-[oklch(0.40_0.08_25)]"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                size="lg"
                className="w-full h-10 bg-[oklch(0.55_0.17_25)] hover:bg-[oklch(0.48_0.17_25)] text-white font-bold"
                disabled={!reason.trim() || submittingDecision === "reject"}
                onClick={rejectWithReason}
              >
                {submittingDecision === "reject" ? "Enviando…" : "Enviar rejeição"}
              </Button>
            </div>
          )}
        </div>
      )}

      {!canReview && (
        <p className="text-[11px] text-muted-foreground/60 italic">
          Aguarde o coordenador aprovar ou apontar ajustes.
        </p>
      )}
    </div>
  );
}
