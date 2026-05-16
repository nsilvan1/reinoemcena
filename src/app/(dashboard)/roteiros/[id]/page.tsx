"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, Film, Mic, Save, Check, AlertCircle, Loader2 } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichTextEditor, RichTextViewer } from "@/components/editor/rich-text-editor";
import { VersionHistory } from "@/components/roteiro/version-history";
import { RoteiroFiles } from "@/components/roteiro/roteiro-files";
import { Button, Card, PageHeader } from "@/components/v2/primitives";

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

  if (loading) return <div className="h-64 skeleton rounded-xl" />;
  if (!roteiro) return <p className="text-muted-foreground">Roteiro não encontrado</p>;

  const editors = users.filter((u: any) => u.skills?.includes("editor"));
  const narrators = users.filter((u: any) => u.skills?.includes("narrador"));
  const assignedEditorIds = (roteiro.assignedEditors || []).map((u: any) => u._id || u);
  const assignedNarratorIds = (roteiro.assignedNarrators || []).map((u: any) => u._id || u);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Por ${roteiro.createdBy?.name} · ${format(new Date(roteiro.createdAt), "dd 'de' MMMM", { locale: ptBR })}`}
        title={roteiro.title}
        icon={FileText}
        back={{ href: "/roteiros", label: "Roteiros" }}
        actions={
          <div className="flex items-center gap-2">
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
              <Button onClick={handleSave} disabled={saveState === "saving" || !isDirty}>
                <Save className="h-3.5 w-3.5" />
                {saveState === "saving" ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground/65" />
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">
                Conteúdo
              </span>
            </div>
            {canEdit ? (
              <RichTextEditor content={content} onChange={setContent} placeholder="Escreva o roteiro aqui..." />
            ) : content ? (
              <RichTextViewer content={content} />
            ) : (
              <Card className="p-8 text-center">
                <FileText className="h-6 w-6 mx-auto text-muted-foreground/25 mb-2" />
                <p className="text-xs text-muted-foreground/45">Sem conteúdo</p>
              </Card>
            )}
          </div>

          <RoteiroFiles roteiroId={String(id)} canEdit={canEdit} />
        </div>

        <div>
          <Card className="overflow-hidden lg:sticky lg:top-6">
            <div className="px-4 py-2.5 border-b border-border bg-[oklch(0.16_0.010_240)] flex items-center gap-2">
              <span className="h-5 w-5 rounded-md bg-[oklch(0.22_0.030_300)] flex items-center justify-center">
                <Film className="h-3 w-3 text-[oklch(0.80_0.14_300)]" />
              </span>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">
                Editores
              </p>
              <span className="text-[10px] font-mono font-bold tabular-nums bg-[oklch(0.22_0.030_300)] text-[oklch(0.80_0.14_300)] rounded-md h-4 min-w-4 flex items-center justify-center px-1.5 ml-auto">
                {assignedEditorIds.length}
              </span>
            </div>
            <div className="p-3">
              {editors.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/30 px-1 italic">Nenhum editor cadastrado</p>
              ) : (
                <div className="space-y-0.5">
                  {editors.map((u: { _id: string; name: string }) => {
                    const isAssigned = assignedEditorIds.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => canManageAssignments && toggleAssignment(u._id, "assignedEditors")}
                        disabled={!canManageAssignments}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all",
                          isAssigned
                            ? "bg-[oklch(0.22_0.030_300)] text-[oklch(0.85_0.14_300)] ring-1 ring-[oklch(0.32_0.060_300)]"
                            : "hover:bg-[oklch(0.17_0.010_240)]",
                          !canManageAssignments && "cursor-default"
                        )}
                      >
                        <span
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-1",
                            isAssigned
                              ? "bg-[oklch(0.28_0.040_300)] text-[oklch(0.90_0.10_300)] ring-[oklch(0.40_0.060_300)]/50"
                              : "bg-[oklch(0.20_0.010_240)] text-muted-foreground ring-border"
                          )}
                        >
                          {u.name[0]}
                        </span>
                        <span className="flex-1 text-left text-[12.5px] font-medium">{u.name}</span>
                        {isAssigned && <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.16_300)]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-y border-border bg-[oklch(0.16_0.010_240)] flex items-center gap-2">
              <span className="h-5 w-5 rounded-md bg-[oklch(0.22_0.030_60)] flex items-center justify-center">
                <Mic className="h-3 w-3 text-[oklch(0.80_0.14_60)]" />
              </span>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">
                Narradores
              </p>
              <span className="text-[10px] font-mono font-bold tabular-nums bg-[oklch(0.22_0.030_60)] text-[oklch(0.80_0.14_60)] rounded-md h-4 min-w-4 flex items-center justify-center px-1.5 ml-auto">
                {assignedNarratorIds.length}
              </span>
            </div>
            <div className="p-3">
              {narrators.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/30 px-1 italic">Nenhum narrador cadastrado</p>
              ) : (
                <div className="space-y-0.5">
                  {narrators.map((u: { _id: string; name: string }) => {
                    const isAssigned = assignedNarratorIds.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => canManageAssignments && toggleAssignment(u._id, "assignedNarrators")}
                        disabled={!canManageAssignments}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all",
                          isAssigned
                            ? "bg-[oklch(0.22_0.030_60)] text-[oklch(0.85_0.14_60)] ring-1 ring-[oklch(0.32_0.060_60)]"
                            : "hover:bg-[oklch(0.17_0.010_240)]",
                          !canManageAssignments && "cursor-default"
                        )}
                      >
                        <span
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-1",
                            isAssigned
                              ? "bg-[oklch(0.28_0.040_60)] text-[oklch(0.90_0.10_60)] ring-[oklch(0.40_0.060_60)]/50"
                              : "bg-[oklch(0.20_0.010_240)] text-muted-foreground ring-border"
                          )}
                        >
                          {u.name[0]}
                        </span>
                        <span className="flex-1 text-left text-[12.5px] font-medium">{u.name}</span>
                        {isAssigned && <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.16_60)]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
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
      <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground bg-[oklch(0.20_0.010_240)] border border-border px-2.5 py-1 rounded-md">
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
        <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.16_60)] status-pulse" /> Não salvo
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
      <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground/65 px-2.5 py-1">
        <Check className="h-3 w-3 text-[oklch(0.80_0.14_158)]" /> {label}
      </span>
    );
  }
  return null;
}
