"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Download, FileText, Film, Mic, Save, Upload, X,
  FileAudio, File, Paperclip, ExternalLink, Maximize2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichTextEditor, RichTextViewer } from "@/components/editor/rich-text-editor";
import Link from "next/link";

function getFileIcon(name: string) {
  const ext = name?.split(".")?.pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return FileText;
  if (["doc", "docx"].includes(ext)) return FileText;
  if (["mp3", "wav", "m4a", "ogg", "webm"].includes(ext)) return FileAudio;
  return File;
}

export default function RoteiroDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [roteiro, setRoteiro] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileExpanded, setFileExpanded] = useState(false);

  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const canEdit = role === "admin" || role === "coordenador" || (role === "roteirista" && roteiro?.createdBy?._id === userId);

  useEffect(() => {
    Promise.all([
      fetch(`/api/roteiros/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/users").then((r) => r.ok ? r.json() : []),
    ]).then(([r, u]) => {
      if (r) { setRoteiro(r); setContent(r.content || ""); }
      setUsers(u);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/roteiros/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) { setRoteiro(await res.json()); toast.success("Salvo!"); }
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/roteiros/${id}/upload`, { method: "POST", body: formData });
      if (res.ok) { const data = await res.json(); setRoteiro({ ...roteiro, fileUrl: data.fileUrl }); toast.success("Arquivo enviado!"); }
      else { const err = await res.json(); toast.error(err.error); }
    } catch { toast.error("Erro no upload"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function toggleAssignment(assignUserId: string, field: "assignedEditors" | "assignedNarrators") {
    const currentList: string[] = (roteiro[field] || []).map((u: any) => u._id || u);
    const isAssigned = currentList.includes(assignUserId);
    const newList = isAssigned ? currentList.filter((uid) => uid !== assignUserId) : [...currentList, assignUserId];
    try {
      const res = await fetch(`/api/roteiros/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newList }),
      });
      if (res.ok) { setRoteiro(await res.json()); toast.success(isAssigned ? "Removido!" : "Atribuido!"); }
    } catch { toast.error("Erro"); }
  }

  if (loading) return <div className="h-64 bg-muted animate-pulse rounded-xl" />;
  if (!roteiro) return <p className="text-muted-foreground">Roteiro não encontrado</p>;

  const editors = users.filter((u: any) => u.skills?.includes("editor"));
  const narrators = users.filter((u: any) => u.skills?.includes("narrador"));
  const assignedEditorIds = (roteiro.assignedEditors || []).map((u: any) => u._id || u);
  const assignedNarratorIds = (roteiro.assignedNarrators || []).map((u: any) => u._id || u);

  const fileUrl = roteiro.fileUrl;
  const fileName = fileUrl?.split("/")?.pop() || "";
  const fileExt = fileName.split(".")?.pop()?.toLowerCase() || "";
  const isPdf = fileExt === "pdf";
  const isAudio = ["mp3", "wav", "m4a", "ogg", "webm"].includes(fileExt);
  const FileIcon = fileUrl ? getFileIcon(fileName) : File;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-heading text-xl truncate">{roteiro.title}</h1>
            <p className="text-[11px] text-muted-foreground">
              Por {roteiro.createdBy?.name} · {format(new Date(roteiro.createdAt), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs shrink-0">
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ═══ Left — Content ═══ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Rich Text Editor */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conteúdo</span>
            </div>
            {canEdit ? (
              <RichTextEditor content={content} onChange={setContent} placeholder="Escreva o roteiro aqui..." />
            ) : content ? (
              <RichTextViewer content={content} />
            ) : (
              <div className="border rounded-lg bg-card p-8 text-center">
                <FileText className="h-6 w-6 mx-auto text-muted-foreground/15 mb-1.5" />
                <p className="text-xs text-muted-foreground/40">Sem conteúdo</p>
              </div>
            )}
          </div>

          {/* File section */}
          <div className="card-elevated border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arquivo</p>
            </div>
            <div className="p-4">
              {fileUrl ? (
                <div className="space-y-3">
                  {/* File info bar */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <FileIcon className="h-4.5 w-4.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileName}</p>
                      <p className="text-[11px] text-blue-600/60 uppercase">{fileExt}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isPdf && (
                        <button onClick={() => setFileExpanded(!fileExpanded)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-blue-100 transition-colors" title="Expandir">
                          <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
                        </button>
                      )}
                      <a href={fileUrl} download className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-blue-100 transition-colors" title="Baixar">
                        <Download className="h-3.5 w-3.5 text-blue-600" />
                      </a>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-blue-100 transition-colors" title="Abrir em nova aba">
                        <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                      </a>
                    </div>
                  </div>

                  {/* PDF inline viewer */}
                  {isPdf && (
                    <div className={cn("rounded-lg overflow-hidden border bg-muted/20 transition-all", fileExpanded ? "h-[600px]" : "h-72")}>
                      <iframe src={fileUrl} className="w-full h-full" title="Visualizar PDF" />
                    </div>
                  )}

                  {/* Audio inline player */}
                  {isAudio && (
                    <div className="p-3 rounded-lg bg-muted/20 border">
                      <audio controls className="w-full h-10" src={fileUrl}>
                        Seu navegador não suporta áudio.
                      </audio>
                    </div>
                  )}

                  {/* Replace file */}
                  {canEdit && (
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline font-medium">
                      Trocar arquivo
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground/40 mb-3">Nenhum arquivo anexado</p>
                  {canEdit && (
                    <label className="cursor-pointer block">
                      <div className="border-2 border-dashed rounded-xl p-5 text-center hover:bg-accent/30 hover:border-primary/30 transition-all group">
                        <Upload className="h-5 w-5 mx-auto text-muted-foreground/25 group-hover:text-primary/40 transition-colors mb-1" />
                        <p className="text-xs text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                          {uploading ? "Enviando..." : "PDF, Word, MP3, WAV (max 10MB)"}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              )}
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.mp3,.wav" onChange={handleUpload} disabled={uploading} />
            </div>
          </div>
        </div>

        {/* ═══ Right — Assignments ═══ */}
        <div>
          <div className="card-elevated border rounded-xl bg-card overflow-hidden sticky top-20">
            {/* Editors */}
            <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-violet-100 flex items-center justify-center">
                <Film className="h-3 w-3 text-violet-600" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Editores</p>
              <span className="text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full h-4 min-w-4 flex items-center justify-center px-1 ml-auto">
                {assignedEditorIds.length}
              </span>
            </div>
            <div className="p-3">
              {editors.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/30 px-1">Nenhum editor cadastrado</p>
              ) : (
                <div className="space-y-0.5">
                  {editors.map((u: any) => {
                    const isAssigned = assignedEditorIds.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => canEdit && toggleAssignment(u._id, "assignedEditors")}
                        disabled={!canEdit}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
                          isAssigned ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "hover:bg-muted/50",
                          !canEdit && "cursor-default"
                        )}
                      >
                        <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold", isAssigned ? "bg-violet-200 text-violet-700" : "bg-muted text-muted-foreground")}>
                          {u.name[0]}
                        </div>
                        <span className="flex-1 text-left text-xs font-medium">{u.name}</span>
                        {isAssigned && <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Narrators */}
            <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-amber-100 flex items-center justify-center">
                <Mic className="h-3 w-3 text-amber-600" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Narradores</p>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full h-4 min-w-4 flex items-center justify-center px-1 ml-auto">
                {assignedNarratorIds.length}
              </span>
            </div>
            <div className="p-3">
              {narrators.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/30 px-1">Nenhum narrador cadastrado</p>
              ) : (
                <div className="space-y-0.5">
                  {narrators.map((u: any) => {
                    const isAssigned = assignedNarratorIds.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => canEdit && toggleAssignment(u._id, "assignedNarrators")}
                        disabled={!canEdit}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
                          isAssigned ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "hover:bg-muted/50",
                          !canEdit && "cursor-default"
                        )}
                      >
                        <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold", isAssigned ? "bg-amber-200 text-amber-700" : "bg-muted text-muted-foreground")}>
                          {u.name[0]}
                        </div>
                        <span className="flex-1 text-left text-xs font-medium">{u.name}</span>
                        {isAssigned && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
