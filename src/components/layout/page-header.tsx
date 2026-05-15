import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  variant?: "default" | "compact";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  meta,
  className,
  variant = "default",
}: PageHeaderProps) {
  const compact = variant === "compact";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl card-glass",
        compact ? "p-4" : "p-5 sm:p-6",
        className
      )}
    >
      {/* Decorative subtle grid + gradient */}
      <div className="absolute inset-0 bg-dots opacity-40 pointer-events-none" />
      <div className="absolute -top-24 -right-20 h-56 w-56 rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          {Icon && (
            <div
              className={cn(
                "shrink-0 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center",
                compact ? "h-9 w-9" : "h-11 w-11"
              )}
            >
              <Icon
                className={cn(compact ? "h-4 w-4" : "h-5 w-5", "text-primary")}
                strokeWidth={1.8}
              />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70 mb-1">
                {eyebrow}
              </p>
            )}
            <h1
              className={cn(
                "font-heading font-semibold leading-[1.1] tracking-tight",
                compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
              )}
            >
              {title}
            </h1>
            {description && (
              <p
                className={cn(
                  "text-muted-foreground mt-1 max-w-2xl",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {description}
              </p>
            )}
            {meta && <div className="mt-3">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
