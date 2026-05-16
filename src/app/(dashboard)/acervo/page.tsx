"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Drama,
  BookOpen,
  Plus,
  Search,
  Images,
  X,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button, Input, PageHeader } from "@/components/v2/primitives";
import { CharacterCard, type CharacterSummary } from "@/components/acervo/character-card";
import { HistoryCardItem, type HistoryCardSummary } from "@/components/acervo/history-card-item";
import { CharacterSheet } from "@/components/acervo/character-sheet";
import { HistoryCardSheet } from "@/components/acervo/history-card-sheet";
import { ROLE_HIERARCHY, type Role } from "@/types";
import { cn } from "@/lib/utils";

type SortKey = "name-asc" | "name-desc" | "recent";

const SORT_LABELS: Record<SortKey, string> = {
  "name-asc": "A → Z",
  "name-desc": "Z → A",
  recent: "Recentes",
};

export default function AcervoPage() {
  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role || "membro") as Role;
  const canEdit = ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.roteirista;

  const [tab, setTab] = useState<"personagens" | "historias">("personagens");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const [characters, setCharacters] = useState<CharacterSummary[] | null>(null);
  const [historyCards, setHistoryCards] = useState<HistoryCardSummary[] | null>(null);

  const [charTraits, setCharTraits] = useState<Set<string>>(new Set());
  const [charSort, setCharSort] = useState<SortKey>("name-asc");
  const [charWithGallery, setCharWithGallery] = useState(false);

  const [cardTraits, setCardTraits] = useState<Set<string>>(new Set());
  const [cardSort, setCardSort] = useState<SortKey>("name-asc");
  const [cardWithAttach, setCardWithAttach] = useState(false);

  const [sheetCharId, setSheetCharId] = useState<string | undefined>();
  const [sheetCharOpen, setSheetCharOpen] = useState(false);
  const [creatingChar, setCreatingChar] = useState(false);

  const [sheetCardId, setSheetCardId] = useState<string | undefined>();
  const [sheetCardOpen, setSheetCardOpen] = useState(false);
  const [creatingCard, setCreatingCard] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadCharacters = useCallback(async () => {
    const url = debounced ? `/api/characters?search=${encodeURIComponent(debounced)}` : "/api/characters";
    const res = await fetch(url);
    setCharacters(res.ok ? await res.json() : []);
  }, [debounced]);

  const loadHistoryCards = useCallback(async () => {
    const url = debounced
      ? `/api/history-cards?search=${encodeURIComponent(debounced)}`
      : "/api/history-cards";
    const res = await fetch(url);
    setHistoryCards(res.ok ? await res.json() : []);
  }, [debounced]);

  useEffect(() => {
    if (tab === "personagens") loadCharacters();
    else loadHistoryCards();
  }, [tab, loadCharacters, loadHistoryCards]);

  // Traits disponíveis (universo = lista atual sem filtros locais)
  const availableCharTraits = useMemo(
    () => collectTraits(characters ?? []),
    [characters]
  );
  const availableCardTraits = useMemo(
    () => collectTraits(historyCards ?? []),
    [historyCards]
  );

  // Lista final filtrada + ordenada
  const visibleCharacters = useMemo(() => {
    let list = characters ?? [];
    if (charTraits.size > 0)
      list = list.filter((c) => c.traits.some((t) => charTraits.has(t)));
    if (charWithGallery) list = list.filter((c) => (c.gallery?.length ?? 0) > 0);
    return sortBy(list, charSort, (c) => c.name);
  }, [characters, charTraits, charSort, charWithGallery]);

  const visibleHistoryCards = useMemo(() => {
    let list = historyCards ?? [];
    if (cardTraits.size > 0)
      list = list.filter((c) => c.traits.some((t) => cardTraits.has(t)));
    if (cardWithAttach) list = list.filter((c) => (c.attachments?.length ?? 0) > 0);
    return sortBy(list, cardSort, (c) => c.title);
  }, [historyCards, cardTraits, cardSort, cardWithAttach]);

  function openCharacter(id: string) {
    setCreatingChar(false);
    setSheetCharId(id);
    setSheetCharOpen(true);
  }

  function openNewCharacter() {
    setCreatingChar(true);
    setSheetCharId(undefined);
    setSheetCharOpen(true);
  }

  function openHistoryCard(id: string) {
    setCreatingCard(false);
    setSheetCardId(id);
    setSheetCardOpen(true);
  }

  function openNewHistoryCard() {
    setCreatingCard(true);
    setSheetCardId(undefined);
    setSheetCardOpen(true);
  }

  function toggleTrait(setter: React.Dispatch<React.SetStateAction<Set<string>>>, trait: string) {
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(trait)) n.delete(trait);
      else n.add(trait);
      return n;
    });
  }

  const charsFilterActive = charTraits.size > 0 || charWithGallery;
  const cardsFilterActive = cardTraits.size > 0 || cardWithAttach;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Banco visual"
        title="Acervo"
        description="Personagens e histórias para usar nas escalas."
        icon={Images}
        actions={
          canEdit && (
            <Button onClick={tab === "personagens" ? openNewCharacter : openNewHistoryCard}>
              <Plus className="h-3.5 w-3.5" />
              Novo
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "personagens" | "historias")}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <TabsList className="h-9 bg-[oklch(0.205_0.016_172)] border border-border p-1 rounded-lg">
            <TabsTrigger value="personagens" className="text-xs px-3 rounded-md data-active:bg-[oklch(0.22_0.030_158)] data-active:text-[oklch(0.85_0.14_158)]">
              <Drama className="h-3.5 w-3.5" />
              Personagens
              {tab === "personagens" && characters && (
                <span className="ml-1 text-[10px] font-mono text-muted-foreground/55">({visibleCharacters.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="historias" className="text-xs px-3 rounded-md data-active:bg-[oklch(0.22_0.030_158)] data-active:text-[oklch(0.85_0.14_158)]">
              <BookOpen className="h-3.5 w-3.5" />
              Histórias
              {tab === "historias" && historyCards && (
                <span className="ml-1 text-[10px] font-mono text-muted-foreground/55">({visibleHistoryCards.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="sm:w-72">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "personagens" ? "Buscar personagem…" : "Buscar história…"}
              leading={<Search className="h-3.5 w-3.5" />}
              trailing={
                search ? (
                  <button onClick={() => setSearch("")} className="h-6 w-6 rounded-md hover:bg-[oklch(0.255_0.016_170)] flex items-center justify-center">
                    <X className="h-3 w-3 text-muted-foreground/65" />
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        <TabsContent value="personagens">
          <FilterBar
            traits={availableCharTraits}
            selectedTraits={charTraits}
            onToggleTrait={(t) => toggleTrait(setCharTraits, t)}
            onClear={() => {
              setCharTraits(new Set());
              setCharWithGallery(false);
            }}
            sort={charSort}
            onSortChange={setCharSort}
            extra={{
              label: "Com galeria",
              value: charWithGallery,
              onToggle: () => setCharWithGallery((v) => !v),
            }}
            active={charsFilterActive}
            totalAfter={visibleCharacters.length}
            totalBefore={characters?.length ?? 0}
          />
          <CharacterGrid
            list={visibleCharacters}
            loading={characters === null}
            search={debounced}
            filterActive={charsFilterActive}
            canEdit={canEdit}
            onOpen={openCharacter}
            onCreate={openNewCharacter}
          />
        </TabsContent>

        <TabsContent value="historias">
          <FilterBar
            traits={availableCardTraits}
            selectedTraits={cardTraits}
            onToggleTrait={(t) => toggleTrait(setCardTraits, t)}
            onClear={() => {
              setCardTraits(new Set());
              setCardWithAttach(false);
            }}
            sort={cardSort}
            onSortChange={setCardSort}
            extra={{
              label: "Com anexos",
              value: cardWithAttach,
              onToggle: () => setCardWithAttach((v) => !v),
            }}
            active={cardsFilterActive}
            totalAfter={visibleHistoryCards.length}
            totalBefore={historyCards?.length ?? 0}
          />
          <HistoryGrid
            list={visibleHistoryCards}
            loading={historyCards === null}
            search={debounced}
            filterActive={cardsFilterActive}
            canEdit={canEdit}
            onOpen={openHistoryCard}
            onCreate={openNewHistoryCard}
          />
        </TabsContent>
      </Tabs>

      <CharacterSheet
        open={sheetCharOpen}
        onOpenChange={(v) => {
          setSheetCharOpen(v);
          if (!v) setCreatingChar(false);
        }}
        characterId={sheetCharId}
        isCreate={creatingChar}
        canEdit={canEdit}
        onSaved={loadCharacters}
        onDeleted={loadCharacters}
      />

      <HistoryCardSheet
        open={sheetCardOpen}
        onOpenChange={(v) => {
          setSheetCardOpen(v);
          if (!v) setCreatingCard(false);
        }}
        cardId={sheetCardId}
        isCreate={creatingCard}
        canEdit={canEdit}
        onSaved={loadHistoryCards}
        onDeleted={loadHistoryCards}
      />
    </div>
  );
}

function collectTraits(list: { traits: string[] }[]): { trait: string; count: number }[] {
  const map = new Map<string, number>();
  for (const item of list) {
    for (const t of item.traits) {
      map.set(t, (map.get(t) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([trait, count]) => ({ trait, count }))
    .sort((a, b) => b.count - a.count || a.trait.localeCompare(b.trait));
}

function sortBy<T>(list: T[], key: SortKey, getName: (item: T) => string): T[] {
  const arr = [...list];
  if (key === "name-asc") arr.sort((a, b) => getName(a).localeCompare(getName(b), "pt-BR"));
  else if (key === "name-desc") arr.sort((a, b) => getName(b).localeCompare(getName(a), "pt-BR"));
  else if (key === "recent") {
    // recent: API já retorna ordenado por nome; reordeno por _id (proxy de createdAt)
    arr.sort((a: any, b: any) => String(b._id).localeCompare(String(a._id)));
  }
  return arr;
}

function FilterBar({
  traits,
  selectedTraits,
  onToggleTrait,
  onClear,
  sort,
  onSortChange,
  extra,
  active,
  totalAfter,
  totalBefore,
}: {
  traits: { trait: string; count: number }[];
  selectedTraits: Set<string>;
  onToggleTrait: (t: string) => void;
  onClear: () => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  extra?: { label: string; value: boolean; onToggle: () => void };
  active: boolean;
  totalAfter: number;
  totalBefore: number;
}) {
  if (traits.length === 0 && !active) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">
          <Filter className="h-3 w-3" />
          Filtros
        </span>

        {/* trait chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {traits.map(({ trait, count }) => {
            const on = selectedTraits.has(trait);
            return (
              <button
                key={trait}
                type="button"
                onClick={() => onToggleTrait(trait)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
                  on
                    ? "bg-[oklch(0.30_0.08_158)] text-[oklch(0.92_0.10_158)] border-[oklch(0.55_0.18_158)]/50 shadow-[0_0_0_3px_oklch(0.55_0.18_158_/_0.10)]"
                    : "bg-[oklch(0.235_0.016_172)] text-muted-foreground border-border hover:text-foreground hover:border-[oklch(0.34_0.018_170)]"
                )}
              >
                <span>#{trait}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono tabular-nums",
                    on ? "text-[oklch(0.92_0.10_158)]/70" : "text-muted-foreground/50"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        {/* extra toggle (galeria/anexos) */}
        {extra && (
          <button
            type="button"
            onClick={extra.onToggle}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors",
              extra.value
                ? "bg-[oklch(0.30_0.08_158)] text-[oklch(0.92_0.10_158)] border-[oklch(0.55_0.18_158)]/50"
                : "bg-[oklch(0.235_0.016_172)] text-muted-foreground border-border hover:text-foreground hover:border-[oklch(0.34_0.018_170)]"
            )}
          >
            {extra.label}
          </button>
        )}

        {/* spacer */}
        <span className="flex-1" />

        {/* sort */}
        <div className="inline-flex items-center bg-[oklch(0.205_0.016_172)] border border-border rounded-lg p-0.5">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/45 ml-1.5 mr-0.5" />
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onSortChange(k)}
              className={cn(
                "h-6 px-2 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors",
                sort === k
                  ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)]"
                  : "text-muted-foreground/65 hover:text-foreground"
              )}
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>

        {active && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      {active && (
        <p className="text-[11px] font-mono text-muted-foreground/55">
          Mostrando <span className="text-foreground font-semibold tabular-nums">{totalAfter}</span> de{" "}
          <span className="tabular-nums">{totalBefore}</span>
        </p>
      )}
    </div>
  );
}

function CharacterGrid({
  list,
  loading,
  search,
  filterActive,
  canEdit,
  onOpen,
  onCreate,
}: {
  list: CharacterSummary[];
  loading: boolean;
  search: string;
  filterActive: boolean;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="mt-4 text-center py-12 space-y-2 border-2 border-dashed rounded-xl bg-muted/30">
        <Drama className="h-10 w-10 mx-auto text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {search || filterActive
            ? "Nenhum personagem corresponde aos filtros"
            : "Nenhum personagem ainda"}
        </p>
        {!search && !filterActive && canEdit && (
          <Button variant="ghost" size="sm" onClick={onCreate} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeiro personagem
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {list.map((c) => (
        <CharacterCard key={c._id} character={c} onClick={() => onOpen(c._id)} />
      ))}
    </div>
  );
}

function HistoryGrid({
  list,
  loading,
  search,
  filterActive,
  canEdit,
  onOpen,
  onCreate,
}: {
  list: HistoryCardSummary[];
  loading: boolean;
  search: string;
  filterActive: boolean;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="mt-4 text-center py-12 space-y-2 border-2 border-dashed rounded-xl bg-muted/30">
        <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {search || filterActive
            ? "Nenhuma história corresponde aos filtros"
            : "Nenhuma história ainda"}
        </p>
        {!search && !filterActive && canEdit && (
          <Button variant="ghost" size="sm" onClick={onCreate} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeira história
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {list.map((c) => (
        <HistoryCardItem key={c._id} card={c} onClick={() => onOpen(c._id)} />
      ))}
    </div>
  );
}
