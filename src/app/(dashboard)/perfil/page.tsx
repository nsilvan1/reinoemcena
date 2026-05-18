"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Save,
  UserCircle,
  Lock,
  Sliders,
  LogOut,
  Mic,
  Film,
  CheckSquare,
  Square,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, Badge, Button, Card, Field, Input } from "@/components/v2/primitives";

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrador",
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

type UserData = {
  _id: string;
  name: string;
  username: string;
  role: string;
  skills?: string[];
  createdAt?: string;
  _completedTasksCount?: number;
  _activeScalesCount?: number;
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-6 border-b border-border/50 last:border-0">
      <div className="flex items-start gap-3 mb-5">
        <span className="h-8 w-8 rounded-md bg-[oklch(0.22_0.030_158)] inline-flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-3.5 w-3.5 text-[oklch(0.82_0.14_158)]" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-[14px] font-semibold leading-tight">{title}</h2>
          {description && (
            <p className="text-[12px] text-muted-foreground/70 mt-0.5 leading-snug">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4 pl-11">{children}</div>
    </section>
  );
}

// ─── Identity card ────────────────────────────────────────────────────────────

function IdentityCard({ userData }: { userData: UserData }) {
  return (
    <Card elevated className="overflow-hidden sticky top-6 animate-in-view stagger-1">
      {/* Gradient header strip */}
      <div
        className="h-20 w-full"
        style={{
          background: "linear-gradient(135deg, oklch(0.22 0.040 158), oklch(0.16 0.020 172))",
        }}
      />

      <div className="px-5 pb-6 -mt-10">
        {/* Avatar */}
        <div className="mb-4">
          <Avatar name={userData.name} size="2xl" status="online" />
        </div>

        <h2 className="text-[17px] font-semibold leading-tight">{userData.name}</h2>
        <p className="font-mono text-[12px] text-muted-foreground/60 mt-0.5">
          @{userData.username}
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge tone={ROLE_TONE[userData.role] || "neutral"}>
            {ROLE_LABELS[userData.role]}
          </Badge>
          {userData.skills?.map((s) => (
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
          ))}
        </div>

        {userData.createdAt && (
          <p className="text-[11px] text-muted-foreground/50 mt-4">
            Membro desde{" "}
            {format(new Date(userData.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        )}

        {/* Mini KPIs */}
        {(userData._completedTasksCount !== undefined ||
          userData._activeScalesCount  !== undefined) && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            {userData._completedTasksCount !== undefined && (
              <div className="rounded-md bg-[oklch(0.215_0.014_172)] p-3 text-center group hover:bg-[oklch(0.235_0.016_172)] transition-colors">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="h-3 w-3 text-[oklch(0.74_0.16_158)]" strokeWidth={2} />
                </div>
                <p className="text-[20px] font-semibold tabular-nums text-[oklch(0.82_0.14_158)]">
                  {userData._completedTasksCount}
                </p>
                <p className="text-[10px] text-muted-foreground/55 mt-0.5">entregas</p>
              </div>
            )}
            {userData._activeScalesCount !== undefined && (
              <div className="rounded-md bg-[oklch(0.215_0.014_172)] p-3 text-center group hover:bg-[oklch(0.235_0.016_172)] transition-colors">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CalendarDays className="h-3 w-3 text-[oklch(0.85_0.14_220)]" strokeWidth={2} />
                </div>
                <p className="text-[20px] font-semibold tabular-nums text-[oklch(0.85_0.14_220)]">
                  {userData._activeScalesCount}
                </p>
                <p className="text-[10px] text-muted-foreground/55 mt-0.5">escalas ativas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);

  const [name,            setName]            = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [skills,          setSkills]          = useState<string[]>([]);
  const [savingAccount,   setSavingAccount]   = useState(false);
  const [savingPassword,  setSavingPassword]  = useState(false);
  const [savingSkills,    setSavingSkills]    = useState(false);

  const userId = (session?.user as { id?: string })?.id;

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: UserData) => {
        setUserData(data);
        setName(data.name);
        setSkills(data.skills || []);
      })
      .catch(() => toast.error("Erro ao carregar perfil"));
  }, [userId]);

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Nome atualizado!");
      await update({ name });
      setUserData((prev) => (prev ? { ...prev, name } : prev));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Senha atualizada!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar senha");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveSkills() {
    setSavingSkills(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ skills }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Habilidades atualizadas!");
      setUserData((prev) => (prev ? { ...prev, skills } : prev));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingSkills(false);
    }
  }

  if (!userData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        <div className="h-80 skeleton rounded-xl" />
        <div className="lg:col-span-2 h-96 skeleton rounded-xl" />
      </div>
    );
  }

  const passwordValid = password.length >= 1 && confirmPassword.length >= 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">

      {/* ── Col esquerda: identidade ─────────────────────────────────── */}
      <aside className="lg:col-span-1">
        <IdentityCard userData={userData} />
      </aside>

      {/* ── Col direita: formulários ──────────────────────────────────── */}
      <div
        className={cn(
          "lg:col-span-2 rounded-xl border border-border bg-card divide-y divide-border/50 overflow-hidden",
          "animate-in-view stagger-2 surface-elevated"
        )}
      >
        {/* Section: Conta */}
        <form onSubmit={handleSaveAccount}>
          <div className="p-6">
            <Section
              icon={UserCircle}
              title="Conta"
              description="Seu nome público exibido para a equipe"
            >
              <Field label="Nome">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Usuário" hint="Não pode ser alterado">
                <Input
                  value={userData.username}
                  disabled
                  className="font-mono opacity-60"
                />
              </Field>
            </Section>
          </div>
          <div className="px-6 py-3 bg-[oklch(0.18_0.014_172)] flex justify-end">
            <Button type="submit" size="sm" loading={savingAccount}>
              <Save className="h-3.5 w-3.5" />
              {savingAccount ? "Salvando..." : "Salvar nome"}
            </Button>
          </div>
        </form>

        {/* Section: Senha */}
        <form onSubmit={handleSavePassword}>
          <div className="p-6">
            <Section
              icon={Lock}
              title="Senha"
              description="Altere sua senha de acesso. Use ao menos 6 caracteres."
            >
              <Field label="Nova senha">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
              <Field
                label="Confirmar nova senha"
                error={
                  confirmPassword && password !== confirmPassword
                    ? "As senhas não coincidem"
                    : undefined
                }
              >
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
            </Section>
          </div>
          <div className="px-6 py-3 bg-[oklch(0.18_0.014_172)] flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!passwordValid || password !== confirmPassword}
              loading={savingPassword}
            >
              <Lock className="h-3.5 w-3.5" />
              {savingPassword ? "Atualizando..." : "Atualizar senha"}
            </Button>
          </div>
        </form>

        {/* Section: Habilidades */}
        <div>
          <div className="p-6">
            <Section
              icon={Sliders}
              title="Habilidades"
              description="As funções que você pode exercer nas produções"
            >
              <div className="flex flex-col gap-3">
                {(["narrador", "editor"] as const).map((skill) => {
                  const active = skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors min-h-[64px]",
                        active
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-[oklch(0.225_0.014_172)] hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "h-8 w-8 rounded-md inline-flex items-center justify-center shrink-0",
                          active
                            ? skill === "narrador"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-violet-500/20 text-violet-400"
                            : "bg-[oklch(0.215_0.014_172)] text-muted-foreground"
                        )}
                      >
                        {skill === "narrador" ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <Film className="h-4 w-4" />
                        )}
                      </span>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium leading-tight capitalize">
                          {skill === "narrador" ? "Narrador" : "Editor"}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {skill === "narrador"
                            ? "Grava a narração dos episódios"
                            : "Edita e finaliza o vídeo"}
                        </p>
                      </div>
                      {active ? (
                        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>
          </div>
          <div className="px-6 py-3 bg-[oklch(0.18_0.014_172)] flex justify-end">
            <Button size="sm" onClick={handleSaveSkills} loading={savingSkills}>
              <Save className="h-3.5 w-3.5" />
              {savingSkills ? "Salvando..." : "Salvar habilidades"}
            </Button>
          </div>
        </div>

        {/* Section: Sessão */}
        <div className="p-6">
          <Section
            icon={LogOut}
            title="Sessão"
            description="Encerrar a sessão atual neste dispositivo"
          >
            <Button
              variant="destructive"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da conta
            </Button>
          </Section>
        </div>
      </div>
    </div>
  );
}
