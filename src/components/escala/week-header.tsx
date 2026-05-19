"use client";
import Link from "next/link";
import { ChevronRight, CalendarDays, Users, Check, AlertTriangle } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseLocalDate } from "@/lib/utils";
import { STEPS } from "@/components/pipeline/mini-pipeline";

interface Props {
  scaleTitle: string;
  scaleId: string;
  scaleMonth: string;
  weekNumber: number;
  weekTheme: string;
  weekDeadline: string;
  weekStatus: string;
  teamCount: number;
  weekCompletedAt?: string | null;
}

export function WeekHeader({
  scaleTitle,
  scaleMonth,
  weekNumber,
  weekTheme,
  weekDeadline,
  weekStatus,
  teamCount,
  weekCompletedAt,
}: Props) {
  const step = STEPS.find((s) => s.key === weekStatus) || STEPS[0];
  const StatusIcon = step.icon;

  const completedAtDate = weekCompletedAt ? new Date(weekCompletedAt) : null;
  let onTimeDiff: number | null = null;
  if (weekStatus === "concluido" && completedAtDate) {
    try {
      onTimeDiff = differenceInCalendarDays(completedAtDate, parseLocalDate(weekDeadline));
    } catch {
      onTimeDiff = null;
    }
  }
  const onTime = onTimeDiff !== null && onTimeDiff <= 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
        <Link
          href="/escalas"
          className="hover:text-foreground transition-colors"
        >
          Escalas
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
        <span className="text-foreground/80">{scaleTitle}</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
          S{weekNumber}
        </span>
      </nav>

      {/* Title + meta inline */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl sm:text-[26px] font-semibold leading-tight tracking-[-0.025em] truncate">
            {weekTheme}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground/70">
            <span className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground/60">
              {scaleMonth}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(parseLocalDate(weekDeadline), "dd MMM yyyy", { locale: ptBR })}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {teamCount} {teamCount === 1 ? "membro" : "membros"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border",
              step.lightBg,
              step.lightBorder,
              step.lightText
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {step.label}
          </div>
          {weekStatus === "concluido" && completedAtDate && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                Finalizada em {format(completedAtDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              {onTimeDiff !== null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                    onTime
                      ? "text-[oklch(0.82_0.13_158)] bg-[oklch(0.22_0.030_158)] border-[oklch(0.35_0.06_158)]"
                      : "text-[oklch(0.82_0.14_25)] bg-[oklch(0.22_0.030_25)] border-[oklch(0.35_0.06_25)]"
                  )}
                >
                  {onTime ? (
                    <>
                      <Check className="h-2.5 w-2.5" />
                      No prazo
                      {onTimeDiff < 0 && ` · ${Math.abs(onTimeDiff)}d antes`}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Atrasado · {onTimeDiff}d
                    </>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
