"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, FileText, Upload, X, File, FileAudio,
  CalendarDays, CheckCircle2, PenLine, Paperclip, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn, parseLocalDate } from "@/lib/utils";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return FileText;
  if (["mp3", "wav", "m4a"].includes(ext)) return FileAudio;
  return File;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NovoRoteiroPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scales, setScales] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scaleId, setScaleId] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/scales")
      .then((r) => (r.ok ? r.json() : []))
      .then(setScales)
      .catch(() => toast.error("Erro ao carregar escalas"));
  }, []);
  const selectedScale = scales.find((s) => s._id === scaleId);
  const selectedWeek = selectedScale?.weeks?.find((w: any) => String(w.number) === weekNumber);

  function handleFileClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (max 10MB)"); return; }
    setFile(f);
    if (f.type === "application/pdf") {
      setFilePreviewUrl(URL.createObjectURL(f));
    } else {
      setFilePreviewUrl(null);
    }
  }

  function removeFile() {
    setFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scaleId || !weekNumber) { toast.error("Selecione escala e semana"); return; }
    if (!title.trim()) { toast.error("Preencha o título"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/roteiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, scaleId, weekNumber: parseInt(weekNumber) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const roteiro = await res.json();

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch(`/api/roteiros/${roteiro._id}/upload`, { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          toast.error(`Roteiro criado, mas erro no upload: ${err.error}`);
        }
      }

      toast.success("Roteiro criado!");
      router.push(`/roteiros/${roteiro._id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar");
    } finally {
      setLoading(false);
    }
  }

  const filledSteps = [
    { label: "Título", done: title.trim().length > 0 },
    { label: "Escala", done: !!scaleId && !!weekNumber },
    { label: "Conteúdo", done: content.length > 10 || !!file },
  ];
  const filledCount = filledSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/roteiros">
            <Button variant="ghost" size="icon" className="h-7 w-7"><ArrowLeft className="h-3.5 w-3.5" /></Button>
          </Link>
          <div className="min-w-0">
            <h1 className="font-heading text-xl">Novo Roteiro</h1>
            <p className="text-xs text-muted-foreground">Crie e vincule a uma semana</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {filledSteps.map((s, i) => (
            <div key={i} className={cn("h-1.5 w-6 rounded-full transition-all", s.done ? "bg-primary" : "bg-muted")} title={s.label} />
          ))}
          <span className="text-[10px] font-bold text-muted-foreground ml-1">{filledCount}/3</span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.mp3,.wav"
        onChange={handleFileChange}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ═══ Left — Info + Editor ═══ */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title + Scale selection */}
            <div className="card-elevated border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Informações</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Título do Roteiro</Label>
                  <Input
                    placeholder="Ex: Semana 2 - Joao 21:1-14"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>

                {/* Scale picker — card grid */}
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block">Escala</Label>
                  {scales.length === 0 ? (
                    <p className="text-xs text-muted-foreground/40">Nenhuma escala disponível</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {scales.map((s: any) => (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => { setScaleId(s._id); setWeekNumber(""); }}
                          className={cn(
                            "text-left p-3 rounded-lg border transition-all",
                            scaleId === s._id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "hover:border-primary/20 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className={cn("h-3.5 w-3.5", scaleId === s._id ? "text-primary" : "text-muted-foreground/40")} />
                            <span className={cn("text-xs font-bold", scaleId === s._id ? "text-primary" : "text-foreground")}>{s.title}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{s.month} · {s.weeks.length} sem.</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Week picker — appears after scale selection */}
                {selectedScale && (
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block">Semana</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {selectedScale.weeks.map((w: any) => {
                        const sel = weekNumber === String(w.number);
                        const hasRoteiro = !!w.roteiro;
                        return (
                          <button
                            key={w.number}
                            type="button"
                            onClick={() => setWeekNumber(String(w.number))}
                            disabled={hasRoteiro}
                            className={cn(
                              "text-left p-2.5 rounded-lg border transition-all",
                              hasRoteiro && "opacity-40 cursor-not-allowed",
                              sel
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : !hasRoteiro && "hover:border-primary/20 hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={cn("text-xs font-bold", sel ? "text-primary" : "text-foreground")}>S{w.number}</span>
                              {hasRoteiro && <span className="text-[8px] bg-muted text-muted-foreground rounded px-1 py-px font-semibold">Vinculado</span>}
                              {sel && <CheckCircle2 className="h-3 w-3 text-primary" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{w.theme}</p>
                            <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                              {format(parseLocalDate(w.deadline), "dd MMM", { locale: ptBR })}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected summary */}
                {selectedWeek && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs">
                      <span className="font-semibold text-primary">{selectedScale.title} — Semana {selectedWeek.number}</span>
                      <span className="text-muted-foreground"> · {selectedWeek.theme}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Content — Rich Editor */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-[11px] font-semibold text-muted-foreground">Conteúdo do Roteiro</Label>
              </div>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Comece a escrever o roteiro... Use a barra de ferramentas para formatar."
              />
            </div>
          </div>

          {/* ═══ Right — File + Summary ═══ */}
          <div className="space-y-4">
            {/* File upload */}
            <div className="card-elevated border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arquivo</p>
                <span className="text-[10px] text-muted-foreground/40 ml-auto">Opcional</span>
              </div>
              <div className="p-4">
                {file ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      {(() => { const Icon = getFileIcon(file.name); return <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><Icon className="h-4.5 w-4.5 text-blue-600" /></div>; })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <button type="button" onClick={removeFile} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-blue-100 transition-colors">
                        <X className="h-3.5 w-3.5 text-blue-600" />
                      </button>
                    </div>

                    {/* PDF Preview */}
                    {filePreviewUrl && (
                      <div className="rounded-lg overflow-hidden border bg-muted/30">
                        <iframe src={filePreviewUrl} className="w-full h-48" title="Preview" />
                      </div>
                    )}

                    {/* Audio preview */}
                    {file.type.startsWith("audio/") && (
                      <audio controls className="w-full h-10 rounded-lg" src={URL.createObjectURL(file)}>
                        Audio
                      </audio>
                    )}

                    <button type="button" onClick={handleFileClick} className="text-xs text-primary hover:underline font-medium">
                      Trocar arquivo
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={handleFileClick} className="w-full">
                    <div className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-accent/30 hover:border-primary/30 transition-all group cursor-pointer">
                      <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/10 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                        Clique para enviar
                      </p>
                      <p className="text-[11px] text-muted-foreground/30 mt-1">PDF, Word, MP3, WAV</p>
                      <p className="text-[10px] text-muted-foreground/20 mt-0.5">Max 10MB</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Summary + Actions */}
            <div className="card-elevated border rounded-xl bg-card overflow-hidden sticky top-20">
              <div className="px-4 py-2.5 border-b bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumo</p>
              </div>
              <div className="p-4 space-y-3">
                {filledSteps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={cn("h-4.5 w-4.5 rounded-full flex items-center justify-center transition-colors", s.done ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground/15")}>
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <span className={cn("text-xs", s.done ? "font-semibold" : "text-muted-foreground/30")}>{s.label}</span>
                    {s.done && <span className="text-[9px] text-emerald-600 ml-auto font-medium">OK</span>}
                  </div>
                ))}

                {file && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-4.5 w-4.5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Paperclip className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-semibold">Arquivo anexado</span>
                    <span className="text-[9px] text-blue-600 ml-auto font-medium">{formatFileSize(file.size)}</span>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={loading || !title.trim() || !scaleId || !weekNumber}
                    className="w-full h-9 text-sm"
                  >
                    {loading ? "Criando..." : "Criar Roteiro"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full h-8 text-xs" onClick={() => router.back()}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
