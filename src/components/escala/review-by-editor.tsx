"use client";
import { useEffect, useState } from "react";
import {
  Check,
  X,
  FileVideo,
  ExternalLink,
  StickyNote,
  Clock,
  ChevronDown,
  ChevronUp,
  ThumbsDown,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Editor {
  _id: string;
  name: string;
}

interface ProgressItem {
  _id: string;
  userId: { _id: string; name?: string } | string;
  role: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  linkUrl?: string;
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewReason?: string;
  reviewedAt?: string;
  reviewedBy?: { _id: string; name: string } | null;
  rejectionCount?: number;
}

interface Attachment {
  _id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedBy: { _id: string; name: string } | null;
  createdAt: string;
}

interface Props {
  scaleId: string;
  weekNumber: number;
  editores: Editor[];
  progress: ProgressItem[];
  onChanged: () => void;
}

function progressUserId(p: ProgressItem) {
  return typeof p.userId === "object" ? p.userId._id : p.userId;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ReviewByEditor({ scaleId, weekNumber, editores, progress, onChanged }: Props) {
  const [cuts, setCuts] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [reasonOpen, setReasonOpen] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attachments?scaleId=${scaleId}&weekNumber=${weekNumber}&stage=edicao`
      );
      if (res.ok) setCuts(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleId, weekNumber]);

  async function review(editorId: string, status: "approved" | "rejected" | "pending", reason?: string) {
    setSubmitting(editorId + status);
    try {
      const res = await fetch(`/api/scales/${scaleId}/weeks/${weekNumber}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorId, status, reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro");
        return;
      }
      const data = (await res.json()) as { weekStatus?: string };
      if (status === "approved") toast.success("Vídeo aprovado");
      else if (status === "rejected") toast.success("Ajuste solicitado");
      else toast.success("Revisão resetada");
      if (data.weekStatus === "concluido") {
        toast.success("Semana concluída!", { duration: 4000 });
      }
      setReasonOpen((s) => ({ ...s, [editorId]: false }));
      setReasonDraft((s) => ({ ...s, [editorId]: "" }));
      onChanged();
    } catch {
      toast.error("Erro ao revisar");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return <div className="h-24 skeleton rounded-lg" />;
  }

  return (
    <ul className="space-y-2">
      {editores.map((ed) => {
        const userCuts = cuts
          .filter((c) => c.uploadedBy?._id === ed._id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const latestCut = userCuts[0];
        const userProgress = progress.find(
          (p) => p.role === "editor" && progressUserId(p) === ed._id
        );
        const reviewStatus = userProgress?.reviewStatus || "pending";
        const externalLink =
          userProgress?.linkUrl && /^https?:\/\//.test(userProgress.linkUrl)
            ? userProgress.linkUrl
            : null;
        const hasContent = !!latestCut || !!externalLink;
        const isOpen = expanded[ed._id] ?? hasContent;
        const isReasonOpen = !!reasonOpen[ed._id];

        return (
          <li
            key={ed._id}
            className={cn(
              "rounded-lg border overflow-hidden transition-colors",
              reviewStatus === "approved" && "border-emerald-300 bg-emerald-50/40",
              reviewStatus === "rejected" && "border-red-300 bg-red-50/40",
              reviewStatus === "pending" && "border-orange-200/60 bg-white"
            )}
          >
            <button
              type="button"
              onClick={() => setExpanded((s) => ({ ...s, [ed._id]: !isOpen }))}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-black/[0.02] text-left"
            >
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  reviewStatus === "approved" && "bg-emerald-200 text-emerald-700",
                  reviewStatus === "rejected" && "bg-red-200 text-red-700",
                  reviewStatus === "pending" && "bg-orange-100 text-orange-700"
                )}
              >
                {ed.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{ed.name}</p>
                  {!!userProgress?.rejectionCount && userProgress.rejectionCount > 0 && (
                    <span className="text-[9px] px-1 py-0 rounded bg-red-100 text-red-700 font-bold uppercase tracking-wider">
                      Refeito {userProgress.rejectionCount}×
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  {reviewStatus === "approved" && (
                    <>
                      <Check className="h-2.5 w-2.5 text-emerald-600" /> aprovado
                      {userProgress?.reviewedAt && (
                        <>
                          {" "}
                          ·{" "}
                          {format(new Date(userProgress.reviewedAt), "dd/MM HH:mm", { locale: ptBR })}
                        </>
                      )}
                    </>
                  )}
                  {reviewStatus === "rejected" && (
                    <>
                      <ThumbsDown className="h-2.5 w-2.5 text-red-600" /> ajuste solicitado
                    </>
                  )}
                  {reviewStatus === "pending" && (
                    <>
                      <Clock className="h-2.5 w-2.5 text-orange-600" /> aguardando revisão
                    </>
                  )}
                </p>
              </div>
              {hasContent &&
                (isOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                ))}
            </button>

            {isOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-dashed">
                {latestCut && (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <FileVideo className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate flex-1">
                        Último corte
                        {userCuts.length > 1 && (
                          <span className="text-muted-foreground/50">
                            {" "}
                            (+{userCuts.length - 1} versões anteriores)
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground/60 shrink-0">
                        {formatSize(latestCut.size)}
                      </span>
                    </div>
                    <video
                      controls
                      className="w-full rounded-md bg-black max-h-[280px]"
                      src={latestCut.url}
                    >
                      Seu navegador não suporta vídeo.
                    </video>
                  </div>
                )}

                {externalLink && !latestCut && (
                  <a
                    href={externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-primary hover:underline mt-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Link externo do editor
                  </a>
                )}

                {userProgress?.notes && (
                  <div className="flex items-start gap-1.5 text-[11px] bg-muted/40 rounded-md px-2 py-1.5">
                    <StickyNote className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {userProgress.notes}
                    </p>
                  </div>
                )}

                {reviewStatus === "rejected" && userProgress?.reviewReason && (
                  <div className="text-[11px] bg-red-50 border border-red-200 rounded-md px-2 py-1.5 text-red-800">
                    <p className="font-bold text-[10px] uppercase tracking-wider mb-0.5">
                      Motivo da rejeição
                    </p>
                    <p className="whitespace-pre-wrap">{userProgress.reviewReason}</p>
                  </div>
                )}

                {/* Ações de revisão */}
                {hasContent && (
                  <div className="space-y-1.5 pt-1">
                    {reviewStatus !== "approved" && !isReasonOpen && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs flex-1"
                          disabled={submitting === ed._id + "approved"}
                          onClick={() => review(ed._id, "approved")}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs flex-1 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => setReasonOpen((s) => ({ ...s, [ed._id]: true }))}
                        >
                          <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Pedir ajuste
                        </Button>
                      </div>
                    )}

                    {isReasonOpen && (
                      <div className="space-y-1.5 p-2 rounded-lg bg-red-50/50 border border-red-200">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 flex items-center gap-1">
                          <Pencil className="h-3 w-3" /> Motivo do ajuste
                        </p>
                        <Textarea
                          value={reasonDraft[ed._id] || ""}
                          onChange={(e) =>
                            setReasonDraft((s) => ({ ...s, [ed._id]: e.target.value }))
                          }
                          placeholder="Ex: trocar trilha aos 0:23, cortar 3 segundos do final…"
                          className="text-xs min-h-[60px] bg-white"
                          maxLength={1000}
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] flex-1"
                            onClick={() => setReasonOpen((s) => ({ ...s, [ed._id]: false }))}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 h-7 text-[11px] flex-1"
                            disabled={
                              !(reasonDraft[ed._id] || "").trim() ||
                              submitting === ed._id + "rejected"
                            }
                            onClick={() => review(ed._id, "rejected", reasonDraft[ed._id])}
                          >
                            Enviar pedido
                          </Button>
                        </div>
                      </div>
                    )}

                    {reviewStatus === "approved" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-muted-foreground w-full border"
                        onClick={() => review(ed._id, "pending")}
                      >
                        <X className="h-3 w-3 mr-1" /> Reabrir revisão
                      </Button>
                    )}
                  </div>
                )}

                {!hasContent && (
                  <p className="text-[11px] text-muted-foreground/50 italic text-center py-2">
                    Nenhum vídeo enviado ainda
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}

      {editores.length === 0 && (
        <li className="text-center py-6 text-xs text-muted-foreground/50 italic">
          Nenhum editor atribuído à semana
        </li>
      )}
    </ul>
  );
}
