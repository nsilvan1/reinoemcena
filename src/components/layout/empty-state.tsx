import { cn } from "@/lib/utils";

interface Props {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "primary";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
}: Props) {
  const tones = {
    neutral: {
      ring: "ring-muted/40",
      bg: "bg-muted/30",
      icon: "text-muted-foreground/50",
    },
    primary: {
      ring: "ring-primary/15",
      bg: "bg-primary/5",
      icon: "text-primary/70",
    },
  }[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl card-glass p-10 sm:p-14 flex flex-col items-center text-center",
        className
      )}
    >
      <div className="absolute inset-0 bg-dots opacity-30 pointer-events-none" />
      <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-md">
        <div
          className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center ring-8",
            tones.bg,
            tones.ring
          )}
        >
          <Icon className={cn("h-6 w-6", tones.icon)} strokeWidth={1.6} />
        </div>
        <h3 className="font-heading text-lg font-semibold mt-5 tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground/80 mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
