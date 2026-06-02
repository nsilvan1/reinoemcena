"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/v2/primitives";
import {
  HardDriveDownload,
  RefreshCw,
  FolderOpen,
  Folder,
  ChevronRight,
  Link2Off,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ROLE_HIERARCHY, type Role } from "@/types";

interface DriveStatus {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  rootFolderId: string | null;
  rootFolderName: string | null;
  lastSyncedAt: string | null;
  lastSyncSummary: { created: number; updated: number; images: number; errors: number } | null;
}

interface SyncEvent {
  type: "scan" | "import" | "done" | "error";
  message?: string;
  processed?: number;
  total?: number;
  current?: string;
  summary?: { created: number; updated: number; skipped: number; images: number; errors: number };
}

export function DriveSyncPanel({ onSynced }: { onSynced: () => void }) {
  const { data: session } = useSession();
  const role = ((session?.user as { role?: Role })?.role || "membro") as Role;
  const isCoordPlus = ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.coordenador;
  const isAdmin = ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin;

  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncEvent | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/drive/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    if (isCoordPlus) loadStatus();
  }, [isCoordPlus, loadStatus]);

  // Mostra toast conforme retorno do OAuth (?drive=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driveResult = params.get("drive");
    if (!driveResult) return;
    const MSG: Record<string, [boolean, string]> = {
      connected: [true, "Google Drive conectado!"],
      denied: [false, "Conexão cancelada"],
      invalid: [false, "Falha na validação do OAuth"],
      norefresh: [false, "Google não retornou token. Tente novamente."],
      error: [false, "Erro ao conectar ao Drive"],
    };
    const entry = MSG[driveResult];
    if (entry) (entry[0] ? toast.success : toast.error)(entry[1]);
    // limpa o query param
    params.delete("drive");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    loadStatus();
  }, [loadStatus]);

  async function handleSync() {
    setSyncing(true);
    setProgress({ type: "scan", message: "Iniciando…" });
    try {
      const res = await fetch("/api/drive/sync", { method: "POST" });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao sincronizar");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastSummary: SyncEvent["summary"] | undefined;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as SyncEvent;
          setProgress(ev);
          if (ev.type === "done") lastSummary = ev.summary;
          if (ev.type === "error") throw new Error(ev.message || "Erro na sincronização");
        }
      }

      if (lastSummary) {
        const { created, updated, skipped, images } = lastSummary;
        toast.success(
          `Sincronizado: ${created} novos, ${updated} atualizados, ${skipped} sem mudança · ${images} imagens`
        );
      } else {
        toast.success("Sincronização concluída");
      }
      onSynced();
      loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na sincronização");
    } finally {
      setSyncing(false);
      setProgress(null);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Desconectar o Google Drive? Os personagens já importados continuam no acervo.")) {
      return;
    }
    const res = await fetch("/api/drive/disconnect", { method: "DELETE" });
    if (res.ok) {
      toast.success("Google Drive desconectado");
      loadStatus();
    } else {
      toast.error("Erro ao desconectar");
    }
  }

  if (!isCoordPlus || !status) return null;

  // Credenciais ausentes no servidor.
  if (!status.configured) {
    return isAdmin ? (
      <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-500/80">
        <AlertTriangle className="h-3.5 w-3.5" />
        Drive não configurado no servidor
      </div>
    ) : null;
  }

  // Não conectado → botão conectar (só admin conecta a conta-fonte).
  if (!status.connected) {
    return isAdmin ? (
      <Button
        variant="secondary"
        data-tour="drive-sync"
        onClick={() => (window.location.href = "/api/drive/auth")}
      >
        <HardDriveDownload className="h-3.5 w-3.5" />
        Conectar Google Drive
      </Button>
    ) : null;
  }

  // Conectado → painel de sync.
  const pct =
    progress?.total && progress.total > 0
      ? Math.round(((progress.processed ?? 0) / progress.total) * 100)
      : null;

  return (
    <div className="flex items-center gap-2 flex-wrap" data-tour="drive-sync">
      {syncing && progress ? (
        <div className="flex items-center gap-2.5 min-w-[220px]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[oklch(0.72_0.13_158)]" />
          <div className="flex-1 min-w-[140px]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                {progress.current || progress.message || "Sincronizando…"}
              </span>
              {pct !== null && (
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60">
                  {pct}%
                </span>
              )}
            </div>
            <div className="h-1 rounded-full bg-[oklch(0.26_0.016_170)] overflow-hidden">
              <div
                className="h-full bg-[oklch(0.62_0.14_158)] transition-[width] duration-300"
                style={{ width: pct !== null ? `${pct}%` : "30%" }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-[oklch(0.72_0.13_158)]" />
              {status.accountEmail || "Drive conectado"}
            </span>
            {status.lastSyncedAt && (
              <span className="text-[10px] text-muted-foreground/50">
                sync {formatDistanceToNow(new Date(status.lastSyncedAt), { locale: ptBR, addSuffix: true })}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground border border-border hover:border-[oklch(0.34_0.018_170)] transition-colors"
            title="Escolher pasta-raiz do acervo"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">{status.rootFolderName || "Todo o Drive"}</span>
          </button>

          <Button onClick={handleSync}>
            <RefreshCw className="h-3.5 w-3.5" />
            Sincronizar
          </Button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Desconectar Google Drive"
            >
              <Link2Off className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}

      <FolderPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentRootName={status.rootFolderName}
        onPicked={() => {
          setPickerOpen(false);
          loadStatus();
        }}
      />
    </div>
  );
}

// ── FolderPicker ────────────────────────────────────────────────────

interface DriveFolder {
  id: string;
  name: string;
}

function FolderPicker({
  open,
  onOpenChange,
  currentRootName,
  onPicked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentRootName: string | null;
  onPicked: () => void;
}) {
  const [stack, setStack] = useState<DriveFolder[]>([]); // breadcrumb (id/name)
  const [folders, setFolders] = useState<DriveFolder[] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (parentId: string) => {
    setFolders(null);
    const res = await fetch(`/api/drive/folders?parentId=${encodeURIComponent(parentId)}`);
    setFolders(res.ok ? await res.json() : []);
  }, []);

  useEffect(() => {
    if (open) {
      setStack([]);
      load("root");
    }
  }, [open, load]);

  function enter(folder: DriveFolder) {
    const next = [...stack, folder];
    setStack(next);
    load(folder.id);
  }

  function goTo(index: number) {
    // index -1 = raiz
    const next = stack.slice(0, index + 1);
    setStack(next);
    load(index < 0 ? "root" : next[next.length - 1].id);
  }

  async function setRoot(folderId: string | null, folderName?: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/drive/root", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, folderName }),
      });
      if (!res.ok) throw new Error();
      toast.success(folderId ? `Pasta-raiz: ${folderName}` : "Usando todo o Drive");
      onPicked();
    } catch {
      toast.error("Erro ao definir pasta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pasta-raiz do acervo</DialogTitle>
          <DialogDescription>
            Escolha a pasta do Drive de onde os personagens serão importados. As subpastas viram
            personagens e categorias.
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-[11px] flex-wrap">
          <button
            onClick={() => goTo(-1)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <HardDriveDownload className="h-3 w-3" /> Meu Drive
          </button>
          {stack.map((f, i) => (
            <span key={f.id} className="inline-flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              <button
                onClick={() => goTo(i)}
                className="px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground max-w-[120px] truncate"
              >
                {f.name}
              </button>
            </span>
          ))}
        </div>

        {/* Lista de pastas */}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
          {folders === null ? (
            <div className="p-6 text-center text-muted-foreground text-xs">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : folders.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-xs">
              Nenhuma subpasta aqui
            </div>
          ) : (
            folders.map((f) => (
              <button
                key={f.id}
                onClick={() => enter(f)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-muted transition-colors"
              >
                <Folder className="h-4 w-4 text-[oklch(0.72_0.13_158)] shrink-0" />
                <span className="flex-1 truncate">{f.name}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground">
            Atual: <strong className="text-foreground">{currentRootName || "Todo o Drive"}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setRoot(null)} loading={saving}>
              Todo o Drive
            </Button>
            <Button
              onClick={() => {
                const cur = stack[stack.length - 1];
                if (cur) setRoot(cur.id, cur.name);
                else setRoot(null);
              }}
              loading={saving}
              disabled={stack.length === 0}
            >
              Usar esta pasta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
