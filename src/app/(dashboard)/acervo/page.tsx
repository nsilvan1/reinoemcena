"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Drama, BookOpen, Plus, Search, Images, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button, Input, PageHeader } from "@/components/v2/primitives";
import { CharacterCard, type CharacterSummary } from "@/components/acervo/character-card";
import { HistoryCardItem, type HistoryCardSummary } from "@/components/acervo/history-card-item";
import { CharacterSheet } from "@/components/acervo/character-sheet";
import { HistoryCardSheet } from "@/components/acervo/history-card-sheet";
import { ROLE_HIERARCHY, type Role } from "@/types";

export default function AcervoPage() {
  const { data: session } = useSession();
  const userRole = ((session?.user as any)?.role || "membro") as Role;
  const canEdit = ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.roteirista;

  const [tab, setTab] = useState<"personagens" | "historias">("personagens");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  const [characters, setCharacters] = useState<CharacterSummary[] | null>(null);
  const [historyCards, setHistoryCards] = useState<HistoryCardSummary[] | null>(null);

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

  const filteredCount = useMemo(() => {
    if (tab === "personagens") return characters?.length ?? 0;
    return historyCards?.length ?? 0;
  }, [tab, characters, historyCards]);

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
          <TabsList className="h-9 bg-[oklch(0.16_0.010_240)] border border-border p-1 rounded-lg">
            <TabsTrigger value="personagens" className="text-xs px-3 rounded-md data-active:bg-[oklch(0.22_0.030_158)] data-active:text-[oklch(0.85_0.14_158)]">
              <Drama className="h-3.5 w-3.5" />
              Personagens
              {tab === "personagens" && characters && (
                <span className="ml-1 text-[10px] font-mono text-muted-foreground/55">({filteredCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="historias" className="text-xs px-3 rounded-md data-active:bg-[oklch(0.22_0.030_158)] data-active:text-[oklch(0.85_0.14_158)]">
              <BookOpen className="h-3.5 w-3.5" />
              Histórias
              {tab === "historias" && historyCards && (
                <span className="ml-1 text-[10px] font-mono text-muted-foreground/55">({filteredCount})</span>
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
                  <button onClick={() => setSearch("")} className="h-6 w-6 rounded-md hover:bg-[oklch(0.20_0.010_240)] flex items-center justify-center">
                    <X className="h-3 w-3 text-muted-foreground/65" />
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        <TabsContent value="personagens">
          <CharacterGrid
            list={characters}
            search={debounced}
            canEdit={canEdit}
            onOpen={openCharacter}
            onCreate={openNewCharacter}
          />
        </TabsContent>

        <TabsContent value="historias">
          <HistoryGrid
            list={historyCards}
            search={debounced}
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

function CharacterGrid({
  list,
  search,
  canEdit,
  onOpen,
  onCreate,
}: {
  list: CharacterSummary[] | null;
  search: string;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  if (list === null) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-12 space-y-2 border-2 border-dashed rounded-xl bg-muted/30">
        <Drama className="h-10 w-10 mx-auto text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {search ? "Nenhum personagem encontrado" : "Nenhum personagem ainda"}
        </p>
        {!search && canEdit && (
          <Button variant="ghost" size="sm" onClick={onCreate} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeiro personagem
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {list.map((c) => (
        <CharacterCard key={c._id} character={c} onClick={() => onOpen(c._id)} />
      ))}
    </div>
  );
}

function HistoryGrid({
  list,
  search,
  canEdit,
  onOpen,
  onCreate,
}: {
  list: HistoryCardSummary[] | null;
  search: string;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  if (list === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-video skeleton rounded-xl" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-12 space-y-2 border-2 border-dashed rounded-xl bg-muted/30">
        <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {search ? "Nenhuma história encontrada" : "Nenhuma história ainda"}
        </p>
        {!search && canEdit && (
          <Button variant="ghost" size="sm" onClick={onCreate} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeira história
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {list.map((c) => (
        <HistoryCardItem key={c._id} card={c} onClick={() => onOpen(c._id)} />
      ))}
    </div>
  );
}
