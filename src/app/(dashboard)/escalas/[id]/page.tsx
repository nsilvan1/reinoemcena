"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  ExternalLink,
  FileText,
  Mic,
  PenLine,
  Film,
  Eye,
  CircleCheck,
  Clock,
  Paperclip,
  X,
  AlertTriangle,
  TrendingUp,
  CalendarClock,
  Users,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { cn, parseLocalDate } from "@/lib/utils";
import { differenceInCalendarDays } from "date-fns";
import { STEPS } from "@/components/pipeline/mini-pipeline";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(
  () => import("@/components/editor/rich-text-editor").then((m) => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <div className="h-[280px] skeleton rounded-lg" /> }
);
import { StageAttachments } from "@/components/escala/stage-attachments";
import { RecordingsUploader } from "@/components/escala/recordings-uploader";
import { RecordingsOverview } from "@/components/escala/recordings-overview";
import { EditingUploader } from "@/components/escala/editing-uploader";
import { EditingOverview } from "@/components/escala/editing-overview";
import { ReviewByEditor } from "@/components/escala/review-by-editor";
import { ReviewVideoPanel } from "@/components/escala/review-video-panel";
import { RoteiroPreview } from "@/components/escala/roteiro-preview";
import { AddEditingMediaSheet } from "@/components/escala/add-editing-media-sheet";
import { HistoryCardPicker } from "@/components/acervo/history-card-picker";
import { CharacterPicker } from "@/components/acervo/character-picker";
import { WeekHeader } from "@/components/escala/week-header";
import { WeekStepper } from "@/components/escala/week-stepper";
import { PhasePipeline } from "@/components/escala/phase-pipeline";
import { ReferencesStrip } from "@/components/escala/references-strip";
import { PhaseFrame } from "@/components/escala/phase-frame";
import { TeamTable } from "@/components/escala/team-table";
import { CommentsPanel } from "@/components/escala/comments-panel";
import { StageActivity } from "@/components/escala/stage-activity";

const ROLE_TO_STAGE: Record<string, string> = {
  roteirista: "roteiro",
  narrador: "gravacao",
  editor: "edicao",
};

