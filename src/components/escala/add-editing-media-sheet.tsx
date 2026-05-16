"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drama,
  Upload,
  Check,
  Image as ImageIcon,
  Search,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CharacterItem {
  _id: string;
  name: string;
  coverImageUrl?: string;
  gallery: string[];
  traits: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scaleId: string;
  weekNumber: number;
  /** Notifica o pai que algo foi anexado. */
  onChanged: () => void;
}

interface TraitChipsProps {
  value: string[];
  onChange: (v: string[]) => void;
}

function TraitChips({ value, onChange }: TraitChipsProps) {
  const [input, setInput] = useState("");
  function add() {
    const t = input.trim().slice(0, 30);
    if (!t) return;
    if (value.includes(t)) {
      setInput("");
      return;
    }
    if (value.length >= 10) {
      toast.error("Máximo 10 traits");
      return;
    }
    onChange([...value, t]);
    setInput("");
  }
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Adicionar trait e ENTER"
          className="h-8 text-xs"
          maxLength={30}
        />
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={add}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}

/**
 * AddEditingMediaSheet — para a fase de Edição. Mostra um sheet com 2 tabs:
 *  - "Acervo": grid de Characters; multi-select + importa pra Attachment
 *    (stage=edicao) sem duplicar arquivo (só referência ao url do acervo)
 *  - "Upload": escolhe imagem do disco; após upload abre dialog secundário
 *    perguntando se quer salvar a imagem também como Character no acervo
 *    (trait/descrição/nome) antes de anexar à etapa de edição.
 */
