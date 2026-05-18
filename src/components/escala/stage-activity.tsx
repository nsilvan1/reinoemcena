"use client";
import {
  CheckCircle2,
  Paperclip,
  MessageSquare,
  ExternalLink,
  X,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { STEPS } from "@/components/pipeline/mini-pipeline";

interface ActivityItem {
  type: "completion" | "link" | "comment";
  time: Date;
  data: {
    userId?: { name?: string };
    role?: string;
    linkUrl?: string;
    message?: string;
  };
}

interface Props {
  viewingStage: string;
  items: ActivityItem[];
  onClose: () => void;
}

export function StageActivity({ viewingStage, items, onClose }: Props) {
  const step = STEPS.find((s) => s.key === viewingStage);
  if (!step) return null;

  return (
    <div className={cn("rounded-xl overflow-hidden card-glass", step.lightBg)}>
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2">
          <History className={cn("h-3.5 w-3.5", step.color)} />
          <span className={cn("text-xs font-bold uppercase tracking-wider", step.color)}>
            Atividade — {step.label}
          </span>
          {items.length > 0 && (
            <span className="text-[10px] text-muted-foreground/70 font-mono tabular-nums">
              ({items.length})
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-background/50 transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 py-3 max-h-56 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/50 py-2 text-center">
            Nenhuma atividade registrada nesta etapa
          </p>
        ) : (
          <ol className="relative space-y-2.5">
            <span className="absolute left-[10px] top-1 bottom-1 w-px bg-border/40" />
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 relative">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 relative z-10 border-2 border-background",
                    item.type === "completion"
                      ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.78_0.13_158)]"
                      : item.type === "link"
                        ? "bg-[oklch(0.22_0.030_220)] text-[oklch(0.78_0.13_220)]"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.type === "completion" ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : item.type === "link" ? (
                    <Paperclip className="h-2.5 w-2.5" />
                  ) : (
                    <MessageSquare className="h-2.5 w-2.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.type === "completion" && (
                    <p className="text-[12px] leading-snug">
                      <span className="font-semibold">{item.data.userId?.name}</span>
                      <span className="text-muted-foreground"> concluiu como </span>
                      <span className="font-medium">{item.data.role}</span>
                    </p>
                  )}
                  {item.type === "link" && (
                    <p className="text-[12px] leading-snug">
                      <span className="font-semibold">{item.data.userId?.name}</span>
                      <span className="text-muted-foreground"> anexou </span>
                      <a
                        href={item.data.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        link <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </p>
                  )}
                  {item.type === "comment" && (
                    <p className="text-[12px] leading-snug">
                      <span className="font-semibold">{item.data.userId?.name}: </span>
                      <span className="text-muted-foreground">{item.data.message}</span>
                    </p>
                  )}
                  <p className="text-[9px] text-muted-foreground/50 mt-0.5 font-mono">
                    {format(item.time, "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