export default function ScaleDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const [scale, setScale] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [viewingStage, setViewingStage] = useState<string | null>(null);

  // Inline roteiro creation
  const [showInlineRoteiro, setShowInlineRoteiro] = useState(false);
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineContent, setInlineContent] = useState("");
  const [inlineFile, setInlineFile] = useState<File | null>(null);
  const [savingRoteiro, setSavingRoteiro] = useState(false);
  const inlineFileRef = useRef<HTMLInputElement>(null);

  // Admin advance confirmation
  const [confirmAdvance, setConfirmAdvance] = useState<string | null>(null);

  // Acervo pickers
  const [pickHistoryOpen, setPickHistoryOpen] = useState(false);
  const [pickCharactersOpen, setPickCharactersOpen] = useState(false);

  // Roteiro: alterna preview <-> editor TipTap quando já existe roteiro vinculado
  const [editingRoteiroId, setEditingRoteiroId] = useState<string | null>(null);
  const [editingRoteiroTitle, setEditingRoteiroTitle] = useState("");
  const [editingRoteiroContent, setEditingRoteiroContent] = useState("");
  const [savingEditedRoteiro, setSavingEditedRoteiro] = useState(false);

  // Edição: sheet "Adicionar mídia"
  const [addMediaOpen, setAddMediaOpen] = useState(false);

  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const canReview = ["admin", "coordenador"].includes(role);
  const canLinkAcervo = ["admin", "coordenador", "roteirista"].includes(role);

  useEffect(() => {
    fetch(`/api/scales/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setScale(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!scale) return;
    Promise.all([
      fetch(`/api/task-progress?scaleId=${id}&weekNumber=${selectedWeek}`).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch(`/api/comments?scaleId=${id}&weekNumber=${selectedWeek}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([p, c]) => {
        setProgress(p);
        setComments(c);
      })
      .catch(() =>
        toast.error("Erro ao carregar dados da semana")
      );
  }, [id, selectedWeek, scale]);

  useEffect(() => {
    setViewingStage(null);
  }, [selectedWeek]);

  useEffect(() => {
    setConfirmAdvance(null);
    setShowInlineRoteiro(false);
    setInlineTitle("");
    setInlineContent("");
    setInlineFile(null);
    setEditingRoteiroId(null);
    setEditingRoteiroTitle("");
    setEditingRoteiroContent("");
    setAddMediaOpen(false);
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

  async function handleInlineRoteiroSave() {
    if (!inlineTitle.trim()) {
      toast.error("Informe o título do roteiro");
      return;
    }
    if (!inlineContent.trim() && !inlineFile) {
      toast.error("Escreva o conteúdo ou anexe um arquivo");
      return;
    }
    setSavingRoteiro(true);
    try {
      const res = await fetch("/api/roteiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inlineTitle.trim(),
          content: inlineContent,
          scaleId: id,
          weekNumber: selectedWeek,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const roteiro = await res.json();
      if (inlineFile) {
        const formData = new FormData();
        formData.append("file", inlineFile);
        const uploadRes = await fetch(`/api/roteiros/${roteiro._id}/upload`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) toast.error("Roteiro salvo, mas erro no upload do arquivo");
      }
      toast.success("Roteiro salvo!");
      setShowInlineRoteiro(false);
      setInlineTitle("");
      setInlineContent("");
      setInlineFile(null);
      refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar roteiro");
    } finally {
      setSavingRoteiro(false);
    }
  }

  function startEditRoteiro(r: { _id: string; title?: string; content?: string }) {
    setEditingRoteiroId(r._id);
    setEditingRoteiroTitle(r.title || "");
    setEditingRoteiroContent(r.content || "");
  }

  function cancelEditRoteiro() {
    setEditingRoteiroId(null);
    setEditingRoteiroTitle("");
    setEditingRoteiroContent("");
  }

  async function saveEditedRoteiro() {
    if (!editingRoteiroId) return;
    if (!editingRoteiroTitle.trim()) {
      toast.error("Informe o título");
      return;
    }
    setSavingEditedRoteiro(true);
    try {
      const res = await fetch(`/api/roteiros/${editingRoteiroId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingRoteiroTitle.trim(),
          content: editingRoteiroContent,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Erro ao salvar");
      }
      toast.success("Roteiro atualizado");
      cancelEditRoteiro();
      refreshData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingEditedRoteiro(false);
    }
  }

  async function markComplete(taskRole: string, linkUrl?: string) {
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: taskRole, completed: true, linkUrl }),
    });
    if (res.ok) {
      toast.success("Concluído!");
      refreshData();
    } else toast.error("Erro");
  }

  async function setWeekStatus(newStatus: string) {
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success("Etapa atualizada!");
      refreshData();
    } else toast.error("Erro ao atualizar etapa");
  }

  async function handlePickHistory(historyCardId: string | null) {
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyCardId }),
    });
    if (res.ok) {
      toast.success(historyCardId ? "História vinculada" : "Removido");
      refreshData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error || "Erro ao vincular");
    }
  }

  async function handlePickCharacters(characterIds: string[]) {
    const res = await fetch(`/api/scales/${id}/weeks/${selectedWeek}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterIds }),
    });
    if (res.ok) {
      toast.success("Personagens atualizados");
      refreshData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error || "Erro ao atualizar");
    }
  }

  async function sendComment() {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const cw = scale?.weeks?.find((w: any) => w.number === selectedWeek);
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaleId: id,
          weekNumber: selectedWeek,
          message: newComment.trim(),
          stage: cw?.status || "geral",
        }),
      });
      if (res.ok) {
        setNewComment("");
        const cr = await fetch(
          `/api/comments?scaleId=${id}&weekNumber=${selectedWeek}`
        );
        if (cr.ok) setComments(await cr.json());
      }
    } catch {
      toast.error("Erro ao enviar");
    } finally {
      setSendingComment(false);
    }
  }

  // Build unified activity feed from progress + comments for a given stage
  const stageActivity = useMemo(() => {
    if (!viewingStage) return [];
    const vs = STEPS.find((s) => s.key === viewingStage);
    if (!vs) return [];
    const items: { type: "completion" | "link" | "comment"; time: Date; data: any }[] =
      [];

    progress.forEach((p: any) => {
      const pStage = ROLE_TO_STAGE[p.role];
      if (pStage === viewingStage && p.completed && p.completedAt) {
        items.push({ type: "completion", time: new Date(p.completedAt), data: p });
      }
      if (pStage === viewingStage && p.linkUrl) {
        items.push({
          type: "link",
          time: new Date(p.updatedAt || p.completedAt || p.createdAt),
          data: p,
        });
      }
    });

    comments.forEach((c: any) => {
      if (
        c.stage === viewingStage ||
        (viewingStage === "concluido" && c.stage === "geral")
      ) {
        items.push({ type: "comment", time: new Date(c.createdAt), data: c });
      }
    });

    items.sort((a, b) => a.time.getTime() - b.time.getTime());
    return items;
  }, [viewingStage, progress, comments]);

  if (loading)
    return (
      <div className="space-y-4">
        <div className="h-6 w-64 skeleton rounded-md" />
        <div className="h-10 w-full skeleton rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-12 skeleton rounded-lg" />
            <div className="h-60 skeleton rounded-xl" />
            <div className="h-40 skeleton rounded-xl" />
          </div>
          <div className="lg:col-span-4 h-96 skeleton rounded-xl" />
        </div>
      </div>
    );

  if (!scale)
    return <p className="text-muted-foreground">Escala não encontrada</p>;

  const currentWeek = scale.weeks.find((w: any) => w.number === selectedWeek);
  const weekStatus = currentWeek?.status || "roteiro";
  const stepIdx = STEPS.findIndex((s) => s.key === weekStatus);
  const currentStep = STEPS[stepIdx];
  const nextStep = STEPS[stepIdx + 1];
  const isNarrator = currentWeek?.assignments?.narradores?.some(
    (u: any) => (u._id || u) === userId
  );
  const isEditor = currentWeek?.assignments?.editores?.some(
    (u: any) => (u._id || u) === userId
  );
  const isRoteirista = currentWeek?.assignments?.roteiristas?.some(
    (u: any) => (u._id || u) === userId
  );

  const teamCount =
    (currentWeek?.assignments?.roteiristas?.length || 0) +
    (currentWeek?.assignments?.narradores?.length || 0) +
    (currentWeek?.assignments?.editores?.length || 0);

  const viewingStep = viewingStage ? STEPS.find((s) => s.key === viewingStage) : null;

  /** Renders the "Avançar" button + warning workflow (used by all phase panels). */
  const renderAdvance = (advanceWarning: string | null) => {
    if (!nextStep) return null;
    if (confirmAdvance === nextStep.key) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[oklch(0.82_0.13_60)] font-medium">
            {advanceWarning}
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-[11px] rounded-md"
            onClick={() => {
              setConfirmAdvance(null);
              setWeekStatus(nextStep.key);
            }}
          >
            Avançar mesmo assim
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] rounded-md px-2"
            onClick={() => setConfirmAdvance(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        className={cn(
          "h-7 text-[11px] rounded-md border",
          advanceWarning
            ? "border-[oklch(0.40_0.08_60)] text-[oklch(0.82_0.13_60)] hover:bg-[oklch(0.22_0.030_60)]"
            : cn(nextStep.lightBorder, nextStep.lightText)
        )}
        onClick={() => {
          if (advanceWarning) setConfirmAdvance(nextStep.key);
          else setWeekStatus(nextStep.key);
        }}
      >
        {advanceWarning && <AlertTriangle className="h-3 w-3 mr-1" />}
        <nextStep.icon className="h-3 w-3 mr-1" />
        Avançar
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      {/* ═══ HEADER ═══ */}
      <div className="animate-in-view stagger-1">
        <WeekHeader
          scaleTitle={scale.title}
          scaleId={String(id)}
          scaleMonth={scale.month}
          weekNumber={selectedWeek}
          weekTheme={currentWeek?.theme || ""}
          weekDeadline={currentWeek?.deadline || ""}
          weekStatus={weekStatus}
          teamCount={teamCount}
        />
      </div>

      {/* ═══ WEEK STEPPER ═══ */}
      <div className="animate-in-view stagger-2">
        <WeekStepper
          weeks={scale.weeks}
          selected={selectedWeek}
          onSelect={setSelectedWeek}
        />
      </div>

      {/* ═══ WEEK SUMMARY KPIs ═══ */}
      {currentWeek && (
        <WeekSummaryCard
          progress={progress}
          deadline={currentWeek?.deadline || ""}
          teamCount={teamCount}
        />
      )}

      {/* ═══ PHASE PIPELINE ═══ */}
      <div className="animate-in-view stagger-4">
        <PhasePipeline
          status={weekStatus}
          viewingStage={viewingStage}
          onSelectStage={setViewingStage}
        />
      </div>

      {currentWeek && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ═══ LEFT (8 cols) ═══ */}
          <div className="lg:col-span-8 space-y-4">
            {/* References strip */}
            <div className="animate-in-view stagger-5">
              <ReferencesStrip
                historyCard={currentWeek?.historyCardId || null}
                characters={currentWeek?.characterIds || []}
                canEdit={canLinkAcervo}
                onPickHistory={() => setPickHistoryOpen(true)}
                onPickCharacters={() => setPickCharactersOpen(true)}
              />
            </div>

            {/* Stage activity (only when viewing past stage) */}
            {viewingStage && viewingStep && (
              <StageActivity
                viewingStage={viewingStage}
                items={stageActivity}
                onClose={() => setViewingStage(null)}
              />
            )}

            {/* ═══ PHASE ACTIVE PANEL ═══ */}
            {weekStatus === "roteiro" && canReview && !isRoteirista && (() => {
              const total = currentWeek?.assignments?.roteiristas?.length || 0;
              const done = progress.filter(
                (p: any) => p.role === "roteirista" && p.completed
              ).length;
              const advanceWarning = !currentWeek.roteiro
                ? "Nenhum roteiro criado"
                : null;
              return (
                <PhaseFrame
                  accentText={STEPS[0].lightText}
                  rail={STEPS[0].bg}
                  tint={STEPS[0].lightBg}
                  icon={PenLine}
                  label="Fase de Roteiro"
                  subtitle={
                    total > 0
                      ? `${total} roteirista${total > 1 ? "s" : ""} atribuído${total > 1 ? "s" : ""}`
                      : "Nenhum roteirista atribuído"
                  }
                  progress={{ done, total }}
                  actions={renderAdvance(advanceWarning)}
                >
                  {!currentWeek.roteiro && !showInlineRoteiro && (
                    <Button
                      size="sm"
                      className="bg-[oklch(0.55_0.17_220)] hover:bg-[oklch(0.48_0.17_220)] h-8 text-xs rounded-lg w-full"
                      onClick={() => setShowInlineRoteiro(true)}
                    >
                      <PenLine className="h-3.5 w-3.5 mr-1.5" /> Escrever roteiro agora
                    </Button>
                  )}
                  {currentWeek.roteiro && !showInlineRoteiro && (
                    editingRoteiroId === (currentWeek.roteiro._id || currentWeek.roteiro) ? (
                      <InlineRoteiroEditor
                        title={editingRoteiroTitle}
                        content={editingRoteiroContent}
                        onChangeTitle={setEditingRoteiroTitle}
                        onChangeContent={setEditingRoteiroContent}
                        onSave={saveEditedRoteiro}
                        onCancel={cancelEditRoteiro}
                        saving={savingEditedRoteiro}
                        label="Editando roteiro"
                      />
                    ) : (
                      <RoteiroPreview
                        roteiro={currentWeek.roteiro}
                        canEdit={canReview}
                        onEdit={() => startEditRoteiro(currentWeek.roteiro)}
                        accentText={STEPS[0].lightText}
                      />
                    )
                  )}
                  {showInlineRoteiro && (
                    <InlineRoteiroCreator
                      title={inlineTitle}
                      content={inlineContent}
                      file={inlineFile}
                      fileRef={inlineFileRef}
                      onChangeTitle={setInlineTitle}
                      onChangeContent={setInlineContent}
                      onChangeFile={setInlineFile}
                      onSave={handleInlineRoteiroSave}
                      onCancel={() => {
                        setShowInlineRoteiro(false);
                        setInlineTitle("");
                        setInlineContent("");
                        setInlineFile(null);
                      }}
                      saving={savingRoteiro}
                    />
                  )}
                </PhaseFrame>
              );
            })()}

            {weekStatus === "roteiro" && isRoteirista && (
              currentWeek.roteiro ? (
                <PhaseFrame
                  accentText={STEPS[0].lightText}
                  rail={STEPS[0].bg}
                  tint={STEPS[0].lightBg}
                  icon={PenLine}
                  label="Seu Roteiro"
                  subtitle="Revise o conteúdo e marque como concluído"
                >
                  {editingRoteiroId === (currentWeek.roteiro._id || currentWeek.roteiro) ? (
                    <InlineRoteiroEditor
                      title={editingRoteiroTitle}
                      content={editingRoteiroContent}
                      onChangeTitle={setEditingRoteiroTitle}
                      onChangeContent={setEditingRoteiroContent}
                      onSave={saveEditedRoteiro}
                      onCancel={cancelEditRoteiro}
                      saving={savingEditedRoteiro}
                      label="Editando roteiro"
                    />
                  ) : (
                    <>
                      <RoteiroPreview
                        roteiro={currentWeek.roteiro}
                        canEdit
                        onEdit={() => startEditRoteiro(currentWeek.roteiro)}
                        accentText={STEPS[0].lightText}
                      />
                      <div className="pt-2 border-t border-dashed border-border/40 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => markComplete("roteirista")}
                          className="bg-[oklch(0.55_0.17_220)] hover:bg-[oklch(0.48_0.17_220)] h-8 text-xs rounded-lg"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Marcar como concluído
                        </Button>
                      </div>
                    </>
                  )}
                </PhaseFrame>
              ) : (
                <PhaseFrame
                  accentText={STEPS[0].lightText}
                  rail={STEPS[0].bg}
                  tint={STEPS[0].lightBg}
                  icon={PenLine}
                  label="Criar Roteiro"
                  subtitle="Escreva o roteiro ou anexe o arquivo aqui mesmo"
                >
                  {!showInlineRoteiro ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-[oklch(0.55_0.17_220)] hover:bg-[oklch(0.48_0.17_220)] h-8 text-xs rounded-lg flex-1"
                        onClick={() => setShowInlineRoteiro(true)}
                      >
                        <PenLine className="h-3.5 w-3.5 mr-1" /> Escrever agora
                      </Button>
                      <Link href="/roteiros/novo">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs rounded-lg text-muted-foreground border"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Editor completo
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <InlineRoteiroCreator
                      title={inlineTitle}
                      content={inlineContent}
                      file={inlineFile}
                      fileRef={inlineFileRef}
                      onChangeTitle={setInlineTitle}
                      onChangeContent={setInlineContent}
                      onChangeFile={setInlineFile}
                      onSave={handleInlineRoteiroSave}
                      onCancel={() => {
                        setShowInlineRoteiro(false);
                        setInlineTitle("");
                        setInlineContent("");
                        setInlineFile(null);
                      }}
                      saving={savingRoteiro}
                    />
                  )}
                </PhaseFrame>
              )
            )}

            {weekStatus === "gravacao" && canReview && !isNarrator && (() => {
              const total = currentWeek?.assignments?.narradores?.length || 0;
              const done = progress.filter(
                (p: any) => p.role === "narrador" && p.completed
              ).length;
              const advanceWarning =
                done === 0
                  ? "Nenhuma narração concluída"
                  : done < total
                    ? `${total - done} narrador(es) pendente(s)`
                    : null;
              return (
                <PhaseFrame
                  accentText={STEPS[1].lightText}
                  rail={STEPS[1].bg}
                  tint={STEPS[1].lightBg}
                  icon={Mic}
                  label="Fase de Gravação"
                  subtitle={
                    total > 0
                      ? `${total} narrador${total > 1 ? "es" : ""} atribuído${total > 1 ? "s" : ""}`
                      : "Nenhum narrador atribuído"
                  }
                  progress={{ done, total }}
                  actions={renderAdvance(advanceWarning)}
                >
                  <RecordingsOverview
                    scaleId={String(id)}
                    weekNumber={selectedWeek}
                    narradores={(currentWeek?.assignments?.narradores || []).map(
                      (u: any) => ({ _id: u._id || u, name: u.name || "?" })
                    )}
                    progress={progress}
                  />
                </PhaseFrame>
              );
            })()}

            {weekStatus === "gravacao" && isNarrator && (() => {
              const myProgress = progress.find(
                (p: any) =>
                  p.role === "narrador" &&
                  (p.userId?._id || p.userId) === userId
              );
              return (
                <PhaseFrame
                  accentText={STEPS[1].lightText}
                  rail={STEPS[1].bg}
                  tint={STEPS[1].lightBg}
                  icon={Mic}
                  label="Sua Narração"
                  subtitle="Grave ou envie o áudio da sua narração"
                >
                  <RecordingsUploader
                    scaleId={String(id)}
                    weekNumber={selectedWeek}
                    currentUserId={String(userId)}
                    currentUserName={(session?.user as any)?.name || "narrador"}
                    hasRoteiro={!!currentWeek?.roteiro}
                    notes={myProgress?.notes || ""}
                    completed={!!myProgress?.completed}
                    onChanged={refreshData}
                  />
                </PhaseFrame>
              );
            })()}

            {weekStatus === "edicao" && canReview && !isEditor && (() => {
              const total = currentWeek?.assignments?.editores?.length || 0;
              const done = progress.filter(
                (p: any) => p.role === "editor" && p.completed
              ).length;
              const advanceWarning =
                done < total
                  ? `Faltam ${total - done} editor${total - done > 1 ? "es" : ""}`
                  : null;
              return (
                <PhaseFrame
                  accentText={STEPS[2].lightText}
                  rail={STEPS[2].bg}
                  tint={STEPS[2].lightBg}
                  icon={Film}
                  label="Fase de Edição"
                  subtitle={
                    total > 0
                      ? `${total} editor${total > 1 ? "es" : ""} atribuído${total > 1 ? "s" : ""}`
                      : "Nenhum editor atribuído"
                  }
                  progress={{ done, total }}
                  actions={renderAdvance(advanceWarning)}
                >
                  <EditingOverview
                    scaleId={String(id)}
                    weekNumber={selectedWeek}
                    editores={(currentWeek?.assignments?.editores || []).map(
                      (u: any) => ({ _id: u._id || u, name: u.name || "?" })
                    )}
                    progress={progress}
                  />
                </PhaseFrame>
              );
            })()}

            {weekStatus === "edicao" && isEditor && (() => {
              const myProgress = progress.find(
                (p: any) =>
                  p.role === "editor" && (p.userId?._id || p.userId) === userId
              );
              return (
                <PhaseFrame
                  accentText={STEPS[2].lightText}
                  rail={STEPS[2].bg}
                  tint={STEPS[2].lightBg}
                  icon={Film}
                  label="Sua Edição"
                  subtitle="Envie sua versão final do vídeo editado"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs w-full border-dashed border-[oklch(0.40_0.06_300)] text-[oklch(0.82_0.13_300)] hover:bg-[oklch(0.22_0.025_300)]"
                    onClick={() => setAddMediaOpen(true)}
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                    Adicionar mídia (Acervo ou upload)
                  </Button>
                  <EditingUploader
                    scaleId={String(id)}
                    weekNumber={selectedWeek}
                    currentUserId={String(userId)}
                    hasRoteiro={!!currentWeek?.roteiro}
                    notes={myProgress?.notes || ""}
                    completed={!!myProgress?.completed}
                    reviewStatus={myProgress?.reviewStatus}
                    reviewReason={myProgress?.reviewReason}
                    rejectionCount={myProgress?.rejectionCount}
                    onChanged={refreshData}
                  />
                </PhaseFrame>
              );
            })()}

            {weekStatus === "revisao" && canReview && (() => {
              const editores = (currentWeek?.assignments?.editores || []).map(
                (u: any) => ({ _id: u._id || u, name: u.name || "?" })
              );
              const approvedCount = progress.filter(
                (p: any) => p.role === "editor" && p.reviewStatus === "approved"
              ).length;
              const allApproved =
                editores.length > 0 && approvedCount === editores.length;
              return (
                <PhaseFrame
                  accentText={STEPS[3].lightText}
                  rail={STEPS[3].bg}
                  tint={STEPS[3].lightBg}
                  icon={Eye}
                  label="Revisão Final"
                  subtitle={
                    editores.length > 0
                      ? "Aprove ou peça alterações nas edições"
                      : "Nenhum editor atribuído"
                  }
                  progress={
                    editores.length > 0
                      ? { done: approvedCount, total: editores.length }
                      : undefined
                  }
                  actions={
                    allApproved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.82_0.13_158)] bg-[oklch(0.22_0.030_158)] px-2 py-1 rounded-md">
                        <Check className="h-3 w-3" /> Aprovado
                      </span>
                    ) : undefined
                  }
                >
                  <ReviewVideoPanel
                    scaleId={String(id)}
                    weekNumber={selectedWeek}
                    initialUrl={currentWeek.reviewVideoUrl || ""}
                    canReview={canReview}
                    onChanged={refreshData}
                  />
                  <ReviewByEditor
                    scaleId={String(id)}
                    weekNumber={selectedWeek}
                    editores={editores}
                    progress={progress}
                    onChanged={refreshData}
                  />
                </PhaseFrame>
              );
            })()}

            {viewingStage === "gravacao" && weekStatus !== "gravacao" && (
              <PhaseFrame
                accentText={STEPS[1].lightText}
                rail={STEPS[1].bg}
                tint={STEPS[1].lightBg}
                icon={Mic}
                label="Gravações (visualizando)"
                subtitle="Revisão histórica desta etapa"
              >
                <RecordingsOverview
                  scaleId={String(id)}
                  weekNumber={selectedWeek}
                  narradores={(currentWeek?.assignments?.narradores || []).map(
                    (u: any) => ({ _id: u._id || u, name: u.name || "?" })
                  )}
                  progress={progress}
                />
              </PhaseFrame>
            )}

            {weekStatus === "concluido" && !viewingStage && (
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl card-glass border border-[oklch(0.35_0.06_158)] bg-[oklch(0.22_0.030_158)]">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[oklch(0.30_0.05_158)] flex items-center justify-center">
                    <CircleCheck className="h-5 w-5 text-[oklch(0.82_0.13_158)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[oklch(0.92_0.10_158)]">
                      Semana concluída
                    </p>
                    <p className="text-[11px] text-[oklch(0.82_0.13_158)]/70">
                      Todos os passos foram finalizados
                    </p>
                  </div>
                </div>
                {currentWeek.reviewVideoUrl && (
                  <a
                    href={currentWeek.reviewVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[oklch(0.82_0.13_158)] hover:text-[oklch(0.92_0.10_158)] px-2 py-1 rounded-md border border-[oklch(0.35_0.06_158)]"
                  >
                    Vídeo final <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {weekStatus !== "concluido" &&
              !isRoteirista &&
              !isNarrator &&
              !isEditor &&
              !canReview && (
                <div className="flex items-center gap-2 p-3 rounded-lg surface-1 border-dashed text-muted-foreground/60">
                  <Clock className="h-4 w-4" />
                  <p className="text-xs">
                    Nenhuma ação disponível para você nesta etapa
                  </p>
                </div>
              )}

            {/* Attachments */}
            {weekStatus !== "concluido" && (
              <div className="card-glass rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-3 w-3" /> Anexos da fase
                </p>
                <StageAttachments
                  scaleId={String(id)}
                  weekNumber={selectedWeek}
                  stage={weekStatus}
                  currentUserId={userId}
                  canDeleteAny={canReview}
                />
              </div>
            )}

            {/* Team */}
            <div className="animate-in-view stagger-6">
              <TeamTable
                assignments={currentWeek.assignments || {}}
                progress={progress}
                weekStatus={weekStatus}
                roteiro={currentWeek.roteiro}
                canReview={canReview}
                defaultOpen={teamCount > 0}
              />
            </div>
          </div>

          {/* ═══ RIGHT (4 cols) — Chat ═══ */}
          <div className="lg:col-span-4 animate-in-view stagger-5">
            <CommentsPanel
              comments={comments}
              currentUserId={userId}
              newComment={newComment}
              onChangeNewComment={setNewComment}
              onSend={sendComment}
              sending={sendingComment}
            />
          </div>
        </div>
      )}

      <HistoryCardPicker
        open={pickHistoryOpen}
        onOpenChange={setPickHistoryOpen}
        selectedId={currentWeek?.historyCardId?._id}
        onSelect={handlePickHistory}
      />
      <CharacterPicker
        open={pickCharactersOpen}
        onOpenChange={setPickCharactersOpen}
        selectedIds={(currentWeek?.characterIds || []).map(
          (c: any) => c._id || c
        )}
        onConfirm={handlePickCharacters}
      />
      <AddEditingMediaSheet
        open={addMediaOpen}
        onOpenChange={setAddMediaOpen}
        scaleId={String(id)}
        weekNumber={selectedWeek}
        onChanged={refreshData}
      />
    </div>
  );
}

/* ═══════════════════════════════════════
 * MiniKpi — KPI compacto p/ resumo de semana
 * ═══════════════════════════════════════ */

function MiniKpi({
  icon: Icon,
  label,
  value,
  tone = "muted",
  pulse = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: "muted" | "primary" | "warning" | "danger" | "info";
  pulse?: boolean;
}) {
  const toneMap = {
    muted: "text-foreground/90",
    primary: "text-[oklch(0.82_0.14_158)]",
    warning: "text-[oklch(0.82_0.14_60)]",
    danger: "text-[oklch(0.80_0.16_25)]",
    info: "text-[oklch(0.82_0.14_220)]",
  };
  const iconBgMap = {
    muted: "bg-[oklch(0.265_0.014_170)]",
    primary: "bg-[oklch(0.22_0.030_158)]",
    warning: "bg-[oklch(0.22_0.030_60)]",
    danger: "bg-[oklch(0.22_0.030_25)]",
    info: "bg-[oklch(0.22_0.030_220)]",
  };
  const iconTextMap = {
    muted: "text-muted-foreground",
    primary: "text-[oklch(0.82_0.14_158)]",
    warning: "text-[oklch(0.82_0.14_60)]",
    danger: "text-[oklch(0.80_0.16_25)]",
    info: "text-[oklch(0.82_0.14_220)]",
  };
  return (
    <div className="flex flex-col gap-2 py-3 px-3 rounded-lg bg-[oklch(0.225_0.015_172)] border border-border/60 min-w-0">
      <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", iconBgMap[tone], pulse && "glow-pulse")}>
        <Icon className={cn("h-3.5 w-3.5", iconTextMap[tone])} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-[18px] font-semibold tabular-nums leading-none tracking-tight", toneMap[tone])}>
          {value}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground/55 mt-1 truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
 * WeekSummaryCard — 4 KPIs inline
 * ═══════════════════════════════════════ */

function WeekSummaryCard({
  progress,
  deadline,
  teamCount,
}: {
  progress: any[];
  deadline: string;
  teamCount: number;
}) {
  // % concluído
  const totalTasks = progress.length;
  const completedTasks = progress.filter((p: any) => p.completed).length;
  const pctDone = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Dias até prazo
  let diasRestantes: number | null = null;
  let deadlineTone: "primary" | "warning" | "danger" | "muted" = "muted";
  try {
    const deadlineDate = parseLocalDate(deadline);
    diasRestantes = differenceInCalendarDays(deadlineDate, new Date());
    if (diasRestantes > 7) deadlineTone = "primary";
    else if (diasRestantes >= 0) deadlineTone = "warning";
    else deadlineTone = "danger";
  } catch {
    // deadline inválido — ignora
  }

  // Anexos (linkUrl preenchidos)
  const attachmentCount = progress.filter((p: any) => !!p.linkUrl).length;

  const deadlineLabel =
    diasRestantes === null
      ? "—"
      : diasRestantes < 0
        ? `${Math.abs(diasRestantes)}d atrás`
        : diasRestantes === 0
          ? "Hoje"
          : `${diasRestantes}d`;

  return (
    <div className="surface-elevated rounded-xl p-4 animate-in-view stagger-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKpi
          icon={TrendingUp}
          label="Concluído"
          value={`${pctDone}%`}
          tone={pctDone === 100 ? "primary" : pctDone >= 50 ? "info" : "muted"}
        />
        <MiniKpi
          icon={CalendarClock}
          label="Até prazo"
          value={deadlineLabel}
          tone={deadlineTone}
          pulse={deadlineTone === "danger"}
        />
        <MiniKpi
          icon={Users}
          label="Membros"
          value={teamCount}
          tone="muted"
        />
        <MiniKpi
          icon={Link2}
          label="Anexos"
          value={attachmentCount}
          tone={attachmentCount > 0 ? "info" : "muted"}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
 * Sub-renderers (kept inline — small)
 * ═══════════════════════════════════════ */

function InlineRoteiroCreator({
  title,
  content,
  file,
  fileRef,
  onChangeTitle,
  onChangeContent,
  onChangeFile,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  content: string;
  file: File | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onChangeTitle: (v: string) => void;
  onChangeContent: (v: string) => void;
  onChangeFile: (f: File | null) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <Input
        placeholder="Título do roteiro"
        value={title}
        onChange={(e) => onChangeTitle(e.target.value)}
        className="h-9 text-sm bg-[oklch(0.235_0.015_172)]"
      />
      <RichTextEditor
        content={content}
        onChange={onChangeContent}
        placeholder="Escreva o roteiro..."
      />
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.mp3,.wav"
          onChange={(e) => onChangeFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div className="flex items-center gap-2 text-[11px] text-[oklch(0.82_0.13_220)] bg-[oklch(0.22_0.030_220)] border border-[oklch(0.35_0.06_220)] rounded-lg px-2 py-1 flex-1">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">{file.name}</span>
            <button onClick={() => onChangeFile(null)} className="ml-auto">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-[11px] text-[oklch(0.78_0.13_220)] hover:underline flex items-center gap-1"
          >
            <Paperclip className="h-3 w-3" /> Anexar arquivo (opcional)
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-[oklch(0.55_0.17_220)] hover:bg-[oklch(0.48_0.17_220)] h-8 text-xs rounded-lg flex-1"
          disabled={saving || !title.trim() || (!content.trim() && !file)}
          onClick={onSave}
        >
          {saving ? "Salvando..." : "Salvar Roteiro"}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function InlineRoteiroEditor({
  title,
  content,
  onChangeTitle,
  onChangeContent,
  onSave,
  onCancel,
  saving,
  label,
}: {
  title: string;
  content: string;
  onChangeTitle: (v: string) => void;
  onChangeContent: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[10px] font-bold uppercase tracking-widest", STEPS[0].lightText)}>
          {label}
        </p>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] rounded-md" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" /> Cancelar
        </Button>
      </div>
      <Input
        placeholder="Título do roteiro"
        value={title}
        onChange={(e) => onChangeTitle(e.target.value)}
        className="h-9 text-sm bg-[oklch(0.235_0.015_172)]"
      />
      <RichTextEditor
        content={content}
        onChange={onChangeContent}
        placeholder="Escreva o roteiro..."
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-[oklch(0.55_0.17_220)] hover:bg-[oklch(0.48_0.17_220)] h-8 text-xs rounded-lg flex-1"
          disabled={saving || !title.trim()}
          onClick={onSave}
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
