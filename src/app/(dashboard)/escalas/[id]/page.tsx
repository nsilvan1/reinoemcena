"use client";
import { useEffect, useState, useRef, Fragment, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Check, ExternalLink, FileText, Mic, Upload,
  RotateCcw, Send, Play, MessageCircle, Clock, Link2,
  PenLine, Film, Eye, CircleCheck, CalendarDays, History,
  CheckCircle2, Paperclip, MessageSquare, X, AlertTriangle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn, parseLocalDate } from "@/lib/utils";
import { STEPS } from "@/components/pipeline/mini-pipeline";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { StageAttachments } from "@/components/escala/stage-attachments";
import { CharactersSection } from "@/components/escala/characters-section";
import { RecordingsUploader } from "@/components/escala/recordings-uploader";
import { RecordingsOverview } from "@/components/escala/recordings-overview";

const ROLE_TO_STAGE: Record<string, string> = { roteirista: "roteiro", narrador: "gravacao", editor: "edicao" };

export default function ScaleDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [scale, setScale] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [viewingStage, setViewingStage] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Inline roteiro creation
  const [showInlineRoteiro, setShowInlineRoteiro] = useState(false);
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineContent, setInlineContent] = useState("");
  const [inlineFile, setInlineFile] = useState<File | null>(null);
  const [savingRoteiro, setSavingRoteiro] = useState(false);
  const inlineFileRef = useRef<HTMLInputElement>(null);

  // Team section collapse
  const [showTeam, setShowTeam] = useState(false);

  // Admin advance confirmation
  const [confirmAdvance, setConfirmAdvance] = useState<string | null>(null);

  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const canReview = ["admin", "coordenador"].includes(role);
  const canEditCharacters = ["admin", "coordenador", "roteirista"].includes(role);

  useEffect(() => {
    fetch(`/api/scales/${id}`).then((r) => r.ok ? r.json() : null).then((data) => {
      if (data) setScale(data);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!scale) return;
    Promise.all([
      fetch(`/api/task-progress?scaleId=${id}&weekNumber=${selectedWeek}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/comments?scaleId=${id}&weekNumber=${selectedWeek}`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([p, c]) => { setProgress(p); setComments(c); }).catch((err) => console.error("Erro ao carregar dados da semana:", err));
  }, [id, selectedWeek, scale]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    setViewingStage(null);
  }, [selectedWeek]);

  useEffect(() => {
    setConfirmAdvance(null);
    setShowInlineRoteiro(false);
    setInlineTitle("");
    setInlineContent("");
    setInlineFile(null);
  }, [selectedWeek]);

  useEffect(() => {
    if (!scale) return;
    const wk = scale.weeks.find((w: { number: number }) => w.number === selectedWeek);
    const total =
      (wk?.assignments?.roteiristas?.length || 0) +
      (wk?.assignments?.narradores?.length || 0) +
      (wk?.assignments?.editores?.length || 0);
    setShowTeam(total > 0);
  }, [selectedWeek, scale]);

  async function refreshData() {
    const [scaleRes, progRes, commRes] = await Promise.all([
      fetch(`/api/scales/${id}`),
      fetch(`/api/task-progress?scaleId=${id}&weekNumber=${selectedWeek}`),
      fetch(`/api/comments?scaleId=${id}&weekNumber=${selectedWeek}`),
    ]);
    if (scaleRes.ok) setScale(await scaleRes.json());
    if (progRes.ok) setProgress(await progRes.json());
    if (commRes.ok) setComments(await commRes.json());
  }

  async function handleInlineRoteiroSave() {
    if (!inlineTitle.trim()) { toast.error("Informe o título do roteiro"); return; }
    if (!inlineContent.trim() && !inlineFile) { toast.error("Escreva o conteúdo ou anexe um arquivo"); return; }
    setSavingRoteiro(true);
    try {
      const res = await fetch("/api/roteiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: inlineTitle.trim(), content: inlineContent, scaleId: id, weekNumber: selectedWeek }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const roteiro = await res.json();
      if (inlineFile) {
        const formData = new FormData();
        formData.append("file", inlineFile);
        const uploadRes = await fetch(`/api/roteiros/${roteiro._id}/upload`, { method: "POST", body: formData });
        if (!uploadRes.ok) toast.error("Roteiro salvo, mas erro no upload do arquivo");
      }
      toast.success("Roteiro salvo!");
      setShowInlineRoteiro(false);
      setInlineTitle(""); setInlineContent(""); setInlineFile(null);
      refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar roteiro");
    } finally { setSavingRoteiro(false); }
  }

  async function markComplete(taskRole: string, linkUrl?: string) {
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: taskRole, completed: true, linkUrl }),
    });
    if (res.ok) { toast.success("Concluído!"); refreshData(); } else toast.error("Erro");
  }

  async function handleReview(approve: boolean, rejectTo?: string) {
    const status = approve ? "concluido" : (rejectTo || "edicao");
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(approve ? "Aprovado!" : "Reprovado"); refreshData(); }
  }

  async function setWeekStatus(newStatus: string) {
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { toast.success("Etapa atualizada!"); refreshData(); }
    else toast.error("Erro ao atualizar etapa");
  }


  async function sendComment() {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const cw = scale?.weeks?.find((w: any) => w.number === selectedWeek);
      const res = await fetch("/api/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scaleId: id, weekNumber: selectedWeek, message: newComment.trim(), stage: cw?.status || "geral" }),
      });
      if (res.ok) {
        setNewComment("");
        const cr = await fetch(`/api/comments?scaleId=${id}&weekNumber=${selectedWeek}`);
        if (cr.ok) setComments(await cr.json());
      }
    } catch { toast.error("Erro ao enviar"); }
    finally { setSendingComment(false); }
  }

  // Build unified activity feed from progress + comments for a given stage
  const stageActivity = useMemo(() => {
    if (!viewingStage) return [];
    const vs = STEPS.find(s => s.key === viewingStage);
    if (!vs) return [];

    const items: { type: "completion" | "link" | "comment"; time: Date; data: any }[] = [];

    // Completions for this stage
    progress.forEach((p: any) => {
      const pStage = ROLE_TO_STAGE[p.role];
      if (pStage === viewingStage && p.completed && p.completedAt) {
        items.push({ type: "completion", time: new Date(p.completedAt), data: p });
      }
      if (pStage === viewingStage && p.linkUrl) {
        items.push({ type: "link", time: new Date(p.updatedAt || p.completedAt || p.createdAt), data: p });
      }
    });

    // Comments for this stage
    comments.forEach((c: any) => {
      if (c.stage === viewingStage || (viewingStage === "concluido" && c.stage === "geral")) {
        items.push({ type: "comment", time: new Date(c.createdAt), data: c });
      }
    });

    items.sort((a, b) => a.time.getTime() - b.time.getTime());
    return items;
  }, [viewingStage, progress, comments]);

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-52 bg-muted animate-pulse rounded-md" />
      <div className="h-10 bg-muted animate-pulse rounded-lg" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 h-80 bg-muted animate-pulse rounded-xl" />
        <div className="h-80 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>
  );
  if (!scale) return <p className="text-muted-foreground">Escala não encontrada</p>;

  const currentWeek = scale.weeks.find((w: any) => w.number === selectedWeek);
  const weekStatus = currentWeek?.status || "roteiro";
  const stepIdx = STEPS.findIndex((s) => s.key === weekStatus);
  const currentStep = STEPS[stepIdx];
  const nextStep = STEPS[stepIdx + 1];
  const isNarrator = currentWeek?.assignments?.narradores?.some((u: any) => (u._id || u) === userId);
  const isEditor = currentWeek?.assignments?.editores?.some((u: any) => (u._id || u) === userId);
  const isRoteirista = currentWeek?.assignments?.roteiristas?.some((u: any) => (u._id || u) === userId);

  const teamGroups = [
    { key: "roteiristas", label: "Roteirista", icon: PenLine, members: currentWeek?.assignments?.roteiristas || [], tagBg: "bg-blue-100 text-blue-700" },
    { key: "narradores", label: "Narrador", icon: Mic, members: currentWeek?.assignments?.narradores || [], tagBg: "bg-amber-100 text-amber-700" },
    { key: "editores", label: "Editor", icon: Film, members: currentWeek?.assignments?.editores || [], tagBg: "bg-violet-100 text-violet-700" },
  ];

  const viewingStep = viewingStage ? STEPS.find(s => s.key === viewingStage) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-heading text-xl truncate">{scale.title}</h1>
          <p className="text-xs text-muted-foreground">{scale.month} · {scale.weeks.length} semanas</p>
        </div>
      </div>

      {/* Week tabs — rich cards */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {scale.weeks.map((week: any) => {
          const ws = STEPS.find((s) => s.key === week.status) || STEPS[0];
          const sel = selectedWeek === week.number;
          const overdue = week.status !== "concluido" && parseLocalDate(week.deadline) < new Date();
          return (
            <button
              key={week.number}
              onClick={() => setSelectedWeek(week.number)}
              className={cn(
                "flex flex-col items-start px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border min-w-[80px]",
                sel
                  ? `bg-gradient-to-br ${ws.gradient} text-white border-transparent shadow-sm`
                  : "bg-card border-border hover:border-primary/20"
              )}
            >
              <div className="flex items-center gap-1.5 w-full">
                <ws.icon className={cn("h-3 w-3 shrink-0", sel ? "text-white" : ws.color)} />
                <span>S{week.number}</span>
                {!sel && week.status === "concluido" && (
                  <CircleCheck className="h-3 w-3 text-emerald-500 ml-auto" />
                )}
                {!sel && overdue && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 ml-auto" title="Prazo vencido" />
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 truncate w-full font-medium",
                sel ? "text-white/80" : "text-muted-foreground"
              )}>
                {week.theme.length > 18 ? week.theme.slice(0, 18) + "…" : week.theme}
              </span>
            </button>
          );
        })}
      </div>

      {currentWeek && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* ═══ LEFT ═══ */}
          <div className="xl:col-span-2 space-y-4">

            {/* Action — FIRST: user sees their task immediately */}
            <div className="card-elevated border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
                {weekStatus === "concluido" ? (
                  <CircleCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse-ring shrink-0", currentStep.dot)} />
                )}
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Ação · {currentStep.label}
                </p>
              </div>
              <div className="p-4">
                {weekStatus === "roteiro" && canReview && !isRoteirista && (() => {
                  const total = currentWeek?.assignments?.roteiristas?.length || 0;
                  const done = progress.filter((p: any) => p.role === "roteirista" && p.completed).length;
                  const advanceWarning = !currentWeek.roteiro ? "Nenhum roteiro criado" : null;
                  return (
                    <div className={cn("p-3 rounded-lg border space-y-2.5", STEPS[0].lightBg, STEPS[0].lightBorder)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <PenLine className={cn("h-4 w-4 shrink-0", STEPS[0].color)} />
                          <div>
                            <p className={cn("text-sm font-bold", STEPS[0].lightText)}>Fase: Roteiro</p>
                            <p className="text-[11px] text-muted-foreground/70">
                              {total > 0 ? `${done} de ${total} roteirista${total > 1 ? "s" : ""} concluiu` : "Nenhum roteirista atribuído"}
                            </p>
                          </div>
                        </div>
                        {nextStep && (
                          confirmAdvance === nextStep.key ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-amber-600 font-medium">{advanceWarning}</span>
                              <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg"
                                onClick={() => { setConfirmAdvance(null); setWeekStatus(nextStep.key); }}>
                                Avançar mesmo assim
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg"
                                onClick={() => setConfirmAdvance(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline"
                              className={cn("h-8 text-xs rounded-lg shrink-0 border",
                                advanceWarning ? "border-amber-300 text-amber-700 hover:bg-amber-50" : cn(STEPS[0].lightBorder, STEPS[0].lightText)
                              )}
                              onClick={() => {
                                if (advanceWarning) setConfirmAdvance(nextStep.key);
                                else setWeekStatus(nextStep.key);
                              }}>
                              {advanceWarning && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                              <nextStep.icon className="h-3.5 w-3.5 mr-1" /> Avançar
                            </Button>
                          )
                        )}
                      </div>
                      {!currentWeek.roteiro && !showInlineRoteiro && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs rounded-lg w-full"
                          onClick={() => setShowInlineRoteiro(true)}>
                          <PenLine className="h-3.5 w-3.5 mr-1" /> Escrever roteiro agora
                        </Button>
                      )}
                      {showInlineRoteiro && (
                        <div className="space-y-3 pt-1">
                          <Input placeholder="Título do roteiro" value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)} className="h-9 text-sm bg-white" />
                          <RichTextEditor content={inlineContent} onChange={setInlineContent} placeholder="Escreva o roteiro..." />
                          <div className="flex items-center gap-2">
                            <input ref={inlineFileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.mp3,.wav"
                              onChange={(e) => setInlineFile(e.target.files?.[0] || null)} />
                            {inlineFile ? (
                              <div className="flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 flex-1">
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">{inlineFile.name}</span>
                                <button onClick={() => setInlineFile(null)} className="ml-auto"><X className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => inlineFileRef.current?.click()}
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">
                                <Paperclip className="h-3 w-3" /> Anexar arquivo (opcional)
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs rounded-lg flex-1"
                              disabled={savingRoteiro || !inlineTitle.trim() || (!inlineContent.trim() && !inlineFile)}
                              onClick={handleInlineRoteiroSave}>
                              {savingRoteiro ? "Salvando..." : "Salvar Roteiro"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg"
                              onClick={() => { setShowInlineRoteiro(false); setInlineTitle(""); setInlineContent(""); setInlineFile(null); }}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {weekStatus === "roteiro" && isRoteirista && (
                  currentWeek.roteiro ? (
                    <div className={cn("p-3 rounded-lg border space-y-2.5", STEPS[0].lightBg, STEPS[0].lightBorder)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <PenLine className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-bold text-blue-700">Roteiro vinculado</p>
                            <p className="text-[11px] text-muted-foreground/70">{currentWeek.roteiro.title || "Sem título"}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => markComplete("roteirista")}
                          className="bg-blue-600 hover:bg-blue-700 h-8 text-xs rounded-lg shrink-0">
                          <Check className="h-3.5 w-3.5 mr-1" /> Concluir
                        </Button>
                      </div>
                      <Link href={`/roteiros/${currentWeek.roteiro._id || currentWeek.roteiro}`}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Abrir roteiro completo
                      </Link>
                    </div>
                  ) : (
                    <div className={cn("p-3 rounded-lg border space-y-3", STEPS[0].lightBg, STEPS[0].lightBorder)}>
                      {!showInlineRoteiro ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5">
                            <PenLine className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-bold text-blue-700">Criar roteiro</p>
                              <p className="text-[11px] text-muted-foreground/70">Escreva o roteiro ou anexe o arquivo aqui mesmo</p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 text-xs rounded-lg flex-1"
                              onClick={() => setShowInlineRoteiro(true)}>
                              <PenLine className="h-3.5 w-3.5 mr-1" /> Escrever agora
                            </Button>
                            <Link href="/roteiros/novo">
                              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg text-muted-foreground border">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Editor completo
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Input
                            placeholder="Título do roteiro"
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            className="h-9 text-sm bg-white"
                          />
                          <RichTextEditor
                            content={inlineContent}
                            onChange={setInlineContent}
                            placeholder="Escreva o roteiro..."
                          />
                          <div className="flex items-center gap-2">
                            <input
                              ref={inlineFileRef}
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.mp3,.wav"
                              onChange={(e) => setInlineFile(e.target.files?.[0] || null)}
                            />
                            {inlineFile ? (
                              <div className="flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 flex-1">
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">{inlineFile.name}</span>
                                <button onClick={() => setInlineFile(null)} className="ml-auto">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => inlineFileRef.current?.click()}
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Paperclip className="h-3 w-3" /> Anexar arquivo (opcional)
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 h-8 text-xs rounded-lg flex-1"
                              disabled={savingRoteiro || !inlineTitle.trim() || (!inlineContent.trim() && !inlineFile)}
                              onClick={handleInlineRoteiroSave}
                            >
                              {savingRoteiro ? "Salvando..." : "Salvar Roteiro"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs rounded-lg"
                              onClick={() => {
                                setShowInlineRoteiro(false);
                                setInlineTitle("");
                                setInlineContent("");
                                setInlineFile(null);
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}

                {weekStatus === "gravacao" && canReview && !isNarrator && (() => {
                  const total = currentWeek?.assignments?.narradores?.length || 0;
                  const done = progress.filter((p: any) => p.role === "narrador" && p.completed).length;
                  const advanceWarning = done === 0 ? "Nenhuma narração concluída" : (done < total ? `${total - done} narrador(es) pendente(s)` : null);
                  return (
                    <div className={cn("p-3 rounded-lg border space-y-3", STEPS[1].lightBg, STEPS[1].lightBorder)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Mic className={cn("h-4 w-4 shrink-0", STEPS[1].color)} />
                          <div>
                            <p className={cn("text-sm font-bold", STEPS[1].lightText)}>Fase: Gravação</p>
                            <p className="text-[11px] text-muted-foreground/70">
                              {total > 0 ? `${done} de ${total} narrador${total > 1 ? "es" : ""} concluiu` : "Nenhum narrador atribuído"}
                            </p>
                          </div>
                        </div>
                        {nextStep && (
                          confirmAdvance === nextStep.key ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-amber-600 font-medium">{advanceWarning}</span>
                              <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg"
                                onClick={() => { setConfirmAdvance(null); setWeekStatus(nextStep.key); }}>
                                Avançar mesmo assim
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg"
                                onClick={() => setConfirmAdvance(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline"
                              className={cn("h-8 text-xs rounded-lg shrink-0 border",
                                advanceWarning ? "border-amber-300 text-amber-700 hover:bg-amber-50" : cn(STEPS[1].lightBorder, STEPS[1].lightText)
                              )}
                              onClick={() => {
                                if (advanceWarning) setConfirmAdvance(nextStep.key);
                                else setWeekStatus(nextStep.key);
                              }}>
                              {advanceWarning && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                              <nextStep.icon className="h-3.5 w-3.5 mr-1" /> Avançar
                            </Button>
                          )
                        )}
                      </div>
                      <RecordingsOverview
                        scaleId={String(id)}
                        weekNumber={selectedWeek}
                        narradores={(currentWeek?.assignments?.narradores || []).map((u: any) => ({ _id: u._id || u, name: u.name || "?" }))}
                        progress={progress}
                      />
                    </div>
                  );
                })()}

                {weekStatus === "gravacao" && isNarrator && (() => {
                  const myProgress = progress.find((p: any) => p.role === "narrador" && (p.userId?._id || p.userId) === userId);
                  return (
                    <RecordingsUploader
                      scaleId={String(id)}
                      weekNumber={selectedWeek}
                      currentUserId={String(userId)}
                      hasRoteiro={!!currentWeek?.roteiro}
                      notes={myProgress?.notes || ""}
                      completed={!!myProgress?.completed}
                      onChanged={refreshData}
                    />
                  );
                })()}

                {weekStatus === "edicao" && canReview && !isEditor && (() => {
                  const total = currentWeek?.assignments?.editores?.length || 0;
                  const done = progress.filter((p: any) => p.role === "editor" && p.completed).length;
                  const videoLinks = progress.filter((p: any) => p.role === "editor" && p.linkUrl);
                  const advanceWarning = videoLinks.length === 0 ? "Nenhum vídeo enviado" : null;
                  return (
                    <div className={cn("p-3 rounded-lg border space-y-2.5", STEPS[2].lightBg, STEPS[2].lightBorder)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Film className={cn("h-4 w-4 shrink-0", STEPS[2].color)} />
                          <div>
                            <p className={cn("text-sm font-bold", STEPS[2].lightText)}>Fase: Edição</p>
                            <p className="text-[11px] text-muted-foreground/70">
                              {total > 0 ? `${done} de ${total} editor${total > 1 ? "es" : ""} enviou vídeo` : "Nenhum editor atribuído"}
                            </p>
                          </div>
                        </div>
                        {nextStep && (
                          confirmAdvance === nextStep.key ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-amber-600 font-medium">{advanceWarning}</span>
                              <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg"
                                onClick={() => { setConfirmAdvance(null); setWeekStatus(nextStep.key); }}>
                                Avançar mesmo assim
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg"
                                onClick={() => setConfirmAdvance(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline"
                              className={cn("h-8 text-xs rounded-lg shrink-0 border",
                                advanceWarning ? "border-amber-300 text-amber-700 hover:bg-amber-50" : cn(STEPS[2].lightBorder, STEPS[2].lightText)
                              )}
                              onClick={() => {
                                if (advanceWarning) setConfirmAdvance(nextStep.key);
                                else setWeekStatus(nextStep.key);
                              }}>
                              {advanceWarning && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                              <nextStep.icon className="h-3.5 w-3.5 mr-1" /> Avançar
                            </Button>
                          )
                        )}
                      </div>
                      {videoLinks.map((p: any) => (
                        <a key={p._id} href={p.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-white/50 border border-violet-200/40 hover:border-violet-300 transition-colors text-xs font-medium">
                          <Play className="h-3 w-3" /> {p.userId?.name} <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-30" />
                        </a>
                      ))}
                    </div>
                  );
                })()}

                {weekStatus === "edicao" && isEditor && (
                  <div className={cn("p-3 rounded-lg border space-y-3", STEPS[2].lightBg, STEPS[2].lightBorder, STEPS[2].lightText)}>
                    <div className="flex items-center gap-2.5">
                      <Film className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-bold">Finalizar edição</p>
                        <p className="text-[11px] opacity-60">Cole o link do video editado</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-400" />
                        <Input
                          type="url"
                          placeholder="https://drive.google.com/... ou YouTube"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          className="h-8 pl-8 text-xs rounded-lg"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700 h-8 text-xs rounded-lg"
                        disabled={!linkUrl.trim() || !/^https?:\/\//.test(linkUrl.trim())}
                        onClick={() => { markComplete("editor", linkUrl); setLinkUrl(""); }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Enviar
                      </Button>
                    </div>
                  </div>
                )}

                {weekStatus === "revisao" && canReview && (
                  <div className={cn("p-3 rounded-lg border space-y-3", STEPS[3].lightBg, STEPS[3].lightBorder, STEPS[3].lightText)}>
                    <div className="flex items-center gap-2.5">
                      <Eye className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-bold">Revisão</p>
                        <p className="text-[11px] opacity-60">Assista e aprove ou reprove</p>
                      </div>
                    </div>
                    {progress.filter((p: any) => p.role === "editor" && p.linkUrl).map((p: any) => (
                      <a key={p._id} href={p.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-white/50 border border-orange-200/40 hover:border-orange-300 transition-colors text-sm font-medium">
                        <Play className="h-3.5 w-3.5" /> {p.userId?.name} <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-30" />
                      </a>
                    ))}
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs rounded-lg flex-1" onClick={() => handleReview(true)}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 text-xs rounded-lg" onClick={() => handleReview(false, "edicao")}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Edição
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={() => handleReview(false, "gravacao")}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Gravação
                      </Button>
                    </div>
                  </div>
                )}

                {weekStatus === "concluido" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <CircleCheck className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Semana concluída</p>
                      <p className="text-[11px] opacity-60">Todos os passos foram finalizados</p>
                    </div>
                  </div>
                )}

                {weekStatus !== "concluido" && !isRoteirista && !isNarrator && !isEditor && !canReview && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-dashed text-muted-foreground/40">
                    <Clock className="h-4 w-4" />
                    <p className="text-xs">Nenhuma ação disponível para você nesta etapa</p>
                  </div>
                )}

                {weekStatus !== "concluido" && (
                  <div className="mt-4 pt-4 border-t">
                    <StageAttachments
                      scaleId={String(id)}
                      weekNumber={selectedWeek}
                      stage={weekStatus}
                      currentUserId={userId}
                      canDeleteAny={canReview}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Theme + Clickable Pipeline — context header */}
            <div className="card-elevated border rounded-xl bg-card overflow-hidden">
              <div className={cn("h-1 bg-gradient-to-r", currentStep.gradient)} />
              <div className="px-4 py-3 flex items-center justify-between gap-3 border-b">
                <div className="min-w-0">
                  <h2 className="font-heading text-base truncate">{currentWeek.theme}</h2>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <CalendarDays className="h-3 w-3" /> {format(parseLocalDate(currentWeek.deadline), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r text-white shrink-0", currentStep.gradient)}>
                  <currentStep.icon className="h-3.5 w-3.5" />
                  {currentStep.label}
                </div>
              </div>

              {/* Clickable pipeline */}
              <div className="px-4 py-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  {STEPS.map((s, i) => {
                    const done = i < stepIdx;
                    const active = i === stepIdx;
                    const clickable = i <= stepIdx;
                    const viewing = viewingStage === s.key;
                    const Icon = s.icon;
                    return (
                      <Fragment key={s.key}>
                        <button
                          onClick={() => clickable ? setViewingStage(viewing ? null : s.key) : undefined}
                          disabled={!clickable}
                          className={cn("flex flex-col items-center gap-1 group transition-all", clickable ? "cursor-pointer" : "cursor-default")}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center transition-all relative",
                            active ? `bg-gradient-to-br ${s.gradient} text-white shadow-sm` :
                            done ? "bg-emerald-100 text-emerald-600" :
                            "bg-background text-muted-foreground/15 border",
                            clickable && !viewing && "hover:ring-2 hover:ring-primary/20",
                            viewing && "ring-2 ring-primary ring-offset-1"
                          )}>
                            {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                          </div>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider transition-colors",
                            viewing ? "text-primary" :
                            active ? s.color : done ? "text-emerald-600/70" : "text-muted-foreground/15"
                          )}>{s.label}</span>
                          {clickable && (
                            <span className={cn("text-[8px] font-medium transition-opacity", viewing ? "text-primary opacity-100" : "opacity-0 group-hover:opacity-60 text-muted-foreground")}>
                              {viewing ? "Visualizando" : "Clique p/ ver"}
                            </span>
                          )}
                        </button>
                        {i < STEPS.length - 1 && <div className={cn("flex-1 h-px mx-1 -mt-6", i < stepIdx ? "bg-emerald-300" : "bg-border")} />}
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Stage activity panel — slides open when a stage is clicked */}
              {viewingStage && viewingStep && (
                <div className={cn("border-t", viewingStep.lightBg)}>
                  <div className="px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className={cn("h-3.5 w-3.5", viewingStep.color)} />
                      <span className={cn("text-xs font-bold", viewingStep.color)}>Atividade — {viewingStep.label}</span>
                      {stageActivity.length > 0 && <span className="text-[10px] text-muted-foreground">({stageActivity.length})</span>}
                    </div>
                    <button onClick={() => setViewingStage(null)} className="h-5 w-5 rounded flex items-center justify-center hover:bg-black/5 transition-colors">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="px-4 pb-3 max-h-52 overflow-y-auto">
                    {stageActivity.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/50 py-2 text-center">Nenhuma atividade registrada nesta etapa</p>
                    ) : (
                      <div className="space-y-0.5">
                        {stageActivity.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 py-1.5 border-b border-black/[0.03] last:border-0">
                            {/* Icon */}
                            <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0 mt-0.5",
                              item.type === "completion" ? "bg-emerald-100 text-emerald-600" :
                              item.type === "link" ? "bg-blue-100 text-blue-600" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {item.type === "completion" ? <CheckCircle2 className="h-3 w-3" /> :
                               item.type === "link" ? <Paperclip className="h-3 w-3" /> :
                               <MessageSquare className="h-3 w-3" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {item.type === "completion" && (
                                <p className="text-[12px]">
                                  <span className="font-semibold">{item.data.userId?.name}</span>
                                  <span className="text-muted-foreground"> concluiu como </span>
                                  <span className="font-medium">{item.data.role}</span>
                                </p>
                              )}
                              {item.type === "link" && (
                                <div className="text-[12px]">
                                  <span className="font-semibold">{item.data.userId?.name}</span>
                                  <span className="text-muted-foreground"> anexou </span>
                                  <a href={item.data.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                    link <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                </div>
                              )}
                              {item.type === "comment" && (
                                <div className="text-[12px]">
                                  <span className="font-semibold">{item.data.userId?.name}: </span>
                                  <span className="text-muted-foreground">{item.data.message}</span>
                                </div>
                              )}
                              <p className="text-[9px] text-muted-foreground/50 mt-px">
                                {format(item.time, "dd/MM 'as' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <CharactersSection
              scaleId={String(id)}
              weekNumber={selectedWeek}
              canEdit={canEditCharacters}
              currentUserId={userId}
            />

            {/* Team + Progress — collapsible */}
            {(() => {
              const totalMembers = teamGroups.reduce((acc, g) => acc + g.members.length, 0);
              return (
                <div className="card-elevated border rounded-xl bg-card overflow-hidden">
                  <button
                    onClick={() => setShowTeam((v) => !v)}
                    className="w-full px-4 py-2.5 border-b bg-muted/20 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Equipe & Progresso</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/60 font-medium">{totalMembers} membro{totalMembers !== 1 ? "s" : ""}</span>
                      {showTeam
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    </div>
                  </button>
                  {showTeam && (
                    <>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Membro</th>
                            <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Função</th>
                            <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Anexo</th>
                            <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {totalMembers === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center">
                                <p className="text-xs text-muted-foreground/50">Nenhum membro atribuído a esta semana</p>
                                {canReview && (
                                  <p className="text-[11px] text-muted-foreground/30 mt-1">Edite a escala para atribuir roteiristas, narradores e editores</p>
                                )}
                              </td>
                            </tr>
                          )}
                          {teamGroups.map((group) =>
                            group.members.map((u: any) => {
                              const mp = progress.find((p: any) =>
                                (p.userId?._id?.toString() || p.userId?.toString()) === (u._id?.toString() || u?.toString())
                              );
                              return (
                                <tr key={`${group.key}-${u._id || u}`} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold", group.tagBg)}>
                                        {u.name?.[0] || "?"}
                                      </div>
                                      <span className="font-medium text-sm">{u.name || "—"}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded", group.tagBg)}>
                                      <group.icon className="h-2.5 w-2.5" /> {group.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 hidden sm:table-cell">
                                    {mp?.linkUrl ? (
                                      <a href={mp.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5">
                                        <ExternalLink className="h-2.5 w-2.5" /> Abrir
                                      </a>
                                    ) : <span className="text-[11px] text-muted-foreground/25">—</span>}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {mp ? (
                                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                        mp.completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                      )}>{mp.completed ? "Concluído" : "Pendente"}</span>
                                    ) : (() => {
                                      const activeInPhase =
                                        (weekStatus === "roteiro" && group.key === "roteiristas") ||
                                        (weekStatus === "gravacao" && group.key === "narradores") ||
                                        (weekStatus === "edicao" && group.key === "editores") ||
                                        weekStatus === "revisao";
                                      return activeInPhase ? (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
                                          Pendente
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground/25">—</span>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                      {currentWeek.roteiro && (
                        <Link href={`/roteiros/${currentWeek.roteiro._id || currentWeek.roteiro}`} className="flex items-center gap-2 px-4 py-2.5 border-t hover:bg-muted/20 transition-colors text-sm font-medium text-primary">
                          <FileText className="h-3.5 w-3.5" /> Ver Roteiro <ExternalLink className="h-3 w-3 opacity-40" />
                        </Link>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ═══ RIGHT — Comments ═══ */}
          <div>
            <div className="card-elevated border rounded-xl bg-card sticky top-20 overflow-hidden">
              <div className="flex flex-col" style={{ height: "min(calc(100vh - 9rem), 580px)" }}>
                <div className="px-3 py-2.5 border-b bg-muted/20 flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold">Comentários</span>
                  {comments.length > 0 && (
                    <span className="text-[9px] font-bold bg-primary/10 text-primary rounded-full h-4 min-w-4 flex items-center justify-center px-1 ml-auto">{comments.length}</span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <MessageCircle className="h-5 w-5 text-muted-foreground/15 mb-1" />
                      <p className="text-[11px] text-muted-foreground/30">Nenhum comentário</p>
                    </div>
                  ) : (
                    comments.map((c: any) => {
                      const isMe = c.userId?._id === userId;
                      const cStep = STEPS.find(s => s.key === c.stage);
                      return (
                        <div key={c._id} className={cn("flex gap-1.5", isMe && "flex-row-reverse")}>
                          <div className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5",
                            isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {c.userId?.name?.[0] || "?"}
                          </div>
                          <div className={cn("max-w-[82%]", isMe && "text-right")}>
                            <div className={cn("flex items-baseline gap-1 mb-px", isMe && "justify-end")}>
                              <span className="text-[10px] font-bold">{c.userId?.name}</span>
                              {cStep && (
                                <span className={cn("text-[8px] font-bold px-1 py-px rounded", cStep.tagBg)}>{cStep.label}</span>
                              )}
                              <span className="text-[8px] text-muted-foreground/50">
                                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                            <div className={cn(
                              "inline-block px-2.5 py-1.5 rounded-xl text-[13px] leading-snug",
                              isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/40 rounded-tl-sm"
                            )}>{c.message}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={commentsEndRef} />
                </div>

                <div className="p-2 border-t">
                  <div className="flex gap-1.5">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escreva..."
                      className="min-h-8 max-h-20 text-xs resize-none bg-muted/20 rounded-lg py-2"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                    />
                    <Button size="icon" disabled={!newComment.trim() || sendingComment} onClick={sendComment} className="h-8 w-8 shrink-0 rounded-lg">
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
