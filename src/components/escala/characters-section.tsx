"use client";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Trash2,
  Pencil,
  X,
  User2,
  ImageIcon,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Character {
  _id: string;
  name: string;
  description: string;
  prompt: string;
  imageUrl?: string;
  createdBy: { _id: string; name: string };
  createdAt: string;
}

interface Props {
  scaleId: string;
  weekNumber: number;
  canEdit: boolean;
  currentUserId?: string;
}

export function CharactersSection({
  scaleId,
  weekNumber,
  canEdit,
  currentUserId,
}: Props) {
  const [items, setItems] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/characters?scaleId=${scaleId}&weekNumber=${weekNumber}`
      );
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleId, weekNumber]);

  useEffect(() => {
    if (items.length > 0) setExpanded(true);
  }, [items.length]);

  function resetForm() {
    setName("");
    setDescription("");
    setPrompt("");
    setImageUrl("");
    setCreating(false);
    setEditingId(null);
  }

  function startEdit(c: Character) {
    setEditingId(c._id);
    setCreating(false);
    setName(c.name);
    setDescription(c.description);
    setPrompt(c.prompt);
    setImageUrl(c.imageUrl || "");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB)");
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/characters/upload-image", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no upload");
        return;
      }
      const data = (await res.json()) as { url: string };
      setImageUrl(data.url);
      toast.success("Imagem carregada");
    } catch {
      toast.error("Erro no upload");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome do personagem é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const body = {
        scaleId,
        weekNumber,
        name: name.trim(),
        description: description.trim(),
        prompt: prompt.trim(),
        imageUrl: imageUrl.trim() || null,
      };
      const res = await fetch(
        editingId ? `/api/characters/${editingId}` : "/api/characters",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao salvar");
        return;
      }
      toast.success(editingId ? "Personagem atualizado" : "Personagem criado");
      resetForm();
      await load();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este personagem?")) return;
    try {
      const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro ao remover");
        return;
      }
      toast.success("Personagem removido");
      await load();
    } catch {
      toast.error("Erro ao remover");
    }
  }

  async function copyPrompt(c: Character) {
    try {
      await navigator.clipboard.writeText(c.prompt || c.description || c.name);
      setCopiedId(c._id);
      toast.success("Prompt copiado");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Erro ao copiar");
    }
  }

  return (
    <div className="card-elevated border rounded-xl bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-2.5 border-b bg-gradient-to-r from-violet-50/50 to-transparent flex items-center justify-between gap-2 hover:from-violet-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Personagens & Prompts
          </p>
          {items.length > 0 && (
            <span className="text-[10px] text-violet-700 font-bold bg-violet-100 px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </button>

      {expanded && (
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="h-16 bg-muted/30 animate-pulse rounded-lg" />
          ) : items.length === 0 && !creating ? (
            <div className="text-center py-4">
              <User2 className="h-6 w-6 mx-auto text-muted-foreground/20 mb-1" />
              <p className="text-xs text-muted-foreground/60">
                Nenhum personagem cadastrado
              </p>
              <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                Adicione cards de personagens com prompts para usar no Gemini
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((c) => {
                const isEditing = editingId === c._id;
                const canManage =
                  canEdit || c.createdBy?._id === currentUserId;
                if (isEditing) return null;
                return (
                  <div
                    key={c._id}
                    className="p-3 rounded-lg border bg-violet-50/30 hover:bg-violet-50/50 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-violet-100"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {c.name}
                          </p>
                          {c.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {c.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {c.prompt && (
                          <button
                            onClick={() => copyPrompt(c)}
                            className="h-7 w-7 rounded-md hover:bg-violet-100 flex items-center justify-center text-violet-700"
                            title="Copiar prompt"
                          >
                            {copiedId === c._id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {canManage && (
                          <>
                            <button
                              onClick={() => startEdit(c)}
                              className="h-7 w-7 rounded-md hover:bg-violet-100 flex items-center justify-center text-violet-700"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(c._id)}
                              className="h-7 w-7 rounded-md hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-muted-foreground"
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {c.prompt && (
                      <div className="p-2 rounded-md bg-white border border-violet-100 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {c.prompt}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Form de edição inline — renderizado no lugar do card ao editar */}
          {editingId && (
            <div className="p-3 rounded-lg border border-violet-200 bg-violet-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-violet-700">
                  Editar personagem
                </p>
                <button
                  onClick={resetForm}
                  className="h-6 w-6 rounded-md hover:bg-violet-100 flex items-center justify-center"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <Input
                placeholder="Nome do personagem (ex: Pastor João)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm bg-white"
                maxLength={80}
              />
              <Textarea
                placeholder="Descrição visual curta (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm bg-white min-h-[60px]"
                maxLength={500}
              />
              <Textarea
                placeholder="Prompt completo para o Gemini"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="text-xs font-mono bg-white min-h-[100px]"
                maxLength={4000}
              />
              <div className="flex items-center gap-2">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Pré-visualização"
                    className="h-12 w-12 rounded-md object-cover border border-violet-200 shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md border border-dashed border-violet-200 flex items-center justify-center shrink-0 text-violet-400 bg-white">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Imagem de referência
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage || saving}
                      className="text-[11px] text-violet-700 hover:underline font-medium flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
                    >
                      <Upload className="h-3 w-3" />
                      {uploadingImage
                        ? "Enviando..."
                        : imageUrl
                          ? "Trocar"
                          : "Adicionar imagem"}
                    </button>
                    {imageUrl && !uploadingImage && (
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="text-[11px] text-muted-foreground hover:text-red-600 font-medium"
                      >
                        · Remover
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    JPG, PNG, WEBP ou GIF — máx. 5MB
                  </p>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/50">
                  {prompt.length}/4000
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs rounded-lg"
                    onClick={resetForm}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 h-8 text-xs rounded-lg"
                    disabled={saving || !name.trim()}
                    onClick={handleSave}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Form de criação */}
          {creating && (
            <div className="p-3 rounded-lg border border-violet-200 bg-violet-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-violet-700">
                  Novo personagem
                </p>
                <button
                  onClick={resetForm}
                  className="h-6 w-6 rounded-md hover:bg-violet-100 flex items-center justify-center"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <Input
                placeholder="Nome do personagem (ex: Pastor João)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm bg-white"
                maxLength={80}
              />
              <Textarea
                placeholder="Descrição visual curta (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm bg-white min-h-[60px]"
                maxLength={500}
              />
              <Textarea
                placeholder="Prompt completo para o Gemini (cole aqui o prompt detalhado do personagem)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="text-xs font-mono bg-white min-h-[100px]"
                maxLength={4000}
              />
              <div className="flex items-center gap-2">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Pré-visualização"
                    className="h-12 w-12 rounded-md object-cover border border-violet-200 shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md border border-dashed border-violet-200 flex items-center justify-center shrink-0 text-violet-400 bg-white">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Imagem de referência
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage || saving}
                      className="text-[11px] text-violet-700 hover:underline font-medium flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
                    >
                      <Upload className="h-3 w-3" />
                      {uploadingImage
                        ? "Enviando..."
                        : imageUrl
                          ? "Trocar"
                          : "Adicionar imagem"}
                    </button>
                    {imageUrl && !uploadingImage && (
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="text-[11px] text-muted-foreground hover:text-red-600 font-medium"
                      >
                        · Remover
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    JPG, PNG, WEBP ou GIF — máx. 5MB
                  </p>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/50">
                  {prompt.length}/4000
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs rounded-lg"
                    onClick={resetForm}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 h-8 text-xs rounded-lg"
                    disabled={saving || !name.trim()}
                    onClick={handleSave}
                  >
                    {saving ? "Salvando..." : "Criar"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {canEdit && !creating && !editingId && (
            <button
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
              className="w-full h-9 rounded-lg border-2 border-dashed border-violet-200 hover:border-violet-300 hover:bg-violet-50/30 text-xs text-violet-600 font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar personagem
            </button>
          )}
        </div>
      )}
    </div>
  );
}
