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
}

interface Props {
  card: HistoryCardSummary;
  onClick: () => void;
  className?: string;
}

export function HistoryCardItem({ card, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left rounded-xl overflow-hidden card-glass hover:-translate-y-0.5 transition-all",
        className
      )}
    >
      <div className="aspect-video w-full bg-muted relative overflow-hidden">
        {card.coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={card.coverImageUrl}
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <BookOpen className="h-10 w-10" />
          </div>
        )}
        {card.attachments && card.attachments.length > 0 && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">
            <Paperclip className="h-2.5 w-2.5" />
            {card.attachments.length}
          </span>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-bold leading-tight truncate">{card.title}</p>
        {card.traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.traits.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary"
              >
                #{t}
              </span>
            ))}
            {card.traits.length > 3 && (
              <span className="text-[10px] text-muted-foreground/60">
                +{card.traits.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