export function AddEditingMediaSheet({
  open,
  onOpenChange,
  scaleId,
  weekNumber,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<string>("acervo");

  // ─── Acervo tab ─────────────────────────────────────────────────────────
  const [characters, setCharacters] = useState<CharacterItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(new Set());
    setTab("acervo");
  }, [open]);

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
      .then(setCharacters)
      .catch(() => setCharacters([]));
  }, [open, debounced]);

  function togglePick(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function importFromAcervo() {
    if (picked.size === 0) {
      toast.error("Selecione ao menos um personagem");
      return;
    }
    setImporting(true);
    const list = (characters || []).filter((c) => picked.has(c._id));
    let success = 0;
    let failed = 0;
    for (const c of list) {
      const imageUrl = c.coverImageUrl || c.gallery?.[0];
      if (!imageUrl) {
        failed++;
        continue;
      }
      try {
        const res = await fetch("/api/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: imageUrl,
            name: `${c.name} (acervo)`,
            mimeType: undefined,
            scaleId,
            weekNumber,
            stage: "edicao",
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    if (success > 0) {
      toast.success(`${success} imagem(ns) anexada(s) à edição`);
    }
    if (failed > 0) {
      toast.error(`${failed} falharam (sem imagem no acervo?)`);
    }
    if (success > 0) {
      onChanged();
      onOpenChange(false);
    }
  }

  // ─── Upload tab ─────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pushToAcervo, setPushToAcervo] = useState(false);
  const [charName, setCharName] = useState("");
  const [charDescription, setCharDescription] = useState("");
  const [charTraits, setCharTraits] = useState<string[]>([]);
  const [submittingUpload, setSubmittingUpload] = useState(false);

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB)");
      return;
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
    setCharName(f.name.replace(/\.[^.]+$/, "").slice(0, 80));
    setCharDescription("");
    setCharTraits([]);
    setPushToAcervo(false);
    setUploadOpen(true);
  }

  function cleanupUpload() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setCharName("");
    setCharDescription("");
    setCharTraits([]);
    setPushToAcervo(false);
    setUploadOpen(false);
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setSubmittingUpload(true);
    try {
      // Sempre anexa à etapa de edição (multipart pra criar arquivo novo)
      const fd = new FormData();
      fd.append("file", pendingFile);
      fd.append("scaleId", scaleId);
      fd.append("weekNumber", String(weekNumber));
      fd.append("stage", "edicao");
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no anexo");
        return;
      }
      const attachment = (await res.json()) as { url: string };

      if (pushToAcervo) {
        if (!charName.trim()) {
          toast.error("Informe o nome do personagem");
          return;
        }
        const charRes = await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: charName.trim(),
            description: charDescription.trim(),
            traits: charTraits,
            coverImageUrl: attachment.url,
          }),
        });
        if (!charRes.ok) {
          const err = await charRes.json().catch(() => ({}));
          toast.error(
            (err as { error?: string }).error
              ? `Anexado, mas falhou no acervo: ${(err as { error?: string }).error}`
              : "Anexado, mas falhou ao salvar no acervo"
          );
        } else {
          toast.success("Anexado à edição e salvo no acervo");
        }
      } else {
        toast.success("Imagem anexada à edição");
      }

      cleanupUpload();
      onChanged();
      onOpenChange(false);
    } catch {
      toast.error("Erro no upload");
    } finally {
      setSubmittingUpload(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col">
          <SheetTitle className="sr-only">Adicionar mídia à edição</SheetTitle>

          <div className="px-4 py-3 border-b sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-base">Adicionar mídia à edição</h2>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v)}>
              <TabsList className="w-full">
                <TabsTrigger value="acervo" className="flex-1">
                  <Drama className="h-3.5 w-3.5 mr-1.5" /> Acervo
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 p-3">
            {tab === "acervo" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar personagens…"
                    className="h-9 pl-8 text-xs"
                  />
                </div>

                {characters === null ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-square skeleton rounded-lg" />
                    ))}
                  </div>
                ) : characters.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    <Drama className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {debounced ? "Nenhum personagem encontrado" : "Acervo vazio"}
                  </div>
                ) : (
                  <ul className="grid grid-cols-3 gap-2">
                    {characters.map((c) => {
                      const isPicked = picked.has(c._id);
                      const img = c.coverImageUrl || c.gallery?.[0];
                      const hasImg = !!img;
                      return (
                        <li key={c._id}>
                          <button
                            type="button"
                            onClick={() => hasImg && togglePick(c._id)}
                            disabled={!hasImg}
                            className={cn(
                              "w-full text-left rounded-lg overflow-hidden border bg-card transition-colors relative",
                              hasImg
                                ? "hover:border-primary/40 cursor-pointer"
                                : "opacity-40 cursor-not-allowed",
                              isPicked && "border-primary ring-2 ring-primary/30"
                            )}
                          >
                            <div className="aspect-square w-full bg-muted">
                              {img ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={img} alt={c.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                  <Drama className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div className="p-1.5">
                              <p className="text-[11px] font-semibold truncate">{c.name}</p>
                              {!hasImg && (
                                <p className="text-[9px] text-muted-foreground/50">sem imagem</p>
                              )}
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
            )}

            {tab === "upload" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Envie uma imagem nova para anexar a esta etapa de edição.
                  Opcionalmente, salve a imagem também no acervo de personagens.
                </p>
                <label
                  className={cn(
                    "block cursor-pointer w-full border-2 border-dashed rounded-lg bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-colors flex flex-col items-center justify-center text-muted-foreground aspect-video"
                  )}
                >
                  <Upload className="h-7 w-7 mb-1.5" />
                  <span className="text-xs font-medium">Clique para escolher imagem</span>
                  <span className="text-[10px] text-muted-foreground/60 mt-0.5">JPG · PNG · WEBP · GIF · até 5MB</span>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePickFile}
                  />
                </label>
              </div>
            )}
          </div>

          {tab === "acervo" && (
            <div className="p-3 border-t sticky bottom-0 bg-background flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {picked.size} selecionado{picked.size === 1 ? "" : "s"}
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" className="h-9" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  className="h-9"
                  disabled={picked.size === 0 || importing}
                  onClick={importFromAcervo}
                >
                  {importing ? "Importando…" : `Importar (${picked.size})`}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog secundário: confirmar upload e perguntar se vai pro acervo */}
      <Dialog open={uploadOpen} onOpenChange={(v) => { if (!v) cleanupUpload(); }}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anexar imagem à edição</DialogTitle>
          </DialogHeader>

          {pendingPreview && (
            <div className="rounded-lg overflow-hidden border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingPreview}
                alt="Preview"
                className="w-full max-h-[220px] object-contain bg-black/40"
              />
            </div>
          )}

          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md hover:bg-muted/30">
              <input
                type="checkbox"
                checked={pushToAcervo}
                onChange={(e) => setPushToAcervo(e.target.checked)}
                className="mt-0.5"
              />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold">Salvar também no Acervo</p>
                <p className="text-muted-foreground">
                  Cria um personagem reutilizável no acervo com essa imagem como capa.
                </p>
              </div>
            </label>
          </div>

          {pushToAcervo && (
            <div className="space-y-2.5 pt-1 border-t">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Nome do personagem
                </p>
                <Input
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="Ex.: Daniel"
                  className="h-8 text-sm"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Traits (opcional)
                </p>
                <TraitChips value={charTraits} onChange={setCharTraits} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Descrição (opcional)
                </p>
                <Textarea
                  value={charDescription}
                  onChange={(e) => setCharDescription(e.target.value)}
                  placeholder="Resumo curto…"
                  className="text-xs min-h-[60px]"
                  maxLength={1000}
                />
              </div>
              {!charName.trim() && (
                <div className="text-[11px] text-[oklch(0.82_0.13_60)] bg-[oklch(0.22_0.030_60)] border border-[oklch(0.35_0.06_60)] rounded-md px-2 py-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Informe um nome para salvar no acervo.
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              className="flex-1 h-9"
              disabled={submittingUpload}
              onClick={cleanupUpload}
            >
              Cancelar
            </Button>
            {pushToAcervo ? (
              <Button
                className="flex-1 h-9"
                disabled={submittingUpload || !charName.trim()}
                onClick={confirmUpload}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {submittingUpload ? "Enviando…" : "Anexar + Salvar no Acervo"}
              </Button>
            ) : (
              <Button
                className="flex-1 h-9"
                disabled={submittingUpload}
                onClick={confirmUpload}
              >
                {submittingUpload ? "Enviando…" : "Só anexar à edição"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
