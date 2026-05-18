"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FileText,
  Film,
  Mic,
  Save,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  Calendar,
  Hash,
  User2,
  Clock,
  History,
  Paperclip,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/editor/rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="skeleton h-96 w-full rounded-md" />,
  }
);
const RichTextViewer = dynamic(
  () => import("@/components/editor/rich-text-editor").then((m) => m.RichTextViewer),
  {
    ssr: false,
    loading: () => <div className="skeleton h-64 w-full rounded-md" />,
  }
);
import { VersionHistory } from "@/components/roteiro/version-history";
import { RoteiroFiles } from "@/components/roteiro/roteiro-files";
import { Avatar, Badge } from "@/components/v2/primitives";

type SaveState = "idle" | "saving" | "error";

const AUTOSAVE_DELAY_MS = 1200;

function normalizeForDiff(html: string) {
  return html
    .replace(/\s*style="[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function RoteiroDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const [roteiro, setRoteiro] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const saveStateRef = useRef<SaveState>("idle");

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  const role = (session?.user as any)?.role;
  const canEdit: boolean =
    roteiro?.canEdit ?? (role === "admin" || role === "coordenador");
  const canManageAssignments: boolean = roteiro?.canManageAssignments ?? false;

  const isDirty =
    lastSavedContent !== null &&
    normalizeForDiff(content) !== normalizeForDiff(lastSavedContent);

  useEffect(() => {
    Promise.all([
      fetch(`/api/roteiros/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/users").then((r) => r.ok ? r.json() : []),
    ]).then(([r, u]) => {
      if (r) {
        setRoteiro(r);
        const initial = r.content || "";
        setContent(initial);
        setLastSavedContent(initial);
      }
      setUsers(u);
    }).finally(() => setLoading(false));
  }, [id]);

  const saveContent = useCallback(
    async (silent: boolean) => {
      if (saveStateRef.current === "saving" || !canEdit) return;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/roteiros/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) {
          setSaveState("error");
          if (!silent) toast.error("Erro ao salvar");
          return;
        }
        const data = await res.json();
        setRoteiro(data);
        setLastSavedContent(data.content || "");
        setLastSavedAt(new Date());
        setSaveState("idle");
        if (!silent) toast.success("Salvo!");
      } catch {
        setSaveState("error");
        if (!silent) toast.error("Erro ao salvar");
      }
    },
    [canEdit, content, id]
  );

  useEffect(() => {
    if (!canEdit || !isDirty || saveState === "saving") return;
    const t = setTimeout(() => saveContent(true), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [content, canEdit, isDirty, saveState, saveContent]);

  useEffect(() => {
    if (!isDirty && saveState !== "saving") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, saveState]);

  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  async function handleSave() {
    await saveContent(false);
  }

  async function toggleAssignment(
    assignUserId: string,
    field: "assignedEditors" | "assignedNarrators"
  ) {
    const currentList: string[] = (roteiro[field] || []).map((u: any) => u._id || u);
    const isAssigned = currentList.includes(assignUserId);
    const newList = isAssigned
      ? currentList.filter((uid) => uid !== assignUserId)
      : [...currentList, assignUserId];
    try {
      const res = await fetch(`/api/roteiros/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newList }),
      });
      if (res.ok) {
        setRoteiro(await res.json());
        toast.success(isAssigned ? "Removido!" : "Atribuido!");
      }
    } catch {
      toast.error("Erro");
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-5 w-48 skeleton" />
        <div className="h-10 w-96 skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          <div className="lg:col-span-9 space-y-4">
            <div className="h-96 skeleton rounded-xl" />
            <div className="h-32 skeleton rounded-xl" />
          </div>
          <div className="lg:col-span-3">
            <div className="h-80 skeleton rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!roteiro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <FileText className="h-10 w-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">Roteiro não encontrado</p>
      </div>
    );
  }

  const editors = users.filter((u: any) => u.skills?.includes("editor"));
  const narrators = users.filter((u: any) => u.skills?.includes("narrador"));
  const assignedEditorIds = (roteiro.assignedEditors || []).map((u: any) => u._id || u);
  const assignedNarratorIds = (roteiro.assignedNarrators || []).map((u: any) => u._id || u);

  return (
    <div className="space-y-0 -mt-2">
      {/* ── Sticky document header ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: breadcrumb + meta */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              href="/roteiros"
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Roteiros
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            <span className="text-[12px] font-medium text-foreground/80 truncate">
              {roteiro.title}
            </span>
            <span className="hidden sm:flex items-center gap-1.5 ml-2 text-[11px] text-muted-foreground/50 shrink-0">
              <User2 className="h-3 w-3" />
              {roteiro.createdBy?.name}
              <span className="mx-1">·</span>
              {format(new Date(roteiro.createdAt), "dd 'de' MMM", { locale: ptBR })}
            </span>
          </div>

          {/* Right: save controls */}
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <SaveStatusPill
                state={saveState}
                dirty={isDirty}
                lastSavedAt={lastSavedAt}
                now={now}
                onRetry={() => saveContent(false)}
              />
            )}
            <VersionHistory
              roteiroId={String(id)}
              canEdit={canEdit}
              onRestore={(data) => {
                setRoteiro({ ...roteiro, title: data.title, content: data.content });
                setContent(data.content || "");
                setLastSavedContent(data.content || "");
                setLastSavedAt(new Date());
              }}
            />
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={saveState === "saving" || !isDirty}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium transition-all",
                  "disabled:opacity-40 disabled:pointer-events-none",
                  isDirty && saveState !== "saving"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-[oklch(0.235_0.014_172)] text-muted-foreground border border-border"
                )}
              >
                <Save className="h-3.5 w-3.5" />
                {saveState === "saving" ? "Salvando..." : "Salvar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main 9+3 grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left: document area ── */}
        <div className="lg:col-span-9 space-y-5">
          {/* Inline editable title */}
          <h1
            className="font-heading text-[28px] sm:text-[32px] leading-tight tracking-[-0.03em] text-foreground"
            style={{ fontWeight: 600 }}
          >
            {roteiro.title}
          </h1>

          {/* Editor */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {canEdit ? (
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Escreva o roteiro aqui..."
              />
            ) : content ? (
              <div className="p-5">
                <RichTextViewer content={content} />
              </div>
            ) : (
              <div className="p-10 flex flex-col items-center gap-2 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground/45">Sem conteúdo</p>
              </div>
            )}
          </div>

          {/* Files — dense list */}
          <div className="animate-in-view stagger-3">
            <RoteiroFiles roteiroId={String(id)} canEdit={canEdit} />
          </div>
        </div>

        {/* ── Right: sidebar meta ── */}
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-[3.75rem] space-y-3">

            {/* ── Proxima acao pulsante ── */}
            <NextActionCard
              isDirty={isDirty}
              saveState={saveState}
              lastSavedAt={lastSavedAt}
              now={now}
              scalePhase={roteiro.scaleId?.currentWeekStatus ?? null}
              scaleId={roteiro.scaleId?._id ?? null}
            />

            {/* ── Informacoes ── */}
            <div className="rounded-xl bg-card border border-border overflow-hidden animate-in-view stagger-2">
              <div className="px-4 pt-4 pb-3 border-b border-border/60">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-3">
                  Informacoes
                </p>
                <div className="space-y-2.5">
                  {roteiro.weekNumber && (
                    <MetaRow icon={Hash} label="Semana" value={`Semana ${roteiro.weekNumber}`} />
                  )}
                  {roteiro.scaleId && (
                    <MetaRow icon={Calendar} label="Escala" value={roteiro.scaleId?.title || "—"} />
                  )}
                  <MetaRow
                    icon={Clock}
                    label="Criado em"
                    value={format(new Date(roteiro.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  />
                  {roteiro.createdBy && (
                    <div className="flex items-center gap-2">
                      <User2 className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      <span className="text-[11px] text-muted-foreground/55 w-14 shrink-0">Autor</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Avatar name={roteiro.createdBy.name} size="xs" />
                        <span className="text-[12px] font-medium truncate">{roteiro.createdBy.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Versoes link */}
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-2">
                  Versoes
                </p>
                <button
                  onClick={() => {
                    // trigger VersionHistory open via a shared ref would require lifting state;
                    // instead expose via VersionHistoryTrigger component pattern
                  }}
                  className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                >
                  <History className="h-3 w-3" />
                  Ver historico de versoes
                </button>
              </div>
            </div>

            {/* ── Equipe ── */}
            <div className="rounded-xl bg-card border border-border overflow-hidden animate-in-view stagger-3">
              {/* Editors section */}
              <TeamSection
                label="Editores"
                icon={Film}
                iconHue={300}
                users={editors}
                assignedIds={assignedEditorIds}
                canManage={canManageAssignments}
                field="assignedEditors"
                onToggle={toggleAssignment}
                emptyText="Nenhum editor cadastrado"
              />

              {/* Narrators section */}
              <TeamSection
                label="Narradores"
                icon={Mic}
                iconHue={60}
                users={narrators}
                assignedIds={assignedNarratorIds}
                canManage={canManageAssignments}
                field="assignedNarrators"
                onToggle={toggleAssignment}
                emptyText="Nenhum narrador cadastrado"
              />

              {/* Assigned team cluster (read-only visual) */}
              {(assignedEditorIds.length > 0 || assignedNarratorIds.length > 0) && (
                <div className="px-4 py-3 border-t border-border/60">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 mb-2.5">
                    Equipe atribuida
                  </p>
                  <div className="space-y-1.5">
                    {users
                      .filter((u: any) => assignedEditorIds.includes(u._id) || assignedNarratorIds.includes(u._id))
                      .map((u: any) => {
                        const isEditor = assignedEditorIds.includes(u._id);
                        return (
                          <div key={u._id} className="flex items-center gap-2 min-w-0">
                            <Avatar name={u.name} size="xs" />
                            <span className="text-[12px] font-medium truncate flex-1">{u.name}</span>
                            <Badge tone={isEditor ? "violet" : "warning"}>
                              {isEditor ? "Editor" : "Narrador"}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Arquivos vinculados (atalho) ── */}
            <div className="animate-in-view stagger-4">
              <div className="rounded-xl overflow-hidden border border-border bg-card">
                <div className="px-4 py-3 flex items-center gap-2.5">
                  <span className="h-6 w-6 rounded-md bg-[oklch(0.22_0.030_220)] flex items-center justify-center shrink-0">
                    <Paperclip className="h-3.5 w-3.5 text-[oklch(0.82_0.14_220)]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
                      Arquivos vinculados
                    </p>
                    <p className="text-[11px] text-muted-foreground/55 mt-0.5">
                      Acesse abaixo do editor
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── NextActionCard ───────────────────────────────────────────────

interface NextActionCardProps {
  isDirty: boolean;
  saveState: SaveState;
  lastSavedAt: Date | null;
  now: Date;
  scalePhase: string | null;
  scaleId: string | null;
}

function NextActionCard({ isDirty, saveState, lastSavedAt, now, scalePhase, scaleId }: NextActionCardProps) {
  // Caso 1: salvando
  if (saveState === "saving") {
    return (
      <div
        className="rounded-xl border px-4 py-3 flex items-start gap-3 animate-in-view stagger-1"
        style={{ boxShadow: "inset 2px 0 0 0 oklch(0.78 0.16 60)", background: "oklch(0.215_0.016_172 / 1)", borderColor: "oklch(0.295 0.016 170)" }}
      >
        <span className="h-6 w-6 rounded-md bg-[oklch(0.22_0.030_60)] flex items-center justify-center shrink-0 mt-0.5">
          <Loader2 className="h-3.5 w-3.5 text-[oklch(0.82_0.14_60)] animate-spin" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[oklch(0.82_0.14_60)]">Salvando...</p>
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">Aguarde o auto-save completar</p>
        </div>
      </div>
    );
  }

  // Caso 2: nao salvo (dirty)
  if (isDirty) {
    return (
      <div
        className="rounded-xl border px-4 py-3 flex items-start gap-3 animate-in-view stagger-1"
        style={{ boxShadow: "inset 2px 0 0 0 oklch(0.78 0.16 60)", background: "oklch(0.215_0.016_172 / 1)", borderColor: "oklch(0.295 0.016 170)" }}
      >
        <span className="h-6 w-6 rounded-md bg-[oklch(0.22_0.030_60)] flex items-center justify-center shrink-0 mt-0.5 status-pulse">
          <Zap className="h-3.5 w-3.5 text-[oklch(0.82_0.14_60)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[oklch(0.82_0.14_60)]">Alteracoes nao salvas</p>
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">Auto-save em instantes</p>
        </div>
      </div>
    );
  }

  // Caso 3: salvo recentemente (< 5s)
  if (lastSavedAt && now.getTime() - lastSavedAt.getTime() < 5000) {
    return (
      <div
        className="rounded-xl border px-4 py-3 flex items-start gap-3 animate-in-view stagger-1"
        style={{ boxShadow: "inset 2px 0 0 0 oklch(0.74 0.16 158)", background: "oklch(0.215_0.016_172 / 1)", borderColor: "oklch(0.295 0.016 170)" }}
      >
        <span className="h-6 w-6 rounded-md bg-[oklch(0.22_0.030_158)] flex items-center justify-center shrink-0 mt-0.5">
          <Check className="h-3.5 w-3.5 text-[oklch(0.82_0.14_158)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[oklch(0.82_0.14_158)]">Salvo agora</p>
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">Todas as alteracoes foram persistidas</p>
        </div>
      </div>
    );
  }

  // Caso 4: escala em fase gravacao — alerta de confirmacao de narradores
  if (scalePhase === "gravacao" && scaleId) {
    return (
      <div
        className="rounded-xl border px-4 py-3 animate-in-view stagger-1"
        style={{ boxShadow: "inset 2px 0 0 0 oklch(0.74 0.16 158)", background: "oklch(0.215_0.016_172 / 1)", borderColor: "oklch(0.295 0.016 170)" }}
      >
        <div className="flex items-start gap-3 mb-3">
          <span className="h-6 w-6 rounded-md bg-[oklch(0.22_0.030_158)] flex items-center justify-center shrink-0 mt-0.5 glow-pulse">
            <Mic className="h-3.5 w-3.5 text-[oklch(0.82_0.14_158)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[oklch(0.82_0.14_158)]">Esta semana esta em Gravacao</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Confirme que os narradores foram atribuidos</p>
          </div>
        </div>
        <Link
          href={`/escalas/${scaleId}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[oklch(0.74_0.16_158)] hover:text-[oklch(0.82_0.14_158)] transition-colors"
        >
          Ver escala <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  // Padrao: nao renderiza
  return null;
}

// ── MetaRow ──────────────────────────────────────────────────────

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
      <span className="text-[11px] text-muted-foreground/55 w-14 shrink-0">{label}</span>
      <span className="text-[12px] font-medium truncate">{value}</span>
    </div>
  );
}

// ── TeamSection ──────────────────────────────────────────────────

function TeamSection({
  label,
  icon: Icon,
  iconHue,
  users,
  assignedIds,
  canManage,
  field,
  onToggle,
  emptyText,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconHue: number;
  users: { _id: string; name: string }[];
  assignedIds: string[];
  canManage: boolean;
  field: "assignedEditors" | "assignedNarrators";
  onToggle: (id: string, field: "assignedEditors" | "assignedNarrators") => void;
  emptyText: string;
}) {
  return (
    <div className="border-t border-border/60">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span
          className="h-5 w-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `oklch(0.22 0.030 ${iconHue})`, color: `oklch(0.80 0.14 ${iconHue})` }}
        >
          <Icon className="h-3 w-3" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 flex-1">
          {label}
        </span>
        {assignedIds.length > 0 && (
          <span
            className="text-[10px] font-mono font-bold tabular-nums rounded px-1.5 h-4 flex items-center"
            style={{
              background: `oklch(0.22 0.030 ${iconHue})`,
              color: `oklch(0.80 0.14 ${iconHue})`,
            }}
          >
            {assignedIds.length}
          </span>
        )}
      </div>

      {/* User list */}
      <div className="px-2 pb-2 space-y-0.5">
        {users.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/30 px-2 pb-1 italic">{emptyText}</p>
        ) : (
          users.map((u) => {
            const isAssigned = assignedIds.includes(u._id);
            return (
              <button
                key={u._id}
                type="button"
                onClick={() => canManage && onToggle(u._id, field)}
                disabled={!canManage}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors",
                  isAssigned
                    ? "bg-[oklch(0.235_0.025_158)] text-foreground"
                    : "hover:bg-[oklch(0.225_0.016_172)] text-muted-foreground",
                  !canManage && "cursor-default"
                )}
              >
                {/* Avatar initials */}
                <span
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                    isAssigned
                      ? "ring-1"
                      : "bg-[oklch(0.255_0.016_170)] text-muted-foreground"
                  )}
                  style={
                    isAssigned
                      ? {
                          background: `oklch(0.28 0.040 ${iconHue})`,
                          color: `oklch(0.90 0.10 ${iconHue})`,
                          boxShadow: `0 0 0 1px oklch(0.40 0.060 ${iconHue} / 0.5)`,
                        }
                      : {}
                  }
                >
                  {u.name[0].toUpperCase()}
                </span>
                <span className="flex-1 text-left text-[12px] font-medium truncate">
                  {u.name}
                </span>
                {isAssigned && (
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: `oklch(0.78 0.16 ${iconHue})` }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── SaveStatusPill ───────────────────────────────────────────────

interface SaveStatusPillProps {
  state: SaveState;
  dirty: boolean;
  lastSavedAt: Date | null;
  now: Date;
  onRetry: () => void;
}

function SaveStatusPill({ state, dirty, lastSavedAt, now, onRetry }: SaveStatusPillProps) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-[oklch(0.255_0.016_170)] border border-border px-2.5 py-1 rounded-md">
        <Loader2 className="h-3 w-3 animate-spin" /> Salvando
      </span>
    );
  }
  if (state === "error") {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[oklch(0.85_0.14_25)] bg-[oklch(0.22_0.030_25)] hover:bg-[oklch(0.26_0.040_25)] border border-[oklch(0.32_0.060_25)] px-2.5 py-1 rounded-md font-medium"
        title="Tentar salvar novamente"
      >
        <AlertCircle className="h-3 w-3" /> Erro
      </button>
    );
  }
  if (dirty) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[oklch(0.85_0.14_60)] bg-[oklch(0.22_0.030_60)] border border-[oklch(0.32_0.060_60)] px-2.5 py-1 rounded-md">
        <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.16_60)] status-pulse" /> Nao salvo
      </span>
    );
  }
  if (lastSavedAt) {
    const diffMs = now.getTime() - lastSavedAt.getTime();
    const label =
      diffMs < 5000
        ? "agora"
        : `ha ${formatDistanceToNowStrict(lastSavedAt, { locale: ptBR })}`;
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground/65 px-2.5 py-1">
        <Check className="h-3 w-3 text-[oklch(0.80_0.14_158)]" /> {label}
      </span>
    );
  }
  return null;
}
