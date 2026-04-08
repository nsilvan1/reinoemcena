"use client";
import { useEffect, useState, useRef, Fragment, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Check, ExternalLink, FileText, Mic, Upload,
  RotateCcw, Send, Play, MessageCircle, Clock, Link2,
  PenLine, Film, Eye, CircleCheck, CalendarDays, History,
  CheckCircle2, Paperclip, MessageSquare, X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "roteiro", label: "Roteiro", icon: PenLine, color: "text-blue-600", bg: "bg-blue-600", lightBg: "bg-blue-50", lightText: "text-blue-700", lightBorder: "border-blue-200", gradient: "from-blue-500 to-blue-600", dotBg: "bg-blue-500", tagBg: "bg-blue-100 text-blue-700" },
  { key: "gravacao", label: "Gravacao", icon: Mic, color: "text-amber-600", bg: "bg-amber-600", lightBg: "bg-amber-50", lightText: "text-amber-700", lightBorder: "border-amber-200", gradient: "from-amber-500 to-amber-600", dotBg: "bg-amber-500", tagBg: "bg-amber-100 text-amber-700" },
  { key: "edicao", label: "Edicao", icon: Film, color: "text-violet-600", bg: "bg-violet-600", lightBg: "bg-violet-50", lightText: "text-violet-700", lightBorder: "border-violet-200", gradient: "from-violet-500 to-violet-600", dotBg: "bg-violet-500", tagBg: "bg-violet-100 text-violet-700" },
  { key: "revisao", label: "Revisao", icon: Eye, color: "text-orange-600", bg: "bg-orange-600", lightBg: "bg-orange-50", lightText: "text-orange-700", lightBorder: "border-orange-200", gradient: "from-orange-500 to-orange-600", dotBg: "bg-orange-500", tagBg: "bg-orange-100 text-orange-700" },
  { key: "concluido", label: "Concluido", icon: CircleCheck, color: "text-emerald-600", bg: "bg-emerald-600", lightBg: "bg-emerald-50", lightText: "text-emerald-700", lightBorder: "border-emerald-200", gradient: "from-emerald-500 to-emerald-600", dotBg: "bg-emerald-500", tagBg: "bg-emerald-100 text-emerald-700" },
];

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
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [viewingStage, setViewingStage] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const canReview = ["admin", "coordenador"].includes(role);

  useEffect(() => {
    fetch(`/api/scales/${id}`).then((r) => r.ok ? r.json() : null).then((data) => {
      if (data) setScale(data);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!scale) return;
    Promise.all([
      fetch(`/api/task-progress?scaleId=${id}&weekNumber=${selectedWeek}`).then((r) => r.json()),
      fetch(`/api/comments?scaleId=${id}&weekNumber=${selectedWeek}`).then((r) => r.json()),
    ]).then(([p, c]) => { setProgress(p); setComments(c); }).catch(() => {});
  }, [id, selectedWeek, scale]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    setViewingStage(null);
  }, [selectedWeek]);

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

  async function markComplete(taskRole: string, linkUrl?: string) {
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: taskRole, completed: true, linkUrl }),
    });
    if (res.ok) { toast.success("Concluido!"); refreshData(); } else toast.error("Erro");
  }

  async function handleReview(approve: boolean, rejectTo?: string) {
    const status = approve ? "concluido" : (rejectTo || "edicao");
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(approve ? "Aprovado!" : "Reprovado"); refreshData(); }
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { toast.error("Max 30MB"); return; }
    setUploadingAudio(true);
    try { await markComplete("narrador", file.name); } catch { toast.error("Erro no upload"); }
    finally { setUploadingAudio(false); }
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
  if (!scale) return <p className="text-muted-foreground">Escala nao encontrada</p>;

  const currentWeek = scale.weeks.find((w: any) => w.number === selectedWeek);
  const weekStatus = currentWeek?.status || "roteiro";
  const stepIdx = STEPS.findIndex((s) => s.key === weekStatus);
  const currentStep = STEPS[stepIdx];
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

      {/* Week pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {scale.weeks.map((week: any) => {
          const ws = STEPS.find((s) => s.key === week.status) || STEPS[0];
          const sel = selectedWeek === week.number;
          return (
            <button key={week.number} onClick={() => setSelectedWeek(week.number)} className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border",
              sel ? `bg-gradient-to-r ${ws.gradient} text-white border-transparent shadow-sm` : "bg-card border-border hover:border-primary/20"
            )}>
              <ws.icon className="h-3 w-3" /> S{week.number}
              {!sel && week.status === "concluido" && <CircleCheck className="h-3 w-3 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {currentWeek && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* ═══ LEFT ═══ */}
          <div className="xl:col-span-2 space-y-4">

            {/* Theme + Clickable Pipeline */}
            <div className="card-elevated border rounded-xl bg-card overflow-hidden">
              <div className={cn("h-0.5 bg-gradient-to-r", currentStep.gradient)} />
              <div className="px-4 py-3 flex items-center justify-between gap-3 border-b">
                <div className="min-w-0">
                  <h2 className="font-heading text-base truncate">{currentWeek.theme}</h2>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <CalendarDays className="h-3 w-3" /> {format(new Date(currentWeek.deadline), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
                <Badge className={cn("bg-gradient-to-r text-white border-0 text-[10px] px-2 py-0.5 shrink-0", currentStep.gradient)}>{currentStep.label}</Badge>
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

            {/* Team + Progress */}
            <div className="card-elevated border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Equipe & Progresso</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Membro</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Funcao</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Anexo</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamGroups.map((group) =>
                    group.members.map((u: any) => {
                      const mp = progress.find((p: any) => (p.userId?._id || p.userId) === (u._id || u));
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
                              )}>{mp.completed ? "Concluido" : "Pendente"}</span>
                            ) : <span className="text-[10px] text-muted-foreground/25">—</span>}
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
            </div>

            {/* Action */}
            <div className="card-elevated border rounded-xl bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-ring" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acao</p>
              </div>
              <div className="p-4">
                {weekStatus === "roteiro" && isRoteirista && (
                  currentWeek.roteiro ? (
                    <div className={cn("flex items-center justify-between p-3 rounded-lg border", STEPS[0].lightBg, STEPS[0].lightBorder, STEPS[0].lightText)}>
                      <div className="flex items-center gap-2.5">
                        <PenLine className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-bold">Finalizar roteiro</p>
                          <p className="text-[11px] opacity-60">Roteiro vinculado — pode concluir</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => markComplete("roteirista")} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs rounded-lg">
                        <Check className="h-3.5 w-3.5 mr-1" /> Concluir
                      </Button>
                    </div>
                  ) : (
                    <div className={cn("p-3 rounded-lg border space-y-2", STEPS[0].lightBg, STEPS[0].lightBorder, STEPS[0].lightText)}>
                      <div className="flex items-center gap-2.5">
                        <PenLine className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-bold">Criar roteiro primeiro</p>
                          <p className="text-[11px] opacity-60">Voce precisa criar e vincular um roteiro a esta semana antes de concluir</p>
                        </div>
                      </div>
                      <Link href={`/roteiros/novo`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg">
                          <PenLine className="h-3.5 w-3.5 mr-1" /> Criar Roteiro
                        </Button>
                      </Link>
                    </div>
                  )
                )}

                {weekStatus === "gravacao" && isNarrator && (
                  <div className={cn("p-3 rounded-lg border space-y-3", STEPS[1].lightBg, STEPS[1].lightBorder, STEPS[1].lightText)}>
                    <div className="flex items-center gap-2.5">
                      <Mic className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-bold">Enviar narracao</p>
                        <p className="text-[11px] opacity-60">MP3, WAV, M4A — max 30MB</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-amber-300/50 hover:border-amber-400 transition-colors text-sm font-semibold">
                          <Upload className="h-4 w-4" /> {uploadingAudio ? "Enviando..." : "Selecionar audio"}
                        </div>
                        <input type="file" className="hidden" accept=".mp3,.wav,.m4a,.ogg,.webm" onChange={handleAudioUpload} disabled={uploadingAudio} />
                      </label>
                      <Button size="sm" variant="outline" className="shrink-0 self-center h-8 text-xs rounded-lg" onClick={() => markComplete("narrador")}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Sem audio
                      </Button>
                    </div>
                  </div>
                )}

                {weekStatus === "edicao" && isEditor && (
                  <div className={cn("p-3 rounded-lg border space-y-3", STEPS[2].lightBg, STEPS[2].lightBorder, STEPS[2].lightText)}>
                    <div className="flex items-center gap-2.5">
                      <Film className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-bold">Finalizar edicao</p>
                        <p className="text-[11px] opacity-60">Cole o link do video editado</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-400" />
                        <Input type="url" placeholder="https://drive.google.com/..." id="linkUrl" className="h-8 pl-8 text-xs rounded-lg" />
                      </div>
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700 h-8 text-xs rounded-lg" onClick={() => { const l = (document.getElementById("linkUrl") as HTMLInputElement)?.value; markComplete("editor", l); }}>
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
                        <p className="text-sm font-bold">Revisao</p>
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
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Edicao
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={() => handleReview(false, "gravacao")}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Gravacao
                      </Button>
                    </div>
                  </div>
                )}

                {weekStatus === "concluido" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <CircleCheck className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Semana concluida</p>
                      <p className="text-[11px] opacity-60">Todos os passos foram finalizados</p>
                    </div>
                  </div>
                )}

                {weekStatus !== "concluido" && !isRoteirista && !isNarrator && !isEditor && !canReview && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-dashed text-muted-foreground/40">
                    <Clock className="h-4 w-4" />
                    <p className="text-xs">Nenhuma acao disponivel para voce nesta etapa</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT — Comments ═══ */}
          <div>
            <div className="card-elevated border rounded-xl bg-card sticky top-20 overflow-hidden">
              <div className="flex flex-col" style={{ height: "min(calc(100vh - 9rem), 580px)" }}>
                <div className="px-3 py-2.5 border-b bg-muted/20 flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold">Comentarios</span>
                  {comments.length > 0 && (
                    <span className="text-[9px] font-bold bg-primary/10 text-primary rounded-full h-4 min-w-4 flex items-center justify-center px-1 ml-auto">{comments.length}</span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <MessageCircle className="h-5 w-5 text-muted-foreground/15 mb-1" />
                      <p className="text-[11px] text-muted-foreground/30">Nenhum comentario</p>
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
