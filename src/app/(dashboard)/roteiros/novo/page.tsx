"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  X,
  File as FileIcon,
  FileAudio,
  CheckCircle2,
  PenLine,
  Paperclip,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn, parseLocalDate } from "@/lib/utils";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button, Card, Input, Field, PageHeader, SectionHeading } from "@/components/v2/primitives";

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return FileText;
  if (["mp3", "wav", "m4a"].includes(ext)) return FileAudio;
  return FileIcon;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NovoRoteiroPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scales, setScales] = useState<Array<{ _id: string; title: string; month: string; weeks: Array<{ number: number; theme: string; deadline: string; roteiro?: unknown }> }>>([]);
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
  const selectedWeek = selectedScale?.weeks?.find((w) => String(w.number) === weekNumber);

  function handleFileClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (max 10MB)");
      return;
    }
    setFile(f);
    if (f.type === "application/pdf") setFilePreviewUrl(URL.createObjectURL(f));
    else setFilePreviewUrl(null);
  }

  function removeFile() {
    setFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scaleId || !weekNumber) {
      toast.error("Selecione escala e semana");
      return;
    }
    if (!title.trim()) {
      toast.error("Preencha o título");
      return;
    }
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar");
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentos"
        title="Novo roteiro"
        description="Escreva o roteiro e vincule a uma semana da escala."
        icon={FileText}
        back={{ href: "/roteiros", label: "Roteiros" }}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/55 tabular-nums">
              {filledCount}/3
            </span>
            <div className="flex gap-1">
              {filledSteps.map((s, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-7 rounded-full transition-all",
                    s.done ? "bg-[oklch(0.74_0.16_158)] shadow-[0_0_6px_oklch(0.74_0.16_158)]" : "bg-[oklch(0.255_0.016_170)]"
                  )}
                  title={s.label}
                />
              ))}
            </div>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.mp3,.wav"
        onChange={handleFileChange}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-[oklch(0.205_0.016_172)]">
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">
                  Informações
                </p>
              </div>
              <div className="p-5 space-y-5">
                <Field label="Título do roteiro">
                  <Input
                    placeholder="Ex: Semana 2 — João 21:1-14"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </Field>

                <div>
                  <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/85 block mb-2">
                    Escala
                  </Label>
                  {scales.length === 0 ? (
                    <p className="text-xs text-muted-foreground/40 italic">Nenhuma escala disponível</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {scales.map((s) => {
                        const sel = scaleId === s._id;
                        return (
                          <button
                            key={s._id}
                            type="button"
                            onClick={() => {
                              setScaleId(s._id);
                              setWeekNumber("");
                            }}
                            className={cn(
                              "text-left p-3 rounded-lg border transition-all",
                              sel
                                ? "border-[oklch(0.50_0.13_158)] bg-[oklch(0.18_0.020_158)] ring-1 ring-[oklch(0.50_0.13_158)]/40"
                                : "border-border bg-[oklch(0.205_0.016_172)] hover:border-[oklch(0.34_0.018_170)]"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className={cn("h-3.5 w-3.5", sel ? "text-[oklch(0.80_0.14_158)]" : "text-muted-foreground/45")} />
                              <span className={cn("text-xs font-semibold truncate", sel && "text-[oklch(0.92_0.05_158)]")}>{s.title}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground/55 uppercase tracking-wider">
                              {s.month} · {s.weeks.length} sem
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedScale && (
                  <div>
                    <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/85 block mb-2">
                      Semana
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {selectedScale.weeks.map((w) => {
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
                              hasRoteiro && "opacity-30 cursor-not-allowed",
                              sel
                                ? "border-[oklch(0.50_0.13_158)] bg-[oklch(0.18_0.020_158)] ring-1 ring-[oklch(0.50_0.13_158)]/40"
                                : !hasRoteiro && "border-border bg-[oklch(0.205_0.016_172)] hover:border-[oklch(0.34_0.018_170)]"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn("text-[11px] font-mono font-bold", sel ? "text-[oklch(0.92_0.05_158)]" : "text-foreground")}>S{w.number}</span>
                              {hasRoteiro && <span className="text-[8px] font-mono uppercase tracking-wider bg-[oklch(0.255_0.016_170)] text-muted-foreground rounded px-1 py-px">Já tem</span>}
                              {sel && <CheckCircle2 className="h-3 w-3 text-[oklch(0.80_0.14_158)]" />}
                            </div>
                            <p className="text-[11px] text-foreground/80 truncate leading-tight">{w.theme}</p>
                            <p className="text-[9px] font-mono text-muted-foreground/55 mt-1 uppercase tracking-wider">
                              {format(parseLocalDate(w.deadline), "dd MMM", { locale: ptBR })}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedWeek && selectedScale && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[oklch(0.18_0.020_158)] border border-[oklch(0.30_0.040_158)]">
                    <CheckCircle2 className="h-4 w-4 text-[oklch(0.80_0.14_158)] shrink-0" />
                    <span className="text-[12px]">
                      <span className="font-semibold text-[oklch(0.92_0.05_158)]">
                        {selectedScale.title} — S{selectedWeek.number}
                      </span>
                      <span className="text-muted-foreground/65"> · {selectedWeek.theme}</span>
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <div>
              <SectionHeading
                eyebrow="Conteúdo"
                title="Roteiro"
                action={
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45 inline-flex items-center gap-1">
                    <PenLine className="h-3 w-3" /> rich text
                  </span>
                }
              />
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Comece a escrever o roteiro… Use a barra para formatar."
              />
            </div>
          </div>

          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-[oklch(0.205_0.016_172)] flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground/65" />
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">
                  Anexo
                </p>
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/35 ml-auto">
                  opcional
                </span>
              </div>
              <div className="p-4">
                {file ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.18_0.020_220)] border border-[oklch(0.30_0.040_220)]">
                      {(() => {
                        const Icon = getFileIcon(file.name);
                        return (
                          <div className="h-9 w-9 rounded-lg bg-[oklch(0.22_0.030_220)] flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-[oklch(0.80_0.14_220)]" />
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium truncate">{file.name}</p>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/55">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-[oklch(0.24_0.040_220)] transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-[oklch(0.80_0.14_220)]" />
                      </button>
                    </div>

                    {filePreviewUrl && (
                      <div className="rounded-lg overflow-hidden border border-border bg-[oklch(0.175_0.014_172)]">
                        <iframe src={filePreviewUrl} className="w-full h-48" title="Preview" />
                      </div>
                    )}

                    {file.type.startsWith("audio/") && (
                      <audio controls className="w-full h-10 rounded-lg" src={URL.createObjectURL(file)}>
                        Audio
                      </audio>
                    )}

                    <button
                      type="button"
                      onClick={handleFileClick}
                      className="text-[11px] font-mono uppercase tracking-[0.18em] text-[oklch(0.78_0.16_158)] hover:text-[oklch(0.85_0.14_158)] transition-colors"
                    >
                      Trocar arquivo →
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={handleFileClick} className="w-full">
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-[oklch(0.225_0.016_172)] hover:border-[oklch(0.30_0.030_158)] transition-all group cursor-pointer">
                      <div className="h-10 w-10 rounded-lg bg-[oklch(0.255_0.016_170)] flex items-center justify-center mx-auto mb-2 group-hover:bg-[oklch(0.22_0.030_158)] transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground/45 group-hover:text-[oklch(0.78_0.16_158)] transition-colors" />
                      </div>
                      <p className="text-[12px] font-medium text-muted-foreground/65 group-hover:text-foreground transition-colors">
                        Clique para enviar
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/35 mt-1">
                        PDF · DOC · MP3 · WAV · 10MB
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden lg:sticky lg:top-6">
              <div className="px-4 py-2.5 border-b border-border bg-[oklch(0.205_0.016_172)]">
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">
                  Resumo
                </p>
              </div>
              <div className="p-4 space-y-3">
                {filledSteps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        s.done
                          ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)]"
                          : "bg-[oklch(0.255_0.016_170)] text-muted-foreground/30"
                      )}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                    <span className={cn("text-[12.5px]", s.done ? "font-semibold" : "text-muted-foreground/45")}>
                      {s.label}
                    </span>
                    {s.done && (
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[oklch(0.80_0.14_158)] ml-auto">
                        OK
                      </span>
                    )}
                  </div>
                ))}

                {file && (
                  <div className="flex items-center gap-2.5 pt-2 border-t border-border">
                    <span className="h-5 w-5 rounded-full bg-[oklch(0.22_0.030_220)] text-[oklch(0.80_0.14_220)] flex items-center justify-center shrink-0">
                      <Paperclip className="h-3 w-3" />
                    </span>
                    <span className="text-[12.5px] font-semibold">Arquivo anexado</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[oklch(0.80_0.14_220)] ml-auto">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    loading={loading}
                    disabled={loading || !title.trim() || !scaleId || !weekNumber}
                  >
                    {loading ? "Criando…" : "Criar roteiro"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => router.back()}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
