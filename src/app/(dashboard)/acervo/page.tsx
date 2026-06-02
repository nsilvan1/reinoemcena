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
  LayoutGrid,
  List,
} from "lucide-react";
import { Button, Input, KpiDivider } from "@/components/v2/primitives";
import { CharacterCard, type CharacterSummary } from "@/components/acervo/character-card";
import { HistoryCardItem, type HistoryCardSummary } from "@/components/acervo/history-card-item";
import { CharacterSheet } from "@/components/acervo/character-sheet";
import { HistoryCardSheet } from "@/components/acervo/history-card-sheet";
import { DriveSyncPanel } from "@/components/acervo/drive-sync-panel";
import { ROLE_HIERARCHY, type Role } from "@/types";
import { cn } from "@/lib/utils";

type SortKey = "name-asc" | "name-desc" | "recent";
type ViewMode = "grid" | "list";

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
  const [view, setView] = useState<ViewMode>("grid");
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
    const url = debounced
      ? `/api/characters?search=${encodeURIComponent(debounced)}`
      : "/api/characters";
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

  const availableCharTraits = useMemo(() => collectTraits(characters ?? []), [characters]);
  const availableCardTraits = useMemo(() => collectTraits(historyCards ?? []), [historyCards]);

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

  // KPI counts
  const totalCharacters = characters?.length ?? 0;
  const totalHistories = historyCards?.length ?? 0;
  const charWithGalleryCount = useMemo(
    () => (characters ?? []).filter((c) => (c.gallery?.length ?? 0) > 0).length,
    [characters]
  );

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
    <div className="space-y-5">
      {/* ── Header v3 ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-muted-foreground/50 mb-1">
            Banco visual
          </p>
          <h1 className="font-heading text-[28px] sm:text-[30px] font-semibold tracking-[-0.03em] leading-tight">
            Acervo
          </h1>
          {/* KPI inline strip */}
          <div className="flex items-center gap-4 mt-2.5 flex-wrap">
            <KpiItem
              value={totalCharacters}
              label={totalCharacters === 1 ? "personagem" : "personagens"}
            />
            <KpiDivider />
            <KpiItem
              value={totalHistories}
              label={totalHistories === 1 ? "historia" : "historias"}
            />
            {tab === "personagens" && charWithGalleryCount > 0 && (
              <>
                <KpiDivider />
                <KpiItem value={charWithGalleryCount} label="com galeria" tone="primary" />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {tab === "personagens" && <DriveSyncPanel onSynced={loadCharacters} />}
          {canEdit && (
            <Button onClick={tab === "personagens" ? openNewCharacter : openNewHistoryCard}>
              <Plus className="h-3.5 w-3.5" />
              Novo
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs as pills + search ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Pills */}
        <div className="flex items-center gap-1 bg-[oklch(0.205_0.016_172)] border border-border rounded-lg p-1 self-start">
          <TabPill
            active={tab === "personagens"}
            icon={Drama}
            label="Personagens"
            count={tab === "personagens" ? visibleCharacters.length : undefined}
            loading={characters === null}
            onClick={() => setTab("personagens")}
          />
          <TabPill
            active={tab === "historias"}
            icon={BookOpen}
            label="Historias"
            count={tab === "historias" ? visibleHistoryCards.length : undefined}
            loading={historyCards === null}
            onClick={() => setTab("historias")}
          />
        </div>

        <span className="flex-1" />

        {/* Search */}
        <div className="w-full sm:w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "personagens" ? "Buscar personagem…" : "Buscar historia…"}
            leading={<Search className="h-3.5 w-3.5" />}
            trailing={
              search ? (
                <button
                  onClick={() => setSearch("")}
                  className="h-6 w-6 rounded-md hover:bg-[oklch(0.255_0.016_170)] flex items-center justify-center"
                >
                  <X className="h-3 w-3 text-muted-foreground/65" />
                </button>
              ) : null
            }
          />
        </div>
      </div>

      {/* ── Filter bar ── */}
      {tab === "personagens" ? (
        <FilterBar
          traits={availableCharTraits}
          selectedTraits={charTraits}
          onToggleTrait={(t) => toggleTrait(setCharTraits, t)}
          onClear={() => { setCharTraits(new Set()); setCharWithGallery(false); }}
          sort={charSort}
          onSortChange={setCharSort}
          view={view}
          onViewChange={setView}
          extra={{ label: "Com galeria", value: charWithGallery, onToggle: () => setCharWithGallery((v) => !v) }}
          active={charsFilterActive}
          totalAfter={visibleCharacters.length}
          totalBefore={characters?.length ?? 0}
        />
      ) : (
        <FilterBar
          traits={availableCardTraits}
          selectedTraits={cardTraits}
          onToggleTrait={(t) => toggleTrait(setCardTraits, t)}
          onClear={() => { setCardTraits(new Set()); setCardWithAttach(false); }}
          sort={cardSort}
          onSortChange={setCardSort}
          view={view}
          onViewChange={setView}
          extra={{ label: "Com anexos", value: cardWithAttach, onToggle: () => setCardWithAttach((v) => !v) }}
          active={cardsFilterActive}
          totalAfter={visibleHistoryCards.length}
          totalBefore={historyCards?.length ?? 0}
        />
      )}

      {/* ── Content ── */}
      {tab === "personagens" ? (
        <CharacterGrid
          list={visibleCharacters}
          loading={characters === null}
          search={debounced}
          filterActive={charsFilterActive}
          canEdit={canEdit}
          view={view}
          onOpen={openCharacter}
          onCreate={openNewCharacter}
        />
      ) : (
        <HistoryGrid
          list={visibleHistoryCards}
          loading={historyCards === null}
          search={debounced}
          filterActive={cardsFilterActive}
          canEdit={canEdit}
          view={view}
          onOpen={openHistoryCard}
          onCreate={openNewHistoryCard}
        />
      )}

      <CharacterSheet
        open={sheetCharOpen}
        onOpenChange={(v) => { setSheetCharOpen(v); if (!v) setCreatingChar(false); }}
        characterId={sheetCharId}
        isCreate={creatingChar}
        canEdit={canEdit}
        onSaved={loadCharacters}
        onDeleted={loadCharacters}
      />

      <HistoryCardSheet
        open={sheetCardOpen}
        onOpenChange={(v) => { setSheetCardOpen(v); if (!v) setCreatingCard(false); }}
        cardId={sheetCardId}
        isCreate={creatingCard}
        canEdit={canEdit}
        onSaved={loadHistoryCards}
        onDeleted={loadHistoryCards}
      />
    </div>
  );
}

// ── KpiItem ────────────────────────────────────────────────────────

function KpiItem({
  value,
  label,
  tone = "muted",
}: {
  value: number;
  label: string;
  tone?: "muted" | "primary";
}) {
  return (
    <span className="flex items-baseline gap-1.5 leading-none">
      <span
        className={cn(
          "text-[22px] font-semibold tabular-nums tracking-tight",
          tone === "primary"
            ? "text-[oklch(0.82_0.14_158)]"
            : "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground/55">
        {label}
      </span>
    </span>
  );
}

// ── TabPill ────────────────────────────────────────────────────────

function TabPill({
  active,
  icon: Icon,
  label,
  count,
  loading,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium transition-colors",
        active
          ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)]"
          : "text-muted-foreground/70 hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {!loading && count !== undefined && (
        <span
          className={cn(
            "text-[10px] font-mono tabular-nums",
            active ? "text-[oklch(0.85_0.14_158)]/70" : "text-muted-foreground/40"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── FilterBar ──────────────────────────────────────────────────────

function FilterBar({
  traits,
  selectedTraits,
  onToggleTrait,
  onClear,
  sort,
  onSortChange,
  view,
  onViewChange,
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
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  extra?: { label: string; value: boolean; onToggle: () => void };
  active: boolean;
  totalAfter: number;
  totalBefore: number;
}) {
  if (traits.length === 0 && !active) {
    // Still show sort + view toggle even without traits
    return (
      <div className="flex items-center justify-end gap-2">
        <SortControl sort={sort} onSortChange={onSortChange} />
        <ViewToggle view={view} onViewChange={onViewChange} />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/50">
          <Filter className="h-3 w-3" />
          Filtros
        </span>

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

        {(traits.length > 0 || extra) && <div className="h-5 w-px bg-border mx-0.5" />}

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

        <span className="flex-1" />

        <SortControl sort={sort} onSortChange={onSortChange} />
        <ViewToggle view={view} onViewChange={onViewChange} />

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
        <p className="text-[11px] font-mono text-muted-foreground/50">
          Mostrando{" "}
          <span className="text-foreground font-semibold tabular-nums">{totalAfter}</span> de{" "}
          <span className="tabular-nums">{totalBefore}</span>
        </p>
      )}
    </div>
  );
}

function SortControl({
  sort,
  onSortChange,
}: {
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
}) {
  return (
    <div className="inline-flex items-center bg-[oklch(0.205_0.016_172)] border border-border rounded-lg p-0.5">
      <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 ml-1.5 mr-0.5" />
      {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onSortChange(k)}
          className={cn(
            "h-6 px-2 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors",
            sort === k
              ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)]"
              : "text-muted-foreground/60 hover:text-foreground"
          )}
        >
          {SORT_LABELS[k]}
        </button>
      ))}
    </div>
  );
}

