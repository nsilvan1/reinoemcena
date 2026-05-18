"use client";
import { BookOpen, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HistoryCardSummary {
  _id: string;
  title: string;
  coverImageUrl?: string;
  traits: string[];
  description?: string;
  attachments?: { url: string; name: string; mimeType: string; size: number }[];
  createdBy?: { _id: string; name: string } | null;
  createdAt?: string;
}

interface Props {
  card: HistoryCardSummary;
  onClick: () => void;
  className?: string;
  /** Lista densa: linha horizontal com thumbnail 40×40 */
  dense?: boolean;
}

export function HistoryCardItem({ card, onClick, className, dense }: Props) {
  if (dense) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
          "transition-colors hover:bg-[oklch(0.225_0.016_172)]",
          className
        )}
      >
        {/* Thumbnail 40×40 */}
        <div className="h-10 w-10 rounded-md overflow-hidden shrink-0 bg-[oklch(0.255_0.016_172)]">
          {card.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.coverImageUrl}
              alt={card.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <BookOpen className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Title */}
        <span className="flex-1 min-w-0 text-[13px] font-medium truncate">{card.title}</span>

        {/* Traits */}
        {card.traits.length > 0 && (
          <span className="hidden sm:block text-[11px] text-muted-foreground/60 truncate max-w-[160px]">
            {card.traits.slice(0, 4).map((t) => `#${t}`).join(" ")}
          </span>
        )}

        {/* Attachment count */}
        {(card.attachments?.length ?? 0) > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground/40 shrink-0">
            <Paperclip className="h-2.5 w-2.5" />
            {card.attachments!.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left rounded-xl overflow-hidden",
        "bg-card border border-border",
        "transition-all duration-200",
        "hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_8px_24px_oklch(0_0_0_/_0.35)]",
        className
      )}
    >
      {/* Cover image — aspect-video */}
      <div className="aspect-video w-full bg-[oklch(0.255_0.016_172)] relative overflow-hidden">
        {card.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverImageUrl}
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
            <BookOpen className="h-10 w-10" />
          </div>
        )}
        {(card.attachments?.length ?? 0) > 0 && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">
            <Paperclip className="h-2.5 w-2.5" />
            {card.attachments!.length}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-semibold leading-tight truncate">{card.title}</p>
        {card.traits.length > 0 && (
          <p className="text-[11px] text-muted-foreground/55 truncate mt-0.5">
            {card.traits.slice(0, 4).map((t) => `#${t}`).join(" ")}
          </p>
        )}
      </div>
    </button>
  );
}
