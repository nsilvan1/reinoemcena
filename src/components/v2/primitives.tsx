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
    "bg-primary text-primary-foreground hover:bg-[oklch(0.78_0.16_158)] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.12)]",
  secondary:
    "bg-[oklch(0.235_0.014_172)] text-foreground border border-border hover:bg-[oklch(0.265_0.015_172)] hover:border-[oklch(0.36_0.018_170)]",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-[oklch(0.225_0.014_172)]",
  outline:
    "border border-border text-foreground bg-transparent hover:bg-[oklch(0.225_0.014_172)] hover:border-[oklch(0.36_0.018_170)]",
  destructive:
    "bg-destructive text-white hover:bg-[oklch(0.66_0.21_25)]",
};

const BTN_SIZES: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-[11px] gap-1 rounded-md",
  sm: "h-8 px-3 text-[12px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-1.5 rounded-md",
  lg: "h-10 px-4 text-sm gap-2 rounded-md",
  icon: "h-8 w-8 rounded-md",
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

type CardAccent = "primary" | "info" | "warning" | "danger" | "violet" | "amber";

const CARD_ACCENT_HUE: Record<CardAccent, number> = {
  primary: 158,
  info: 220,
  warning: 60,
  danger: 25,
  violet: 300,
  amber: 80,
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  elevated?: boolean;
  /** Pinta um rail de 2px lateral colorido (estilo Linear). */
  accent?: CardAccent;
}

/**
 * Card v3 — minimalista. Padrão é `bg-card + border-border + radius-md`.
 * `interactive` adiciona hover-lift de 1px (translateY -1) e borda mais clara.
 * `accent` pinta apenas um rail lateral 2px na cor do tema — não tinge o fundo.
 */
