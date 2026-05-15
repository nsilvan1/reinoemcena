"use client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Pencil, X, Save, Drama } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TraitInput } from "./trait-input";
import { ImageUpload } from "./image-upload";
import { ImageLightbox } from "./image-lightbox";
import { Maximize2 } from "lucide-react";

interface Character {
  _id: string;
  name: string;
  description: string;
  traits: string[];
  coverImageUrl?: string;
  gallery: string[];
  createdBy?: { _id: string; name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  characterId?: string;
  isCreate?: boolean;
  canEdit: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}

const EMPTY: Character = {
  _id: "",
  name: "",
  description: "",
  traits: [],
  coverImageUrl: undefined,
  gallery: [],
};

export function CharacterSheet({
  open,
  onOpenChange,
  characterId,
  isCreate,
  canEdit,
  onSaved,
  onDeleted,
}: Props) {
  const [data, setData] = useState<Character>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!!isCreate);
  const [saving, setSaving] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const allImages = [
    ...(data.coverImageUrl ? [data.coverImageUrl] : []),
    ...data.gallery,
  ];

  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      setData(EMPTY);
      setEditing(true);
      return;
    }
    if (!characterId) return;
    setLoading(true);
    fetch(`/api/characters/${characterId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
        setEditing(false);
      })
      .finally(() => setLoading(false));
  }, [open, characterId, isCreate]);

  async function handleSave() {
    if (!data.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description,
        traits: data.traits,
        coverImageUrl: data.coverImageUrl || null,
        gallery: data.gallery,
      };
      const res = isCreate
        ? await fetch("/api/characters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/characters/${characterId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao salvar");
        return;
      }
      toast.success(isCreate ? "Personagem criado" : "Salvo");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!characterId) return;
    if (!confirm(`Excluir "${data.name}"?`)) return;
    const res = await fetch(`/api/characters/${characterId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Excluído");
    onDeleted();
    onOpenChange(false);
  }

  async function handleAddToGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx. 5MB)");
    if (data.gallery.length >= 20) return toast.error("Máximo 20 imagens na galeria");
    setGalleryUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/characters/upload-image", { method: "POST", body: fd });
      if (!res.ok) {
        toast.error("Erro no upload");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      setData((d) => ({ ...d, gallery: [...d.gallery, url] }));
    } finally {
      setGalleryUploading(false);
    }
  }

  function removeFromGallery(url: string) {
    setData((d) => ({ ...d, gallery: d.gallery.filter((g) => g !== url) }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetTitle className="sr-only">{isCreate ? "Novo personagem" : data.name}</SheetTitle>

        {loading ? (
          <div className="p-6 space-y-3">
            <div className="aspect-square bg-muted animate-pulse rounded-lg" />
            <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
            <div className="h-3 bg-muted animate-pulse rounded w-full" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between gap-2 sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2 min-w-0">
                <Drama className="h-4 w-4 text-primary shrink-0" />
                <h2 className="font-heading text-base truncate">
                  {isCreate ? "Novo personagem" : data.name || "Personagem"}
                </h2>
              </div>
              {!isCreate && canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  {editing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditing(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditing(true)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 p-4 space-y-4">
              {editing ? (
                <>
                  <ImageUpload
                    label="Foto de capa"
                    value={data.coverImageUrl}
                    onChange={(url) => setData((d) => ({ ...d, coverImageUrl: url }))}
                    endpoint="/api/characters/upload-image"
                    aspect="square"
                  />

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Nome
                    </p>
                    <Input
                      value={data.name}
                      onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Ex: BRU"
                      maxLength={80}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Descrição
                    </p>
                    <Textarea
                      value={data.description}
                      onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
                      placeholder="Personalidade, idade aproximada, traje, contexto…"
                      className="min-h-[80px] text-sm"
                      maxLength={1000}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Características
                    </p>
                    <TraitInput
                      value={data.traits}
                      onChange={(v) => setData((d) => ({ ...d, traits: v }))}
                      placeholder="Ex: vilão, criança…"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Galeria{" "}
                        <span className="text-muted-foreground/50">({data.gallery.length}/20)</span>
                      </p>
                      <label
                        className={cn(
                          "cursor-pointer text-[11px] text-primary hover:underline flex items-center gap-0.5",
                          (galleryUploading || data.gallery.length >= 20) &&
                            "opacity-50 pointer-events-none"
                        )}
                      >
                        <Plus className="h-3 w-3" />
                        {galleryUploading ? "Enviando…" : "Adicionar"}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleAddToGallery}
                          disabled={galleryUploading || data.gallery.length >= 20}
                        />
                      </label>
                    </div>
                    {data.gallery.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {data.gallery.map((url) => (
                          <div key={url} className="relative group aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="w-full h-full object-cover rounded-md border"
                            />
                            <button
                              type="button"
                              onClick={() => removeFromGallery(url)}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 italic">
                        Nenhuma imagem na galeria
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {data.coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(0)}
                      className="group aspect-square w-full overflow-hidden rounded-lg border bg-muted relative cursor-zoom-in"
                      title="Ver em tela cheia"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.coverImageUrl}
                        alt={data.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  )}

                  {data.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {data.traits.map((t) => (
                        <span
                          key={t}
                          className="inline-block px-2 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {data.description && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {data.description}
                    </p>
                  )}

                  {data.gallery.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Galeria
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {data.gallery.map((url, i) => {
                          const lightboxIdx = data.coverImageUrl ? i + 1 : i;
                          return (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setLightboxIndex(lightboxIdx)}
                              className="group aspect-square overflow-hidden rounded-md border hover:border-primary/40 transition-colors relative cursor-zoom-in"
                              title="Ver em tela cheia"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {data.createdBy && (
                    <p className="text-[10px] text-muted-foreground/50">
                      Criado por {data.createdBy.name}
                    </p>
                  )}
                </>
              )}
            </div>

            {editing && (
              <div className="p-4 border-t sticky bottom-0 bg-background flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 h-9"
                  onClick={() => (isCreate ? onOpenChange(false) : setEditing(false))}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-9"
                  onClick={handleSave}
                  disabled={saving || !data.name.trim()}
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? "Salvando…" : isCreate ? "Criar" : "Salvar"}
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>

      <ImageLightbox
        open={lightboxIndex !== null}
        images={allImages}
        startIndex={lightboxIndex ?? 0}
        altPrefix={data.name}
        onClose={() => setLightboxIndex(null)}
      />
    </Sheet>
  );
}
