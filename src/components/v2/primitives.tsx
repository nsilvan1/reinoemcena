"use client";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Button ─────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
}

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_1px_0_oklch(1_0_0_/_0.15)_inset,0_2px_8px_oklch(0_0_0_/_0.4)] hover:shadow-[0_1px_0_oklch(1_0_0_/_0.2)_inset,0_4px_12px_oklch(0.74_0.16_158_/_0.3)]",
  secondary:
    "bg-surface-2 text-foreground border border-border hover:bg-[oklch(0.20_0.010_240)] hover:border-[oklch(0.30_0.010_240)]",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-[oklch(0.18_0.010_240)]",
  outline:
    "border border-border text-foreground hover:bg-[oklch(0.18_0.010_240)] hover:border-[oklch(0.30_0.010_240)]",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90",
};

const BTN_SIZES: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-[11px] gap-1 rounded-md",
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-[13px] gap-1.5 rounded-lg",
  lg: "h-10 px-4 text-sm gap-2 rounded-lg",
  icon: "h-8 w-8 rounded-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
        "active:scale-[0.98]",
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-3 w-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

// ─── Card / Surface ────────────────────────────────────────────────

export function Card({
  className,
  interactive,
  elevated,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; elevated?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl",
        elevated ? "surface-elevated" : interactive ? "surface-interactive" : "surface-1",
        className
      )}
      {...props}
    />
  );
}

// ─── Field (label + input wrapper) ─────────────────────────────────

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/85">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-destructive" /> {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground/70">{hint}</p>
      ) : null}
    </div>
  );
}

// ─── Input v2 ───────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leading, trailing, ...props }, ref) => (
    <div className="relative group">
      {leading && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors pointer-events-none">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        {...props}
        className={cn(
          "h-10 w-full rounded-lg bg-[oklch(0.16_0.010_240)] border border-border px-3 text-sm text-foreground",
          "placeholder:text-muted-foreground/40",
          "outline-none transition-[border-color,box-shadow,background-color] duration-150",
          "hover:border-[oklch(0.30_0.010_240)]",
          "focus:border-primary/60 focus:bg-[oklch(0.18_0.012_240)] focus:ring-4 focus:ring-primary/15",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          leading && "pl-10",
          trailing && "pr-10",
          className
        )}
      />
      {trailing && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>
      )}
    </div>
  )
);
Input.displayName = "Input";

// ─── Badge ──────────────────────────────────────────────────────────

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "violet" | "amber";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-[oklch(0.22_0.010_240)] text-[oklch(0.85_0.005_240)] border-[oklch(0.28_0.010_240)]",
  primary: "bg-[oklch(0.24_0.030_158)] text-[oklch(0.86_0.12_158)] border-[oklch(0.30_0.050_158)]",
  success: "bg-[oklch(0.22_0.030_158)] text-[oklch(0.86_0.14_158)] border-[oklch(0.28_0.060_158)]",
  warning: "bg-[oklch(0.22_0.030_60)] text-[oklch(0.86_0.14_60)] border-[oklch(0.30_0.060_60)]",
  danger: "bg-[oklch(0.22_0.030_25)] text-[oklch(0.86_0.14_25)] border-[oklch(0.30_0.060_25)]",
  info: "bg-[oklch(0.22_0.030_220)] text-[oklch(0.86_0.14_220)] border-[oklch(0.30_0.060_220)]",
  violet: "bg-[oklch(0.22_0.030_300)] text-[oklch(0.86_0.14_300)] border-[oklch(0.30_0.060_300)]",
  amber: "bg-[oklch(0.22_0.030_80)] text-[oklch(0.86_0.14_80)] border-[oklch(0.30_0.060_80)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium uppercase tracking-wider whitespace-nowrap",
        BADGE_TONES[tone],
        className
      )}
      {...props}
    />
  );
}

// ─── Avatar ─────────────────────────────────────────────────────────

interface AvatarProps {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "away" | null;
  className?: string;
}

const AVA_SIZES = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
  xl: "h-14 w-14 text-base",
};

export function Avatar({ name, src, size = "md", status, className }: AvatarProps) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold overflow-hidden",
          "bg-gradient-to-br from-[oklch(0.32_0.045_158)] to-[oklch(0.20_0.020_158)] text-[oklch(0.92_0.10_158)]",
          "ring-1 ring-[oklch(0.40_0.060_158)]/30",
          AVA_SIZES[size]
        )}
      >
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt={name || ""} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </span>
      {status && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background",
            size === "xs" || size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
            status === "online" && "bg-emerald-400 status-pulse",
            status === "away" && "bg-amber-400",
            status === "offline" && "bg-zinc-500"
          )}
        />
      )}
    </span>
  );
}

