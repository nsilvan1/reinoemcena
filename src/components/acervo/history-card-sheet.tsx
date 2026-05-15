"use client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  Plus,
  Pencil,
  X,
  Save,
  BookOpen,
  Paperclip,
  Download,
  FileText,
  FileImage,
  FileVideo,
  File as FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TraitInput } from "./trait-input";
import { ImageUpload } from "./image-upload";
import { ImageLightbox } from "./image-lightbox";
import { Maximize2 } from "lucide-react";

interface HCAttachment {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

interface HistoryCard {
  _id: string;
  title: string;
  description: string;
  traits: string[];
  coverImageUrl?: string;
  attachments: HCAttachment[];
  createdBy?: { _id: string; name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cardId?: string;
  isCreate?: boolean;
  canEdit: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}

const EMPTY: HistoryCard = {
  _id: "",
  title: "",
  description: "",
  traits: [],
  coverImageUrl: undefined,
  attachments: [],
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForMime(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime === "application/pdf" || mime.includes("word") || mime === "text/plain")
    return FileText;
  return FileIcon;
}

export function HistoryCardSheet({
  open,
  onOpenChange,
  cardId,
  isCreate,
  canEdit,
  onSaved,
  onDeleted,
}: Props) {
  const [data, setData] = useState<HistoryCard>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!!isCreate);
  const [saving, setSaving] = useState(false);
  const [attUploading, setAttUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      setData(EMPTY);
      setEditing(true);
      return;
    }
    if (!cardId) return;
    setLoading(true);
    fetch(`/api/history-cards/${cardId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
        setEditing(false);
      })
      .finally(() => setLoading(false));
  }, [open, cardId, isCreate]);

  async function handleSave() {
    if (!data.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: data.title.trim(),
        description: data.description,
        traits: data.traits,
        coverImageUrl: data.coverImageUrl || null,
        attachments: data.attachments,
      };
      const res = isCreate
        ? await fetch("/api/history-cards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/history-cards/${cardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao salvar");
        return;
      }
      toast.success(isCreate ? "Card criado" : "Salvo");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!cardId) return;
    if (!confirm(`Excluir "${data.title}"?`)) return;
    const res = await fetch(`/api/history-cards/${cardId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Excluído");
    onDeleted();
    onOpenChange(false);
  }

  async function handleAddAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return toast.error("Arquivo muito grande (máx. 25MB)");
    if (data.attachments.length >= 20) return toast.error("Máximo 20 anexos");
    setAttUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/history-cards/upload-attachment", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no upload");
        return;
      }
      const att = (await res.json()) as HCAttachment;
      setData((d) => ({ ...d, attachments: [...d.attachments, att] }));
    } finally {
      setAttUploading(false);
    }
  }

  function removeAttachment(url: string) {
    setData((d) => ({ ...d, attachments: d.attachments.filter((a) => a.url !== url) }));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetTitle className="sr-only">{isCreate ? "Nova história" : data.title}</SheetTitle>

        {loading ? (
          <div className="p-6 space-y-3">
            <div className="aspect-video bg-muted animate-pulse rounded-lg" />
            <div className="h-6 bg-muted animate-pulse rounded w-2/3" />
            <div className="h-3 bg-muted animate-pulse rounded w-full" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b flex items-center justify-between gap-2 sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <h2 className="font-heading text-base truncate">
                  {isCreate ? "Nova história" : data.title || "História"}
                </h2>
              </div>
              {!isCreate && canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  {editing ? (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(true)}>
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
                    label="Imagem de capa"
                    value={data.coverImageUrl}
                    onChange={(url) => setData((d) => ({ ...d, coverImageUrl: url }))}
                    endpoint="/api/history-cards/upload-image"
                    aspect="video"
                  />

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Título
                    </p>
                    <Input
                      value={data.title}
                      onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
                      placeholder="Ex: Davi e Golias"
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Descrição
                    </p>
                    <Textarea
                      value={data.description}
                      onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
                      placeholder="Sinopse, tema, versículo base, observações…"
                      className="min-h-[100px] text-sm"
                      maxLength={2000}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Tags
                    </p>
                    <TraitInput
                      value={data.traits}
                      onChange={(v) => setData((d) => ({ ...d, traits: v }))}
                      placeholder="Ex: AT, milagre, páscoa…"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Anexos{" "}
                        <span className="text-muted-foreground/50">
                          ({data.attachments.length}/20)
                        </span>
                      </p>
                      <label
                        className={cn(
                          "cursor-pointer text-[11px] text-primary hover:underline flex items-center gap-0.5",
                          (attUploading || data.attachments.length >= 20) &&
                            "opacity-50 pointer-events-none"
                        )}
                      >
                        <Plus className="h-3 w-3" />
                        {attUploading ? "Enviando…" : "Adicionar"}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/jpeg,image/png,image/webp"
                          onChange={handleAddAttachment}
                          disabled={attUploading || data.attachments.length >= 20}
                        />
                      </label>
                    </div>
                    {data.attachments.length > 0 ? (
                      <ul className="space-y-1">
                        {data.attachments.map((a) => {
                          const Icon = iconForMime(a.mimeType);
                          return (
                            <li
                              key={a.url}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="font-medium truncate flex-1">{a.name}</span>
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                {formatSize(a.size)}
                              </span>
                              <button
                                onClick={() => removeAttachment(a.url)}
                                className="h-5 w-5 rounded-md hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-muted-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 italic">
                        Nenhum anexo
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {data.coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="group aspect-video w-full overflow-hidden rounded-lg border bg-muted relative cursor-zoom-in"
                      title="Ver em tela cheia"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.coverImageUrl}
                        alt={data.title}
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

                  {data.attachments.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> Anexos
                      </p>
                      <ul className="space-y-1">
                        {data.attachments.map((a) => {
                          const Icon = iconForMime(a.mimeType);
                          return (
                            <li
                              key={a.url}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="font-medium truncate flex-1">{a.name}</span>
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={a.name}
                                className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center"
                                title="Baixar"
                              >
                                <Download className="h-3 w-3 text-muted-foreground" />
                              </a>
                            </li>
                          );
                        })}
                      </ul>
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
                <Button className="flex-1 h-9" onClick={handleSave} disabled={saving || !data.title.trim()}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? "Salvando…" : isCreate ? "Criar" : "Salvar"}
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>

      {data.coverImageUrl && (
        <ImageLightbox
          open={lightboxOpen}
          images={[data.coverImageUrl]}
          altPrefix={data.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </Sheet>
  );
}
