"use client";
import { useState } from "react";
import { BookOpen, Drama, Plus, ChevronRight } from "lucide-react";
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

export function WeekReferences({
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
      <div className="card-elevated border rounded-xl bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" /> Referências
          </p>
        </div>

        <div className="p-3 space-y-3">
          {/* História da semana */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-2.5 w-2.5" /> História
              </p>
              {canEdit && (
                <button
                  onClick={onPickHistory}
                  className="text-[11px] text-primary hover:underline"
                >
                  {hasHistory ? "Trocar" : "Vincular"}
                </button>
              )}
            </div>
            {hasHistory ? (
              <button
                type="button"
                onClick={() => setOpenHistory(true)}
                className="w-full flex items-center gap-2 p-2 rounded-lg border bg-card hover:border-primary/40 transition-colors text-left"
              >
                <div className="h-12 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                  {historyCard.coverImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={historyCard.coverImageUrl}
                      alt={historyCard.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{historyCard.title}</p>
                  {historyCard.traits.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {historyCard.traits.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="inline-block px-1 py-0 rounded text-[9px] font-medium bg-primary/10 text-primary"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              </button>
            ) : canEdit ? (
              <button
                type="button"
                onClick={onPickHistory}
                className="w-full p-3 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="h-3 w-3" /> Vincular história do acervo
              </button>
            ) : (
              <p className="text-[11px] text-muted-foreground/40 italic px-2">
                Nenhuma história vinculada
              </p>
            )}
          </div>

          {/* Personagens da semana */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Drama className="h-2.5 w-2.5" /> Personagens
                {hasCharacters && (
                  <span className="text-muted-foreground/50 normal-case font-normal">
                    ({characters.length})
                  </span>
                )}
              </p>
              {canEdit && (
                <button
                  onClick={onPickCharacters}
                  className="text-[11px] text-primary hover:underline"
                >
                  {hasCharacters ? "Editar" : "Vincular"}
                </button>
              )}
            </div>
            {hasCharacters ? (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {characters.map((ch) => (
                  <button
                    key={ch._id}
                    type="button"
                    onClick={() => setOpenCharacter(ch._id)}
                    className={cn(
                      "shrink-0 w-16 text-center space-y-1 group"
                    )}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-transparent group-hover:border-primary/40 transition-colors">
                      {ch.coverImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={ch.coverImageUrl}
                          alt={ch.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Drama className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-medium truncate leading-tight">{ch.name}</p>
                  </button>
                ))}
              </div>
            ) : canEdit ? (
              <button
                type="button"
                onClick={onPickCharacters}
                className="w-full p-3 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="h-3 w-3" /> Escolher personagens do acervo
              </button>
            ) : (
              <p className="text-[11px] text-muted-foreground/40 italic px-2">
                Nenhum personagem vinculado
              </p>
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
