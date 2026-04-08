"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", coordenador: "Coordenador", roteirista: "Roteirista", membro: "Membro",
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-red-50 text-red-700 ring-1 ring-red-200",
  coordenador: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  roteirista: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  membro: "bg-gray-50 text-gray-600 ring-1 ring-gray-200",
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
        <div className="h-8 w-40 bg-muted animate-pulse rounded-md" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Membros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} cadastrados</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Novo Membro
        </Button>
      </div>

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
                  <Label className="text-xs font-medium">Usuario</Label>
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
        <div className="border rounded-lg p-16 text-center bg-card">
          <Users className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum membro</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left bg-muted/30">
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Membro</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Usuario</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Papel</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Habilidades</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.username}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-[10px] border-0", ROLE_STYLES[u.role])}>{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-1">
                      {u.skills?.map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {u._id !== (session?.user as any)?.id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(u._id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
