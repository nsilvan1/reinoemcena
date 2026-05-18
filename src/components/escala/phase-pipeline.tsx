"use client";
import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEPS } from "@/components/pipeline/mini-pipeline";

interface Props {
  status: string;
  viewingStage: string | null;
  onSelectStage: (stage: string | null) => void;
}

export function PhasePipeline({ status, viewingStage, onSelectStage }: Props) {
  const stepIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="card-glass rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          const clickable = i <= stepIdx;
          const viewing = viewingStage === s.key;
          const Icon = s.icon;
          return (
            <Fragment key={s.key}>
              <button
                onClick={() =>
                  clickable ? onSelectStage(viewing ? null : s.key) : undefined
                }
                disabled={!clickable}
                className={cn(
                  "flex flex-col items-center gap-1 group transition-all",
                  clickable ? "cursor-pointer" : "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center transition-all",
                    active
                      ? `bg-gradient-to-br ${s.gradient} text-[oklch(0.10_0.012_158)] shadow-sm`
                      : done
                        ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.78_0.13_158)]"
                        : "bg-[oklch(0.20_0.016_172)] text-muted-foreground/25 border border-border",
                    clickable && !viewing && "group-hover:ring-2 group-hover:ring-primary/20",
                    viewing && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wider transition-colors",
                    viewing
                      ? "text-primary"
                      : active
                        ? s.color
                        : done
                          ? "text-[oklch(0.65_0.12_158)]"
                          : "text-muted-foreground/25"
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-0.5 -mt-4",
                    i < stepIdx ? "bg-[oklch(0.45_0.12_158)]" : "bg-border"
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
