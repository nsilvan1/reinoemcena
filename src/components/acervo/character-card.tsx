"use client";
import { Drama } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CharacterSummary {
  _id: string;
  name: string;
  coverImageUrl?: string;
  traits: string[];
  description?: string;
  gallery?: string[];
}

interface Props {
  character: CharacterSummary;
  onClick: () => void;
  className?: string;
  /** Lista densa: mostra linha horizontal em vez de card vertical */
  dense?: boolean;
}

export function CharacterCard({ character, onClick, className, dense }: Props) {
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
          {character.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.coverImageUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Drama className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Name */}
        <span className="flex-1 min-w-0 text-[13px] font-medium truncate">
          {character.name}
        </span>

        {/* Traits (inline, truncated) */}
        {character.traits.length > 0 && (
          <span className="hidden sm:block text-[11px] text-muted-foreground/60 truncate max-w-[160px]">
            {character.traits.slice(0, 4).map((t) => `#${t}`).join(" ")}
          </span>
        )}

        {/* Gallery count */}
        {(character.gallery?.length ?? 0) > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">
            +{character.gallery!.length}
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
      {/* Cover image — aspect-ratio 4:5 */}
      <div className="relative overflow-hidden bg-[oklch(0.255_0.016_172)]" style={{ aspectRatio: "4/5" }}>
        {character.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.coverImageUrl}
            alt={character.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
            <Drama className="h-10 w-10" />
          </div>
        )}
        {(character.gallery?.length ?? 0) > 0 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">
            +{character.gallery!.length}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-semibold leading-tight truncate">{character.name}</p>
        {character.traits.length > 0 && (
          <p className="text-[11px] text-muted-foreground/55 truncate mt-0.5">
            {character.traits.slice(0, 4).map((t) => `#${t}`).join(" ")}
          </p>
        )}
      </div>
    </button>
  );
}
