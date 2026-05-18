"use client";
import { CircleCheck } from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";
import { STEPS } from "@/components/pipeline/mini-pipeline";

interface Week {
  number: number;
  theme: string;
  status: string;
  deadline: string;
}

interface Props {
  weeks: Week[];
  selected: number;
  onSelect: (n: number) => void;
}

export function WeekStepper({ weeks, selected, onSelect }: Props) {
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {weeks.map((week, idx) => {
        const ws = STEPS.find((s) => s.key === week.status) || STEPS[0];
        const sel = selected === week.number;
        const overdue =
          week.status !== "concluido" &&
          parseLocalDate(week.deadline) < new Date();
        const Icon = ws.icon;

        return (
          <button
            key={week.number}
            onClick={() => onSelect(week.number)}
            className={cn(
              "group relative flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all whitespace-nowrap shrink-0",
              sel
                ? "border-primary/40 bg-[oklch(0.22_0.030_172)] shadow-sm"
                : "border-border bg-card hover:border-primary/20 hover:bg-[oklch(0.22_0.016_172)]"
            )}
          >
            {/* Step indicator */}
            <div
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center transition-colors shrink-0",
                sel
                  ? `bg-gradient-to-br ${ws.gradient} text-[oklch(0.10_0.012_158)]`
                  : "bg-[oklch(0.24_0.016_172)] border border-border"
              )}
            >
              {week.status === "concluido" && !sel ? (
                <CircleCheck className="h-3 w-3 text-[oklch(0.74_0.16_158)]" />
              ) : (
                <Icon className={cn("h-3 w-3", !sel && ws.color)} />
              )}
            </div>

            {/* Text */}
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[11px] font-bold font-mono tracking-wider",
                    sel ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  S{week.number}
                </span>
                {overdue && !sel && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"
                    title="Prazo vencido"
                  />
                )}
              </div>
              {sel && (
                <span className="text-[10px] text-muted-foreground/70 truncate max-w-[160px]">
                  {week.theme}
                </span>
              )}
            </div>

            {/* Connector */}
            {idx < weeks.length - 1 && (
              <span
                className={cn(
                  "absolute -right-1.5 top-1/2 -translate-y-1/2 h-px w-1.5",
                  "bg-border"
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
