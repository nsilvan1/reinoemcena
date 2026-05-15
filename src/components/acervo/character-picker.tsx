"use client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Drama, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterItem {
  _id: string;
  name: string;
  coverImageUrl?: string;
  traits: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}

export function CharacterPicker({ open, onOpenChange, selectedIds, onConfirm }: Props) {
  const [list, setList] = useState<CharacterItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    if (open) setPicked(new Set(selectedIds));
  }, [open, selectedIds]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const url = debounced
      ? `/api/characters?search=${encodeURIComponent(debounced)}`
      : "/api/characters";
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then(setList);
  }, [open, debounced]);

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < 20) n.add(id);
      return n;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(picked));
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 flex flex-col">
        <SheetTitle className="sr-only">Escolher personagens</SheetTitle>

        <div className="px-4 py-3 border-b sticky top-0 bg-background z-10 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Drama className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-base">Personagens</h2>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {picked.size}/20 escolhidos
            </span>
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
          {list === null ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Drama className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {debounced ? "Nenhum personagem encontrado" : "Acervo de personagens vazio"}
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {list.map((c) => {
                const isPicked = picked.has(c._id);
                return (
                  <li key={c._id}>
                    <button
                      type="button"
                      onClick={() => toggle(c._id)}
                      className={cn(
                        "w-full text-left rounded-lg overflow-hidden border bg-card hover:border-primary/40 transition-colors relative",
                        isPicked && "border-primary ring-2 ring-primary/30"
                      )}
                    >
                      <div className="aspect-square w-full bg-muted">
                        {c.coverImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={c.coverImageUrl}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <Drama className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="p-1.5">
                        <p className="text-[11px] font-semibold truncate">{c.name}</p>
                      </div>
                      {isPicked && (
                        <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-3 border-t sticky bottom-0 bg-background flex gap-2">
          <Button variant="ghost" className="flex-1 h-9" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="flex-1 h-9" onClick={handleConfirm}>
            Confirmar ({picked.size})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
