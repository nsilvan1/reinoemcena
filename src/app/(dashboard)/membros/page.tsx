"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Pencil,
  Users,
  Mic,
  Film,
  Crown,
  Sparkles,
  User,
  Activity,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Button,
  Card,
  Input,
  Badge,
  Avatar,
  PageHeader,
  EmptyState,
  Stat,
} from "@/components/v2/primitives";

const ROLE_LABELS: Record<string, string> = {
  admin:       "Admin",
  coordenador: "Coordenador",
  roteirista:  "Roteirista",
  membro:      "Membro",
};

const ROLE_TONE: Record<string, "danger" | "info" | "violet" | "neutral"> = {
  admin:       "danger",
  coordenador: "info",
  roteirista:  "violet",
  membro:      "neutral",
};

type User = {
  _id: string;
  name: string;
  username: string;
  role: string;
  skills?: string[];
  managedBy?: { _id: string; name: string } | null;
};

// ─── Member Card ─────────────────────────────────────────────────────

function MemberCard({
  user,
  canManage,
  isAdmin,
  sessionId,
  onEdit,
  onDelete,
  staggerClass,
}: {
  user: User;
  canManage: boolean;
  isAdmin: boolean;
  sessionId?: string;
  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
  staggerClass: string;
}) {
  return (
    <Card
      interactive
      elevated
      className={cn(
        "p-4 sm:p-5 flex flex-col gap-4 animate-in-view hover-lift",
        staggerClass
      )}
    >
      {/* Top: avatar + name + actions */}
      <div className="flex items-start gap-3">
        <Avatar name={user.name} size="lg" />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] leading-tight tracking-[-0.01em] truncate">
            {user.name}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/55 mt-0.5 truncate">
            @{user.username}
          </p>
          {user.managedBy?.name && (
            <p className="text-[10px] text-muted-foreground/40 mt-1 truncate">
              Gestor: {user.managedBy.name}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          {canManage && (
            <button
              onClick={() => onEdit(user)}
              className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {isAdmin && user._id !== sessionId && (
            <button
              onClick={() => onDelete(user._id)}
              className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Remover"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom: role badge + skill chips */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/30">
        <Badge tone={ROLE_TONE[user.role] || "neutral"}>
          {ROLE_LABELS[user.role]}
        </Badge>

        {user.skills?.map((s) => (
          <span
            key={s}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
              s === "narrador"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-violet-500/15 text-violet-400"
            )}
          >
            {s === "narrador" ? (
              <Mic className="h-2.5 w-2.5" />
            ) : (
              <Film className="h-2.5 w-2.5" />
            )}
            {s === "narrador" ? "Narrador" : "Editor"}
          </span>
        ))}

        {(!user.skills || user.skills.length === 0) && (
          <span className="text-[10px] text-muted-foreground/30">sem habilidades</span>
        )}
      </div>
    </Card>
  );
}

// ─── Members Table (dense) ───────────────────────────────────────────

function MembersTable({
  users,
  canManage,
  isAdmin,
  sessionId,
  onEdit,
  onDelete,
}: {
  users: User[];
  canManage: boolean;
  isAdmin: boolean;
  sessionId?: string;
  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card elevated className="overflow-hidden animate-in-view stagger-5">
      <div className="max-h-[65vh] overflow-y-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[oklch(0.215_0.014_172)] backdrop-blur-sm">
            <tr className="border-b border-border/40 text-left">
              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Membro
              </th>
              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Papel
              </th>
              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hidden sm:table-cell">
                Habilidades
              </th>
              <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hidden lg:table-cell">
                Gestor
              </th>
              {(canManage || isAdmin) && (
                <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider text-right">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr
                key={u._id}
                className={cn(
                  "border-b border-border/30 last:border-0 hover:bg-[oklch(0.225_0.018_172)] transition-colors",
                  idx < 12 && `animate-in-view stagger-${(idx % 12) + 1}`
                )}
              >
                {/* Membro: avatar + nome + @username */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[13px] truncate leading-tight">
                        {u.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground/55 truncate">
                        @{u.username}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Papel */}
                <td className="px-4 py-2.5">
                  <Badge tone={ROLE_TONE[u.role] || "neutral"}>
                    {ROLE_LABELS[u.role]}
                  </Badge>
                </td>

                {/* Habilidades */}
                <td className="px-4 py-2.5 hidden sm:table-cell">
                  <div className="flex items-center gap-1 flex-wrap">
                    {u.skills && u.skills.length > 0 ? (
                      u.skills.map((s) => (
                        <span
                          key={s}
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                            s === "narrador"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-violet-500/15 text-violet-400"
                          )}
                        >
                          {s === "narrador" ? (
                            <Mic className="h-2.5 w-2.5" />
                          ) : (
                            <Film className="h-2.5 w-2.5" />
                          )}
                          {s === "narrador" ? "Narrador" : "Editor"}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground/30">—</span>
                    )}
                  </div>
                </td>

                {/* Gestor */}
                <td className="px-4 py-2.5 hidden lg:table-cell">
                  {u.managedBy?.name ? (
                    <span className="text-[12px] text-muted-foreground/75 truncate inline-flex items-center gap-1.5">
                      <Avatar name={u.managedBy.name} size="xs" />
                      {u.managedBy.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/25">—</span>
                  )}
                </td>

                {/* Ações */}
                {(canManage || isAdmin) && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      {canManage && (
                        <button
                          onClick={() => onEdit(u)}
                          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isAdmin && u._id !== sessionId && (
                        <button
                          onClick={() => onDelete(u._id)}
                          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── View toggle (table | cards) ─────────────────────────────────────

type ViewMode = "table" | "cards";

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex items-center bg-[oklch(0.205_0.016_172)] border border-border rounded-md p-0.5"
      role="tablist"
      aria-label="Modo de visualização"
    >
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-pressed={view === "table"}
        className={cn(
          "h-7 px-2 rounded inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors",
          view === "table"
            ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)]"
            : "text-muted-foreground/60 hover:text-foreground"
        )}
        title="Tabela"
      >
        <Rows3 className="h-3 w-3" />
        Tabela
      </button>
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-pressed={view === "cards"}
        className={cn(
          "h-7 px-2 rounded inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors",
          view === "cards"
            ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)]"
            : "text-muted-foreground/60 hover:text-foreground"
        )}
        title="Cards"
      >
        <LayoutGrid className="h-3 w-3" />
        Cards
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function MembrosPage() {
  const { data: session } = useSession();
  const [users,       setUsers]       = useState<User[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const [form, setForm] = useState({
    name:     "",
    username: "",
    password: "",
    role:     "membro",
    skills:   [] as string[],
  });

  const role      = (session?.user as { role?: string })?.role;
  const sessionId = (session?.user as { id?: string })?.id;

  useEffect(() => {
    fetchUsers();
    // Restaura preferência de visualização
    try {
      const saved = localStorage.getItem("reinoemcena.membros.view");
      if (saved === "table" || saved === "cards") setView(saved);
    } catch {
      /* localStorage indisponível */
    }
  }, []);

  function changeView(v: ViewMode) {
    setView(v);
    try {
      localStorage.setItem("reinoemcena.membros.view", v);
    } catch {
      /* ignore */
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setForm({ name: "", username: "", password: "", role: "membro", skills: [] });
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      name:     user.name,
      username: user.username,
      password: "",
      role:     user.role,
      skills:   user.skills || [],
    });
    setDialogOpen(true);
  }

  function toggleSkill(skill: string) {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url    = editingUser ? `/api/users/${editingUser._id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        name:   form.name,
        role:   form.role,
        skills: form.skills,
      };
      if (!editingUser) {
        body.username = form.username;
        body.password = form.password;
      }
      if (form.password && editingUser) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editingUser ? "Membro atualizado!" : "Membro criado!");
      setDialogOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Remover este membro permanentemente?")) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Membro removido.");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 skeleton rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // KPI aggregates
  const counts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const skillCounts = users.reduce<Record<string, number>>((acc, u) => {
    (u.skills || []).forEach((s) => {
      acc[s] = (acc[s] || 0) + 1;
    });
    return acc;
  }, {});

  const totalSkillUsers = users.filter((u) => u.skills && u.skills.length > 0).length;

  const isAdmin   = role === "admin";
  const canManage = ["admin", "coordenador"].includes(role || "");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Membros"
        description="Voluntários e gestores do ministério"
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            {users.length > 0 && <ViewToggle view={view} onChange={changeView} />}
            {canManage && (
              <Button onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Novo membro
              </Button>
            )}
          </div>
        }
      />

      {/* ── Stat strip ── */}
      {users.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat
            icon={Crown}
            label="Coordenadores"
            value={(counts["coordenador"] || 0) + (counts["admin"] || 0)}
            accent="info"
            animated
            className="animate-in-view stagger-1"
          />
          <Stat
            icon={Sparkles}
            label="Roteiristas"
            value={counts["roteirista"] || 0}
            accent="violet"
            animated
            className="animate-in-view stagger-2"
          />
          <Stat
            icon={User}
            label="Membros"
            value={counts["membro"] || 0}
            accent="primary"
            animated
            className="animate-in-view stagger-3"
          />
          <Stat
            icon={Activity}
            label="Com skills"
            value={totalSkillUsers}
            accent="warning"
            animated
            className="animate-in-view stagger-4"
          />
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Membro" : "Novo Membro"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Usuário</Label>
                  <Input
                    type="text"
                    placeholder="nome.usuario"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Senha</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
              </>
            )}
            {editingUser && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nova senha (opcional)</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Manter atual"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Papel</Label>
              <Select
                value={form.role}
                onValueChange={(v) => v && setForm({ ...form, role: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                  {isAdmin && <SelectItem value="coordenador">Coordenador</SelectItem>}
                  <SelectItem value="roteirista">Roteirista</SelectItem>
                  <SelectItem value="membro">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Habilidades</Label>
              <div className="flex gap-2">
                {["narrador", "editor"].map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors min-h-[36px]",
                      form.skills.includes(skill)
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "border-border text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    {skill === "narrador" ? (
                      <Mic className="h-3 w-3" />
                    ) : (
                      <Film className="h-3 w-3" />
                    )}
                    {skill === "narrador" ? "Narrador" : "Editor"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingUser ? "Salvar" : "Criar membro"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Content ── */}
      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro ainda"
          description="Cadastre os voluntários do ministério para começar a montar as escalas."
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro membro
              </Button>
            ) : undefined
          }
        />
      ) : view === "table" ? (
        <MembersTable
          users={users}
          canManage={canManage}
          isAdmin={isAdmin}
          sessionId={sessionId}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u, idx) => (
            <MemberCard
              key={u._id}
              user={u}
              canManage={canManage}
              isAdmin={isAdmin}
              sessionId={sessionId}
              onEdit={openEdit}
              onDelete={handleDelete}
              staggerClass={
                idx < 6
                  ? `stagger-${(idx % 6) + 1}`
                  : ""
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
