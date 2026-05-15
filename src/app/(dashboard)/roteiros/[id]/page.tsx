"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, Film, Mic, Save, Check, AlertCircle, Loader2 } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichTextEditor, RichTextViewer } from "@/components/editor/rich-text-editor";
import { VersionHistory } from "@/components/roteiro/version-history";
import { RoteiroFiles } from "@/components/roteiro/roteiro-files";

type SaveState = "idle" | "saving" | "error";

const AUTOSAVE_DELAY_MS = 1200;

// O TipTap reaplica `style` (cor de fundo do Highlight) mesmo após salvarmos
// um HTML sem style. Para evitar loop eterno de "dirty", a comparação ignora
// esse atributo volátil e diferenças de espaçamento.
function normalizeForDiff(html: string) {
  return html
    .replace(/\s*style="[^"]*"/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function RoteiroDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
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
  // canEdit vem do server (calculado por canEditRoteiro). Fallback para coord+
  // antes do roteiro carregar para evitar flash de "read-only" inicial.
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

  // Autosave com debounce. Não dispara durante save em curso.
  useEffect(() => {
    if (!canEdit || !isDirty || saveState === "saving") return;
    const t = setTimeout(() => saveContent(true), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [content, canEdit, isDirty, saveState, saveContent]);

  // Alerta o usuário antes de fechar com alterações pendentes
  useEffect(() => {
    if (!isDirty && saveState !== "saving") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, saveState]);

  // Tick a cada 15s para atualizar o "salvo há Xs"
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  async function handleSave() {
    await saveContent(false);
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
        <div className="flex items-center gap-1.5 shrink-0">
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
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveState === "saving" || !isDirty}
              className="h-8 text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1" />{" "}
              {saveState === "saving" ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </div>
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

          {/* Arquivos (múltiplos) */}
          <RoteiroFiles roteiroId={String(id)} canEdit={canEdit} />
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
                        onClick={() => canManageAssignments && toggleAssignment(u._id, "assignedEditors")}
                        disabled={!canManageAssignments}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
                          isAssigned ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "hover:bg-muted/50",
                          !canManageAssignments && "cursor-default"
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
                        onClick={() => canManageAssignments && toggleAssignment(u._id, "assignedNarrators")}
                        disabled={!canManageAssignments}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
                          isAssigned ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "hover:bg-muted/50",
                          !canManageAssignments && "cursor-default"
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
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
        <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
      </span>
    );
  }
  if (state === "error") {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-[11px] text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md font-medium"
        title="Tentar salvar novamente"
      >
        <AlertCircle className="h-3 w-3" /> Erro · Tentar
      </button>
    );
  }
  if (dirty) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Não salvo
      </span>
    );
  }
  if (lastSavedAt) {
    const diffMs = now.getTime() - lastSavedAt.getTime();
    const label =
      diffMs < 5000
        ? "agora"
        : `há ${formatDistanceToNowStrict(lastSavedAt, { locale: ptBR })}`;
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70 px-2 py-1">
        <Check className="h-3 w-3 text-emerald-600" /> Salvo {label}
      </span>
    );
  }
  return null;
}