export function Card({
  className,
  interactive,
  elevated,
  accent,
  style,
  ...props
}: CardProps) {
  const hue = accent ? CARD_ACCENT_HUE[accent] : null;
  return (
    <div
      style={
        hue !== null
          ? { ...(style || {}), boxShadow: `inset 2px 0 0 0 oklch(0.62 0.18 ${hue})` }
          : style
      }
      className={cn(
        "rounded-lg bg-card border border-border",
        elevated && "shadow-[0_1px_2px_oklch(0_0_0_/_0.35),0_8px_24px_oklch(0_0_0_/_0.25)]",
        interactive && "transition-[transform,border-color,background-color] duration-150 hover:-translate-y-px hover:border-[oklch(0.36_0.018_170)] hover:bg-[oklch(0.215_0.016_172)]",
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
        <label className="text-[12px] font-medium text-foreground/85">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-destructive" /> {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground/60">{hint}</p>
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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/55 group-focus-within:text-foreground transition-colors pointer-events-none">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        {...props}
        className={cn(
          "h-9 w-full rounded-md bg-[oklch(0.215_0.014_172)] border border-border px-3 text-[13px] text-foreground",
          "placeholder:text-muted-foreground/45",
          "outline-none transition-[border-color,box-shadow] duration-150",
          "hover:border-[oklch(0.36_0.018_170)]",
          "focus:border-primary/70 focus:ring-2 focus:ring-primary/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          leading && "pl-9",
          trailing && "pr-9",
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
  neutral: "bg-[oklch(0.265_0.014_170)] text-[oklch(0.82_0.010_172)]",
  primary: "bg-[oklch(0.26_0.040_158)] text-[oklch(0.86_0.13_158)]",
  success: "bg-[oklch(0.24_0.045_158)] text-[oklch(0.86_0.14_158)]",
  warning: "bg-[oklch(0.24_0.040_60)] text-[oklch(0.86_0.14_60)]",
  danger: "bg-[oklch(0.24_0.040_25)] text-[oklch(0.86_0.14_25)]",
  info: "bg-[oklch(0.24_0.040_220)] text-[oklch(0.86_0.14_220)]",
  violet: "bg-[oklch(0.24_0.040_300)] text-[oklch(0.86_0.14_300)]",
  amber: "bg-[oklch(0.24_0.040_80)] text-[oklch(0.86_0.14_80)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap",
        BADGE_TONES[tone],
        className
      )}
      {...props}
    />
  );
}

// ─── Avatar ─────────────────────────────────────────────────────────

/** Derives a stable gradient + ring from a name string via simple hash. */
export function getAvatarColor(name: string): {
  from: string;
  to: string;
  ring: string;
  text: string;
} {
  // Hue palette: 12 well-distributed hues, skipping near-black ranges
  const HUES = [158, 175, 210, 240, 270, 300, 330, 25, 50, 70, 100, 130];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = HUES[hash % HUES.length];
  return {
    from: `oklch(0.34 0.055 ${hue})`,
    to: `oklch(0.20 0.028 ${hue})`,
    ring: `oklch(0.42 0.070 ${hue} / 0.35)`,
    text: `oklch(0.92 0.10 ${hue})`,
  };
}

interface AvatarProps {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "offline" | "away" | null;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  className?: string;
}

const AVA_SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
  xl: "h-14 w-14 text-base",
  "2xl": "h-20 w-20 text-xl",
};

export function Avatar({ name, src, size = "md", status, icon: Icon, className }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const displayName = name || "";
  const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";
  const colors = getAvatarColor(displayName || "?");
  const showImg = src && !imgError;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold overflow-hidden",
          AVA_SIZES[size]
        )}
        style={
          showImg
            ? {}
            : {
                background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                color: colors.text,
                boxShadow: `0 0 0 1px ${colors.ring}`,
              }
        }
      >
        {showImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={displayName}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : Icon ? (
          <Icon className="h-[40%] w-[40%]" strokeWidth={1.8} />
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
    <Card className={cn("p-4 group", className)}>
      <div className="flex items-center gap-2.5 mb-3">
        {Icon && (
          <span className={cn("inline-flex h-7 w-7 rounded-md items-center justify-center", a.bg)}>
            <Icon className={cn("h-3.5 w-3.5", a.text)} strokeWidth={1.8} />
          </span>
        )}
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70 truncate">
          {label}
        </p>
        {trend && (
          <span className={cn("ml-auto text-[10px] font-medium tabular-nums", trend.value >= 0 ? "text-emerald-400" : "text-red-400")}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value}
            {trend.label || "%"}
          </span>
        )}
      </div>
      <p className="text-[26px] font-semibold tabular-nums leading-none tracking-tight">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground/55 mt-1.5">{hint}</p>}
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
    <header className={cn("relative pb-6 mb-2 border-b border-border/60", className)}>
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          ← {back.label || "voltar"}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {Icon && (
            <span className="shrink-0 h-9 w-9 rounded-md bg-[oklch(0.22_0.030_158)] inline-flex items-center justify-center mt-0.5">
              <Icon className="h-4 w-4 text-[oklch(0.82_0.14_158)]" strokeWidth={1.8} />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/65 mb-1">
                {eyebrow}
              </p>
            )}
            <h1 className="text-[26px] sm:text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">
              {title}
            </h1>
            {description && (
              <p className="text-[13.5px] text-muted-foreground/85 mt-1.5 max-w-2xl leading-relaxed">{description}</p>
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
    <Card className={cn("p-10 sm:p-12 flex flex-col items-center text-center", className)}>
      <div className="h-12 w-12 rounded-md bg-[oklch(0.22_0.030_158)] flex items-center justify-center">
        <Icon className="h-5 w-5 text-[oklch(0.82_0.14_158)]" strokeWidth={1.6} />
      </div>
      <h3 className="text-lg font-semibold mt-4 tracking-tight">{title}</h3>
      {description && (
        <p className="text-[13px] text-muted-foreground/80 mt-1.5 max-w-md leading-relaxed mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 inline-flex">{action}</div>}
    </Card>
  );
}

// ─── KPI Inline strip ───────────────────────────────────────────

type KpiTone = "muted" | "primary" | "warning" | "danger" | "info" | "violet";

const KPI_TONE_COLOR: Record<KpiTone, string> = {
  muted: "text-foreground",
  primary: "text-[oklch(0.82_0.14_158)]",
  warning: "text-[oklch(0.82_0.14_60)]",
  danger: "text-[oklch(0.82_0.14_25)]",
  info: "text-[oklch(0.82_0.14_220)]",
  violet: "text-[oklch(0.82_0.14_300)]",
};

export function KpiInline({
  value,
  label,
  tone = "muted",
}: {
  value: number | string;
  label: string;
  tone?: KpiTone;
}) {
  return (
    <span className="flex items-baseline gap-1.5 leading-none">
      <span className={cn("text-2xl font-semibold tabular-nums tracking-tight", KPI_TONE_COLOR[tone])}>
        {value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
        {label}
      </span>
    </span>
  );
}

export function KpiDivider() {
  return <span className="h-7 w-px bg-border/60" aria-hidden />;
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
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/65 mb-1">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded bg-[oklch(0.255_0.016_172)] text-muted-foreground">
              {count}
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
