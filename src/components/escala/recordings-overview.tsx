"use client";
import { useEffect, useState } from "react";
import {
  Mic,
  Check,
  Clock,
  FileAudio,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Narrador {
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
  narradores: Narrador[];
  progress: ProgressItem[];
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploaderId(att: Attachment) {
  return att.uploadedBy?._id;
}

function progressUserId(p: ProgressItem) {
  return typeof p.userId === "object" ? p.userId._id : p.userId;
}

export function RecordingsOverview({ scaleId, weekNumber, narradores, progress }: Props) {
  const [takes, setTakes] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attachments?scaleId=${scaleId}&weekNumber=${weekNumber}&stage=gravacao`
      );
      if (res.ok) setTakes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleId, weekNumber]);

  const narradorProgress = progress.filter((p) => p.role === "narrador");
  const completedIds = new Set(
    narradorProgress.filter((p) => p.completed).map(progressUserId)
  );
  const total = narradores.length;
  const done = narradores.filter((n) => completedIds.has(n._id)).length;
  const pending = narradores.filter((n) => !completedIds.has(n._id));

  if (loading) {
    return <div className="h-24 skeleton rounded-lg" />;
  }

  return (
    <div className="space-y-2">
      {/* Lista por narrador */}
      <ul className="space-y-2">
        {narradores.map((n) => {
          const userTakes = takes.filter((t) => uploaderId(t) === n._id);
          const userProgress = narradorProgress.find((p) => progressUserId(p) === n._id);
          const isCompleted = !!userProgress?.completed;
          const isExternalLink =
            !!userProgress?.linkUrl && /^https?:\/\//.test(userProgress.linkUrl);
          const isOpen = expanded[n._id] ?? userTakes.length > 0;

          return (
            <li
              key={n._id}
              className={cn(
                "rounded-lg border overflow-hidden transition-colors",
                isCompleted
                  ? "border-[oklch(0.35_0.06_158)] bg-[oklch(0.20_0.025_158)]"
                  : "border-[oklch(0.35_0.06_60)] bg-[oklch(0.22_0.030_60)]"
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded((s) => ({ ...s, [n._id]: !isOpen }))}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-black/[0.02] transition-colors text-left"
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    isCompleted
                      ? "bg-[oklch(0.30_0.040_158)] text-[oklch(0.86_0.13_158)]"
                      : "bg-[oklch(0.28_0.040_60)] text-[oklch(0.86_0.13_60)]"
                  )}
                >
                  {n.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{n.name}</p>
                  <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                    {isCompleted ? (
                      <>
                        <Check className="h-2.5 w-2.5 text-emerald-600" />
                        {userTakes.length > 0
                          ? `${userTakes.length} ${userTakes.length === 1 ? "tomada" : "tomadas"}`
                          : isExternalLink
                            ? "link externo"
                            : "concluído"}
                        {userProgress?.completedAt && (
                          <>
                            {" "}
                            ·{" "}
                            {format(new Date(userProgress.completedAt), "dd/MM HH:mm", {
                              locale: ptBR,
                            })}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Clock className="h-2.5 w-2.5 text-amber-600" /> pendente
                      </>
                    )}
                  </p>
                </div>
                {(userTakes.length > 0 || userProgress?.notes || isExternalLink) &&
                  (isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                  ))}
              </button>

              {isOpen && (userTakes.length > 0 || userProgress?.notes || isExternalLink) && (
                <div className="px-3 pb-3 space-y-2 border-t border-dashed">
                  {userTakes.length > 0 && (
                    <ul className="space-y-1.5 mt-2">
                      {userTakes.map((t, idx) => (
                        <li key={t._id} className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px]">
                            <FileAudio className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate flex-1">
                              Tomada {userTakes.length - idx}
                            </span>
                            <span className="text-muted-foreground/60 shrink-0">
                              {formatSize(t.size)}
                            </span>
                          </div>
                          <audio controls className="w-full h-8" src={t.url}>
                            Seu navegador não suporta áudio.
                          </audio>
                        </li>
                      ))}
                    </ul>
                  )}

                  {isExternalLink && (
                    <a
                      href={userProgress!.linkUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-primary hover:underline mt-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Link externo enviado pelo narrador
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
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {pending.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-[oklch(0.82_0.13_60)] bg-[oklch(0.22_0.030_60)] border border-[oklch(0.35_0.06_60)] rounded-md px-2 py-1.5">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>
            {pending.length} {pending.length === 1 ? "narrador pendente" : "narradores pendentes"}:{" "}
            {pending.map((p) => p.name).join(", ")}
          </span>
        </div>
      )}

      {total === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <Mic className="h-3.5 w-3.5" />
          Nenhum narrador atribuído à semana
        </div>
      )}
    </div>
  );
}
