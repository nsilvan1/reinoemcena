"use client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryCardItem {
  _id: string;
  title: string;
  coverImageUrl?: string;
  traits: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedId?: string;
  onSelect: (id: string | null) => void;
}

export function HistoryCardPicker({ open, onOpenChange, selectedId, onSelect }: Props) {
  const [list, setList] = useState<HistoryCardItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const url = debounced
      ? `/api/history-cards?search=${encodeURIComponent(debounced)}`
      : "/api/history-cards";
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then(setList);
  }, [open, debounced]);

  function handlePick(id: string) {
    onSelect(id === selectedId ? null : id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 flex flex-col">
        <SheetTitle className="sr-only">Escolher história</SheetTitle>

        <div className="px-4 py-3 border-b sticky top-0 bg-background z-10 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base">Escolher história</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-9 pl-8 pr-8 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-3">
          {selectedId && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                onOpenChange(false);
              }}
              className="w-full mb-3 text-[11px] text-red-600 hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Remover história vinculada
            </button>
          )}

          {list === null ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {debounced ? "Nenhuma história encontrada" : "Acervo de histórias vazio"}
            </div>
          ) : (
            <ul className="space-y-2">
              {list.map((c) => {
                const isSelected = c._id === selectedId;
                return (
                  <li key={c._id}>
                    <button
                      type="button"
                      onClick={() => handlePick(c._id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg border bg-card hover:border-primary/40 transition-colors text-left",
                        isSelected && "border-primary bg-primary/5"
                      )}
                    >
                      <div className="h-14 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                        {c.coverImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={c.coverImageUrl}
                            alt={c.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <BookOpen className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        {c.traits.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {c.traits.slice(0, 3).map((t) => (
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
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
