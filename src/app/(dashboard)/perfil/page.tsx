"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Save, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, Card, Input, Badge, Avatar, Field, PageHeader } from "@/components/v2/primitives";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", coordenador: "Coordenador", roteirista: "Roteirista", membro: "Membro",
};

const ROLE_TONE: Record<string, "danger" | "info" | "violet" | "neutral"> = {
  admin: "danger",
  coordenador: "info",
  roteirista: "violet",
  membro: "neutral",
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

      <Card className="overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-7">
            <Avatar name={userData.name} size="xl" status="online" />
            <div className="min-w-0">
              <p className="font-heading text-xl font-semibold leading-tight">{userData.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge tone={ROLE_TONE[userData.role] || "neutral"}>{ROLE_LABELS[userData.role]}</Badge>
                {userData.skills?.map((s: string) => (
                  <Badge key={s} tone="neutral">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Usuário" hint="Não pode ser alterado">
              <Input value={userData.username} disabled className="font-mono" />
            </Field>
            <Field label="Nova senha" hint="Deixe em branco para manter a atual">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {password && (
              <Field label="Confirmar senha">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-border bg-[oklch(0.205_0.016_172)]">
          <Button onClick={handleSave} size="lg" className="w-full" loading={saving}>
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
