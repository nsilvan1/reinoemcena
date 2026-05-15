"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", coordenador: "Coordenador", roteirista: "Roteirista", membro: "Membro",
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-red-50 text-red-700", coordenador: "bg-blue-50 text-blue-700",
  roteirista: "bg-violet-50 text-violet-700", membro: "bg-gray-50 text-gray-600",
};

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const userId = (session?.user as any)?.id;

  useEffect(() => {
    if (userId) {
      fetch(`/api/users/${userId}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Falha ao carregar perfil"))))
        .then((data) => {
          setUserData(data);
          setName(data.name);
        })
        .catch(() => toast.error("Erro ao carregar perfil"));
    }
  }, [userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSaving(true);
    try {
      const body: any = { name };
      if (password) body.password = password;
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Perfil atualizado!");
      setPassword("");
      setConfirmPassword("");
      await update({ name });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  if (!userData)
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="h-24 skeleton rounded-2xl" />
        <div className="h-80 skeleton rounded-2xl" />
      </div>
    );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <PageHeader
        eyebrow="Conta"
        title="Meu perfil"
        description="Informações pessoais e credenciais"
        icon={UserCircle}
      />

      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/15 flex items-center justify-center text-xl font-bold text-primary shadow-sm">
              {userData.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-heading text-lg font-semibold leading-tight">{userData.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge className={cn("text-[10px] border-0 font-semibold uppercase tracking-wider", ROLE_STYLES[userData.role])}>
                  {ROLE_LABELS[userData.role]}
                </Badge>
                {userData.skills?.map((s: string) => (
                  <Badge key={s} variant="outline" className="text-[10px] capitalize bg-muted/40">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Usuário</Label>
              <Input value={userData.username} disabled className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Nova senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Manter atual"
              />
            </div>
            {password && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Confirmar senha</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </form>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t bg-muted/20">
          <Button onClick={handleSave} className="w-full h-10 shadow-sm shadow-primary/15" disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" /> {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
