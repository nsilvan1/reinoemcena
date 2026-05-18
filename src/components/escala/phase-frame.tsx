"use client";
import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Step accent color text class (eg STEPS[0].color) */
  accentText: string;
  /** Rail bg class (eg STEPS[0].bg) */
  rail: string;
  /** Background tint (eg STEPS[0].lightBg) */
  tint?: string;
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  /** Right-aligned actions (e.g. Avançar button) */
  actions?: ReactNode;
  /** Progress bar 0..1 to show under header */
  progress?: { done: number; total: number };
  children: ReactNode;
}

export function PhaseFrame({
  accentText,
  rail,
  tint,
  icon: Icon,
  label,
  subtitle,
  actions,
  progress,
  children,
}: Props) {
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className={cn("relative rounded-xl overflow-hidden card-glass", tint)}>
      {/* Rail */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", rail)} />

      {/* Header */}
      <div className="pl-4 pr-3 py-3 flex items-start justify-between gap-3 border-b border-border/40">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", accentText)} />
          <div className="min-w-0">
            <p className={cn("text-sm font-bold leading-tight", accentText)}>
              {label}
            </p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight">
                {subtitle}
              </p>
            )}
            {progress && progress.total > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", rail)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground/70">
                  {progress.done}/{progress.total}
                </span>
              </div>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>

      {/* Body */}
      <div className="pl-4 pr-3 py-3 space-y-3">{children}</div>
    </div>
  );
}
