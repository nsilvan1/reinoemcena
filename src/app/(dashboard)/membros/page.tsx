"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Users, Mic, Film } from "lucide-react";
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
  KpiInline,
  KpiDivider,
} from "@/components/v2/primitives";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coordenador: "Coordenador",
  roteirista: "Roteirista",
  membro: "Membro",
};

const ROLE_TONE: Record<string, "danger" | "info" | "violet" | "neutral"> = {
  admin: "danger",
  coordenador: "info",
  roteirista: "violet",
  membro: "neutral",
};

type User = {
  _id: string;
  name: string;
  username: string;
  role: string;
  skills?: string[];
  managedBy?: { _id: string; name: string } | null;
};

export default function MembrosPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "membro",
    skills: [] as string[],
  });

  const role = (session?.user as { role?: string })?.role;
  const sessionId = (session?.user as { id?: string })?.id;

  useEffect(() => {
    fetchUsers();
  }, []);

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
      name: user.name,
      username: user.username,
      password: "",
      role: user.role,
      skills: user.skills || [],
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
      const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        name: form.name,
        role: form.role,
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
        <div className="h-64 skeleton rounded-lg" />
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

  const isAdmin = role === "admin";
  const canManage = ["admin", "coordenador"].includes(role || "");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Membros"
        description="Voluntários e gestores do ministério"
        icon={Users}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Novo membro
            </Button>
          ) : undefined
        }
        meta={
          users.length > 0 ? (
            <div className="flex items-center gap-4 flex-wrap">
              <KpiInline value={users.length} label="total" tone="muted" />
              {(["admin", "coordenador", "roteirista", "membro"] as const).map((r) =>
                counts[r] ? (
                  <span key={r} className="flex items-center gap-4">
                    <KpiDivider />
                    <KpiInline
                      value={counts[r]}
                      label={r + (counts[r] > 1 ? "s" : "")}
                      tone={
                        r === "admin"
                          ? "danger"
                          : r === "coordenador"
                          ? "info"
                          : r === "roteirista"
                          ? "violet"
                          : "muted"
                      }
                    />
                  </span>
                ) : null
              )}
              {skillCounts["narrador"] || skillCounts["editor"] ? (
                <>
                  <KpiDivider />
                  {skillCounts["narrador"] ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70">
                      <Mic className="h-3 w-3" />
                      {skillCounts["narrador"]} narradores
                    </span>
                  ) : null}
                  {skillCounts["editor"] ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70">
                      <Film className="h-3 w-3" />
                      {skillCounts["editor"]} editores
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : undefined
        }
      />

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
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">{editingUser ? "Salvar" : "Criar membro"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
      ) : (
        <Card className="overflow-hidden animate-in-view">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="pl-5 pr-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.20em] text-muted-foreground/50 font-normal">
                    Membro
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.20em] text-muted-foreground/50 font-normal">
                    Papel
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.20em] text-muted-foreground/50 font-normal hidden md:table-cell">
                    Habilidades
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.20em] text-muted-foreground/50 font-normal hidden lg:table-cell">
                    Gestor
                  </th>
                  <th className="px-3 pr-5 py-2.5 w-20" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u._id}
                    className="border-t border-border/40 hover:bg-[oklch(0.225_0.016_172)] transition-colors group"
                  >
                    {/* Membro: avatar + nome + username */}
                    <td className="pl-5 pr-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-[13px] leading-tight truncate">
                            {u.name}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground/55 leading-tight mt-0.5 truncate">
                            @{u.username}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Papel */}
                    <td className="px-3 py-3">
                      <Badge tone={ROLE_TONE[u.role] || "neutral"}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>

                    {/* Habilidades */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {u.skills?.length ? (
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
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground/25">—</span>
                        )}
                      </div>
                    </td>

                    {/* Gestor */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {u.managedBy ? (
                        <span className="text-[12px] text-muted-foreground/70">
                          {u.managedBy.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/25">—</span>
                      )}
                    </td>

                    {/* Ações — visíveis só no hover */}
                    <td className="px-3 pr-5 py-3">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {canManage && (
                          <button
                            onClick={() => openEdit(u)}
                            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && u._id !== sessionId && (
                          <button
                            onClick={() => handleDelete(u._id)}
                            className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
