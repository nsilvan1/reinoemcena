"use client";
import { useState } from "react";
import { BookOpen, Drama, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { CharacterSheet } from "@/components/acervo/character-sheet";
import { HistoryCardSheet } from "@/components/acervo/history-card-sheet";

interface HistoryCardRef {
  _id: string;
  title: string;
  coverImageUrl?: string;
  traits: string[];
}
interface CharacterRef {
  _id: string;
  name: string;
  coverImageUrl?: string;
  traits?: string[];
}

interface Props {
  historyCard?: HistoryCardRef | null;
  characters: CharacterRef[];
  canEdit: boolean;
  onPickHistory: () => void;
  onPickCharacters: () => void;
}

export function ReferencesStrip({
  historyCard,
  characters,
  canEdit,
  onPickHistory,
  onPickCharacters,
}: Props) {
  const [openCharacter, setOpenCharacter] = useState<string | undefined>();
  const [openHistory, setOpenHistory] = useState(false);
  const hasHistory = !!historyCard;
  const hasCharacters = characters.length > 0;

  if (!hasHistory && !hasCharacters && !canEdit) return null;

  return (
    <>
      {/*
       * Mobile  (< sm): empilha os dois grupos em coluna com divisória horizontal
       * Desktop (sm+):  flex horizontal com separador vertical — layout original
       */}
      <div className="rounded-lg surface-1 text-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-y-0 sm:gap-x-4 sm:gap-y-2 sm:px-3 sm:py-2">
          {/* História */}
          <div className="flex items-center gap-2 min-w-0 px-3 py-2.5 sm:px-0 sm:py-0 min-h-[44px] sm:min-h-0">
            <BookOpen className="h-3 w-3 text-muted-foreground/70 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0">
              História
            </span>
            {hasHistory ? (
              <button
                type="button"
                onClick={() => setOpenHistory(true)}
                className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-border bg-[oklch(0.22_0.016_172)] hover:border-primary/30 transition-colors min-w-0"
              >
                {historyCard?.coverImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={historyCard.coverImageUrl}
                    alt=""
                    className="h-4 w-4 rounded object-cover shrink-0"
                  />
                ) : (
                  <span className="h-4 w-4 rounded bg-muted flex items-center justify-center shrink-0">
                    <BookOpen className="h-2.5 w-2.5 text-muted-foreground/50" />
                  </span>
                )}
                <span className="text-[11px] font-medium truncate max-w-[180px]">
                  {historyCard?.title}
                </span>
                {canEdit && (
                  <Pencil
                    className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickHistory();
                    }}
                  />
                )}
              </button>
            ) : canEdit ? (
              <button
                type="button"
                onClick={onPickHistory}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded border border-dashed border-border hover:border-primary/40"
              >
                <Plus className="h-2.5 w-2.5" /> vincular
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground/40 italic">—</span>
            )}
          </div>

          {/* Divisória — horizontal em mobile, vertical em desktop */}
          <span className="block h-px w-full sm:h-3 sm:w-px bg-border sm:self-center" />

          {/* Personagens */}
          <div className="flex items-center gap-2 min-w-0 px-3 py-2.5 sm:px-0 sm:py-0 min-h-[44px] sm:min-h-0">
            <Drama className="h-3 w-3 text-muted-foreground/70 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 shrink-0">
              Personagens
            </span>
            {hasCharacters ? (
              <>
                <div className="flex items-center -space-x-1.5">
                  {characters.slice(0, 5).map((ch) => (
                    <button
                      key={ch._id}
                      type="button"
                      onClick={() => setOpenCharacter(ch._id)}
                      className="relative h-7 w-7 sm:h-6 sm:w-6 rounded-full border-2 border-background bg-muted overflow-hidden hover:z-10 hover:scale-110 transition-transform"
                      title={ch.name}
                    >
                      {ch.coverImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={ch.coverImageUrl}
                          alt={ch.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                          {ch.name[0]}
                        </div>
                      )}
                    </button>
                  ))}
                  {characters.length > 5 && (
                    <span className="relative h-7 w-7 sm:h-6 sm:w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                      +{characters.length - 5}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={onPickCharacters}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    editar
                  </button>
                )}
              </>
            ) : canEdit ? (
              <button
                type="button"
                onClick={onPickCharacters}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors",
                  "px-1.5 py-0.5 rounded border border-dashed border-border hover:border-primary/40"
                )}
              >
                <Plus className="h-2.5 w-2.5" /> escolher
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground/40 italic">—</span>
            )}
          </div>
        </div>
      </div>

      <CharacterSheet
        open={!!openCharacter}
        onOpenChange={(v) => !v && setOpenCharacter(undefined)}
        characterId={openCharacter}
        canEdit={false}
        onSaved={() => {}}
        onDeleted={() => {}}
      />

      {historyCard && (
        <HistoryCardSheet
          open={openHistory}
          onOpenChange={setOpenHistory}
          cardId={historyCard._id}
          canEdit={false}
          onSaved={() => {}}
          onDeleted={() => {}}
        />
      )}
    </>
  );
}