function ViewToggle({
  view,
  onViewChange,
}: {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center bg-[oklch(0.205_0.016_172)] border border-border rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => onViewChange("grid")}
        className={cn(
          "h-6 w-7 rounded-md flex items-center justify-center transition-colors",
          view === "grid"
            ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)]"
            : "text-muted-foreground/60 hover:text-foreground"
        )}
        title="Grade"
      >
        <LayoutGrid className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onViewChange("list")}
        className={cn(
          "h-6 w-7 rounded-md flex items-center justify-center transition-colors",
          view === "list"
            ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)]"
            : "text-muted-foreground/60 hover:text-foreground"
        )}
        title="Lista"
      >
        <List className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── CharacterGrid ──────────────────────────────────────────────────

function CharacterGrid({
  list,
  loading,
  search,
  filterActive,
  canEdit,
  view,
  onOpen,
  onCreate,
}: {
  list: CharacterSummary[];
  loading: boolean;
  search: string;
  filterActive: boolean;
  canEdit: boolean;
  view: ViewMode;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return view === "grid" ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton rounded-xl" style={{ aspectRatio: "4/5" }} />
        ))}
      </div>
    ) : (
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-14 space-y-2 border border-dashed border-border/50 rounded-xl bg-[oklch(0.205_0.016_172)]/30">
        <Drama className="h-10 w-10 mx-auto text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">
          {search || filterActive
            ? "Nenhum personagem corresponde aos filtros"
            : "Nenhum personagem ainda"}
        </p>
        {!search && !filterActive && canEdit && (
          <Button variant="ghost" size="sm" onClick={onCreate} className="text-xs mt-1">
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeiro personagem
          </Button>
        )}
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="rounded-xl bg-card border border-border overflow-hidden divide-y divide-border/50">
        {/* List header */}
        <div className="grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_200px_60px] gap-3 px-3 py-2 items-center">
          <span />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Nome
          </span>
          <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Traits
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50 text-right">
            Galeria
          </span>
        </div>
        {list.map((c) => (
          <CharacterCard key={c._id} character={c} onClick={() => onOpen(c._id)} dense />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {list.map((c, i) => (
        <CharacterCard
          key={c._id}
          character={c}
          onClick={() => onOpen(c._id)}
          className={cn("animate-in-view", `stagger-${Math.min(i + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6}`)}
        />
      ))}
    </div>
  );
}

// ── HistoryGrid ────────────────────────────────────────────────────

function HistoryGrid({
  list,
  loading,
  search,
  filterActive,
  canEdit,
  view,
  onOpen,
  onCreate,
}: {
  list: HistoryCardSummary[];
  loading: boolean;
  search: string;
  filterActive: boolean;
  canEdit: boolean;
  view: ViewMode;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return view === "grid" ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video skeleton rounded-xl" />
        ))}
      </div>
    ) : (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-14 space-y-2 border border-dashed border-border/50 rounded-xl bg-[oklch(0.205_0.016_172)]/30">
        <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">
          {search || filterActive
            ? "Nenhuma historia corresponde aos filtros"
            : "Nenhuma historia ainda"}
        </p>
        {!search && !filterActive && canEdit && (
          <Button variant="ghost" size="sm" onClick={onCreate} className="text-xs mt-1">
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeira historia
          </Button>
        )}
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="rounded-xl bg-card border border-border overflow-hidden divide-y divide-border/50">
        <div className="grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_200px_60px] gap-3 px-3 py-2 items-center">
          <span />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Titulo
          </span>
          <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Traits
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50 text-right">
            Anexos
          </span>
        </div>
        {list.map((c) => (
          <HistoryCardItem key={c._id} card={c} onClick={() => onOpen(c._id)} dense />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {list.map((c, i) => (
        <HistoryCardItem
          key={c._id}
          card={c}
          onClick={() => onOpen(c._id)}
          className={cn("animate-in-view", `stagger-${Math.min(i + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6}`)}
        />
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

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
    arr.sort((a: any, b: any) => String(b._id).localeCompare(String(a._id)));
  }
  return arr;
}