// ─── KBD ────────────────────────────────────────────────────────────

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("kbd", className)}>{children}</span>;
}

// ─── Stat Tile ──────────────────────────────────────────────────────

interface StatProps {
  label: string;
  value: number | string;
  hint?: string;
  trend?: { value: number; label?: string };
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent?: "primary" | "info" | "warning" | "danger" | "violet";
  className?: string;
}

const STAT_ACCENT: Record<NonNullable<StatProps["accent"]>, { bar: string; text: string; bg: string }> = {
  primary: { bar: "from-[oklch(0.74_0.16_158)]", text: "text-[oklch(0.85_0.14_158)]", bg: "bg-[oklch(0.22_0.030_158)]" },
  info: { bar: "from-[oklch(0.72_0.16_220)]", text: "text-[oklch(0.85_0.14_220)]", bg: "bg-[oklch(0.22_0.030_220)]" },
  warning: { bar: "from-[oklch(0.78_0.16_60)]", text: "text-[oklch(0.85_0.14_60)]", bg: "bg-[oklch(0.22_0.030_60)]" },
  danger: { bar: "from-[oklch(0.65_0.20_25)]", text: "text-[oklch(0.80_0.16_25)]", bg: "bg-[oklch(0.22_0.030_25)]" },
  violet: { bar: "from-[oklch(0.72_0.18_310)]", text: "text-[oklch(0.85_0.14_300)]", bg: "bg-[oklch(0.22_0.030_300)]" },
};

export function Stat({ label, value, hint, trend, icon: Icon, accent = "primary", className }: StatProps) {
  const a = STAT_ACCENT[accent];
  return (
    <Card className={cn("relative p-4 overflow-hidden group", className)}>
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <span className={cn("inline-flex h-8 w-8 rounded-lg items-center justify-center", a.bg)}>
            <Icon className={cn("h-4 w-4", a.text)} strokeWidth={1.8} />
          </span>
        )}
        {trend && (
          <span className={cn("text-[10px] font-mono", trend.value >= 0 ? "text-emerald-400" : "text-red-400")}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value}
            {trend.label || "%"}
          </span>
        )}
      </div>
      <p className="font-heading text-3xl font-semibold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/85 mt-2">
        {label}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground/55 mt-1">{hint}</p>}
      <span className={cn("absolute bottom-0 left-0 h-px w-1/2 bg-gradient-to-r to-transparent opacity-60", a.bar)} />
    </Card>
  );
}

// ─── PageHeader ─────────────────────────────────────────────────────

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  back?: { href: string; label?: string };
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  meta,
  back,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("relative", className)}>
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          ← {back.label || "voltar"}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          {Icon && (
            <span className="shrink-0 h-11 w-11 rounded-xl bg-[oklch(0.18_0.014_158)] ring-1 ring-[oklch(0.28_0.030_158)]/40 inline-flex items-center justify-center">
              <Icon className="h-5 w-5 text-[oklch(0.80_0.14_158)]" strokeWidth={1.7} />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-[oklch(0.65_0.12_158)] mb-1.5">
                {eyebrow}
              </p>
            )}
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold leading-[1.05] tracking-[-0.03em]">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
            )}
            {meta && <div className="mt-4">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

// ─── Empty State ────────────────────────────────────────────────────

interface EmptyProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyProps) {
  return (
    <Card className={cn("p-10 sm:p-14 flex flex-col items-center text-center relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-dots-faint opacity-50 pointer-events-none" />
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl bg-[oklch(0.18_0.014_158)] ring-8 ring-[oklch(0.16_0.010_240)] flex items-center justify-center mx-auto">
          <Icon className="h-6 w-6 text-[oklch(0.78_0.13_158)]" strokeWidth={1.6} />
        </div>
        <h3 className="font-heading text-xl font-semibold mt-5 tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground/80 mt-2 max-w-md leading-relaxed mx-auto">
            {description}
          </p>
        )}
        {action && <div className="mt-6 inline-flex">{action}</div>}
      </div>
    </Card>
  );
}

// ─── Section heading (eyebrow + title) ────────────────────────────

export function SectionHeading({
  eyebrow,
  title,
  count,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  count?: number;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-2 mb-3", className)}>
      <div>
        {eyebrow && (
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/65 mb-1">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)] border border-[oklch(0.30_0.050_158)]">
              {count}
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
