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
}

export function CharacterCard({ character, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left rounded-xl overflow-hidden card-glass hover:-translate-y-0.5 transition-all",
        className
      )}
    >
      <div className="aspect-square w-full bg-muted relative overflow-hidden">
        {character.coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={character.coverImageUrl}
            alt={character.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Drama className="h-10 w-10" />
          </div>
        )}
        {character.gallery && character.gallery.length > 0 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">
            +{character.gallery.length}
          </span>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-bold leading-tight truncate">{character.name}</p>
        {character.traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {character.traits.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary"
              >
                #{t}
              </span>
            ))}
            {character.traits.length > 3 && (
              <span className="text-[10px] text-muted-foreground/60">
                +{character.traits.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
