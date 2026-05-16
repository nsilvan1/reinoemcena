"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, Card, Input, Badge, Avatar, PageHeader, EmptyState } from "@/components/v2/primitives";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", coordenador: "Coordenador", roteirista: "Roteirista", membro: "Membro",
};

const ROLE_TONE: Record<string, "danger" | "info" | "violet" | "neutral"> = {
  admin: "danger",
  coordenador: "info",
  roteirista: "violet",
  membro: "neutral",
};

export default function MembrosPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "membro", skills: [] as string[] });

  const role = (session?.user as any)?.role;

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally { setLoading(false); }
  }

  function openCreate() {
    setEditingUser(null);
    setForm({ name: "", username: "", password: "", role: "membro", skills: [] });
    setDialogOpen(true);
  }

  function openEdit(user: any) {
    setEditingUser(user);
    setForm({ name: user.name, username: user.username, password: "", role: user.role, skills: user.skills || [] });
    setDialogOpen(true);
  }

  function toggleSkill(skill: string) {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body: any = { name: form.name, role: form.role, skills: form.skills };
      if (!editingUser) { body.username = form.username; body.password = form.password; }
      if (form.password && editingUser) body.password = form.password;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editingUser ? "Atualizado!" : "Criado!");
      setDialogOpen(false);
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Remover este membro?")) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Removido!");
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 skeleton rounded-md" />
        <div className="h-64 skeleton rounded-lg" />
      </div>
    );
  }

  const counts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Membros"
        description="Todos os voluntários e gestores do ministério"
        icon={Users}
        actions={
          ["admin", "coordenador"].includes(role) && (
            <Button onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Novo membro
            </Button>
          )
        }
        meta={
          users.length > 0 && (
            <div className="flex items-center gap-6 text-[12px] flex-wrap">
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold tabular-nums">{users.length}</span>
                <span className="text-muted-foreground/65 font-mono uppercase tracking-[0.18em] text-[10px]">no total</span>
              </span>
              {(["admin", "coordenador", "roteirista", "membro"] as const).map((r) =>
                counts[r] ? (
                  <span key={r} className="flex items-baseline gap-1.5">
                    <span className="h-3 w-px bg-border" />
                    <span className="font-heading text-xl font-semibold tabular-nums">{counts[r]}</span>
                    <span className="text-muted-foreground/65 font-mono uppercase tracking-[0.18em] text-[10px]">{r}{counts[r] > 1 ? "s" : ""}</span>
                  </span>
                ) : null
              )}
            </div>
          )
        }
      />

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Membro" : "Novo Membro"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-9" />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Usuário</Label>
                  <Input type="text" placeholder="nome.usuario" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Senha</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="h-9" />
                </div>
              </>
            )}
            {editingUser && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nova Senha (opcional)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Manter atual" className="h-9" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Papel</Label>
              <Select value={form.role} onValueChange={(v) => v && setForm({ ...form, role: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {role === "admin" && <SelectItem value="admin">Admin</SelectItem>}
                  {role === "admin" && <SelectItem value="coordenador">Coordenador</SelectItem>}
                  <SelectItem value="roteirista">Roteirista</SelectItem>
                  <SelectItem value="membro">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Habilidades</Label>
              <div className="flex gap-2">
                {["narrador", "editor"].map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                      form.skills.includes(skill) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                    )}
                  >
                    {skill === "narrador" ? "Narrador" : "Editor"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingUser ? "Salvar" : "Criar"}</Button>
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
            ["admin", "coordenador"].includes(role) && (
              <Button onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro membro
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden animate-in-view">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-[oklch(0.205_0.016_172)] border-b border-border">
                <th className="pl-6 pr-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">Membro</th>
                <th className="px-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 hidden sm:table-cell">Usuário</th>
                <th className="px-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">Papel</th>
                <th className="px-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 hidden md:table-cell">Habilidades</th>
                <th className="px-3 pr-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: { _id: string; name: string; username: string; role: string; skills?: string[] }) => (
                <tr key={u._id} className="border-t border-border/60 hover:bg-[oklch(0.225_0.016_172)] transition-colors group">
                  <td className="pl-6 pr-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="md" />
                      <span className="font-semibold">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-muted-foreground hidden sm:table-cell font-mono text-xs">{u.username}</td>
                  <td className="px-3 py-3.5">
                    <Badge tone={ROLE_TONE[u.role] || "neutral"}>{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className="px-3 py-3.5 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {u.skills?.length ? (
                        u.skills.map((s) => (
                          <Badge key={s} tone="neutral">
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground/30">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 pr-6 py-3.5">
                    <div className="flex gap-1 justify-end opacity-50 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {u._id !== (session?.user as { id?: string })?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(u._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
