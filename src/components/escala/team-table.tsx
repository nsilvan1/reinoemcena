"use client";
import { useState } from "react";
import Link from "next/link";
import {
  PenLine,
  Mic,
  Film,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  _id: string;
  name?: string;
}

interface Progress {
  userId: { _id: string; name?: string } | string;
  role: string;
  completed?: boolean;
  linkUrl?: string;
}

interface Roteiro {
  _id: string;
  title?: string;
}

interface Assignments {
  roteiristas?: User[];
  narradores?: User[];
  editores?: User[];
}

interface Props {
  assignments: Assignments;
  progress: Progress[];
  weekStatus: string;
  roteiro?: Roteiro | string | null;
  canReview?: boolean;
  defaultOpen?: boolean;
}

const ROLE_BG: Record<string, string> = {
  roteiristas: "bg-[oklch(0.22_0.030_220)] text-[oklch(0.82_0.13_220)]",
  narradores: "bg-[oklch(0.22_0.030_60)] text-[oklch(0.82_0.13_60)]",
  editores: "bg-[oklch(0.22_0.025_300)] text-[oklch(0.82_0.13_300)]",
};

const ROLE_LABEL: Record<string, string> = {
  roteiristas: "Roteirista",
  narradores: "Narrador",
  editores: "Editor",
};

const ROLE_ICON = {
  roteiristas: PenLine,
  narradores: Mic,
  editores: Film,
};

export function TeamTable({
  assignments,
  progress,
  weekStatus,
  roteiro,
  canReview,
  defaultOpen = true,
}: Props) {
  const groups = (["roteiristas", "narradores", "editores"] as const).map((key) => ({
    key,
    label: ROLE_LABEL[key],
    icon: ROLE_ICON[key],
    bg: ROLE_BG[key],
    members: assignments[key] || [],
  }));

  const totalMembers = groups.reduce((acc, g) => acc + g.members.length, 0);
  const [open, setOpen] = useState(defaultOpen && totalMembers > 0);
  const roteiroId =
    typeof roteiro === "string" ? roteiro : roteiro?._id;

  return (
    <div className="card-glass rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2.5 border-b border-border/40 flex items-center justify-between gap-2 hover:bg-[oklch(0.22_0.016_172)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Equipe & Progresso
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums">
            {totalMembers} {totalMembers === 1 ? "membro" : "membros"}
          </span>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
        </div>
      </button>

      {open && (
        <>
          {totalMembers === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground/60">
                Nenhum membro atribuído a esta semana
              </p>
              {canReview && (
                <p className="text-[11px] text-muted-foreground/40 mt-1">
                  Edite a escala para atribuir roteiristas, narradores e editores
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                      Membro
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                      Função
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hidden sm:table-cell">
                      Anexo
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) =>
                    group.members.map((u) => {
                      const userKey = u._id?.toString() || (u as unknown as string)?.toString();
                      const mp = progress.find((p) => {
                        const pid =
                          typeof p.userId === "string"
                            ? p.userId
                            : p.userId?._id?.toString();
                        return pid === userKey;
                      });
                      const RoleIcon = group.icon;

                      let statusEl: React.ReactNode;
                      if (mp) {
                        statusEl = (
                          <span
                            className={cn(
                              "inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                              mp.completed
                                ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.82_0.13_158)]"
                                : "bg-[oklch(0.22_0.030_60)] text-[oklch(0.82_0.13_60)]"
                            )}
                          >
                            {mp.completed ? "Concluído" : "Pendente"}
                          </span>
                        );
                      } else {
                        const activeInPhase =
                          (weekStatus === "roteiro" && group.key === "roteiristas") ||
                          (weekStatus === "gravacao" && group.key === "narradores") ||
                          (weekStatus === "edicao" && group.key === "editores") ||
                          weekStatus === "revisao";
                        statusEl = activeInPhase ? (
                          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[oklch(0.22_0.030_25)] text-[oklch(0.82_0.13_25)]">
                            Pendente
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/25">
                            —
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={`${group.key}-${userKey}`}
                          className="border-b border-border/30 last:border-0 hover:bg-[oklch(0.22_0.016_172)] transition-colors"
                        >
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                  group.bg
                                )}
                              >
                                {u.name?.[0] || "?"}
                              </div>
                              <span className="font-medium text-[13px]">
                                {u.name || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                group.bg
                              )}
                            >
                              <RoleIcon className="h-2.5 w-2.5" /> {group.label}
                            </span>
                          </td>
                          <td className="px-4 py-2 hidden sm:table-cell">
                            {mp?.linkUrl ? (
                              <a
                                href={mp.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
                              >
                                <ExternalLink className="h-2.5 w-2.5" /> Abrir
                              </a>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/25">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">{statusEl}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          {roteiroId && (
            <Link
              href={`/roteiros/${roteiroId}`}
              className="flex items-center gap-2 px-4 py-2.5 border-t border-border/40 hover:bg-[oklch(0.22_0.016_172)] transition-colors text-[12px] font-medium text-primary"
            >
              <FileText className="h-3.5 w-3.5" /> Ver Roteiro completo
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
