"use client";
import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  PenLine,
  Mic,
  Film,
  CircleCheck,
} from "lucide-react";
import { Button, Card, Field, Input, Kbd } from "@/components/v2/primitives";

type Stage = "form" | "authenticating" | "welcome";
const REMEMBER_KEY = "reinoemcena.rememberUser";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [welcomeName, setWelcomeName] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    try {
      const r = localStorage.getItem(REMEMBER_KEY);
      if (r) {
        setUsername(r);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStage("authenticating");

    const result = await signIn("credentials", { username, password, redirect: false });

    if (result?.error) {
      setStage("form");
      setError("Usuário ou senha incorretos");
      return;
    }

    try {
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, username);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {}

    try {
      const s = await getSession();
      const name = s?.user?.name?.split(" ")[0] ?? "de volta";
      setWelcomeName(name);
    } catch {
      setWelcomeName("de volta");
    }
    setStage("welcome");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1300);
  }

  if (!mounted) return null;
  const isLoading = stage === "authenticating";
  const showWelcome = stage === "welcome";

  return (
    <div className="relative min-h-screen text-foreground">
      {/* Background */}
      <div className="absolute inset-0 ambient-shell">
        <div className="ambient-blob ambient-blob--1" />
        <div className="ambient-blob ambient-blob--2" />
        <div className="ambient-blob ambient-blob--3" />
        <div className="ambient-blob ambient-blob--4" />
        <div className="absolute inset-0 bg-grid-faint-animated opacity-60 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,black_20%,transparent_85%)]" />
      </div>

      {/* Brand */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="relative h-8 w-8 rounded-lg bg-[oklch(0.18_0.020_158)] border border-[oklch(0.28_0.040_158)] flex items-center justify-center">
            <Clapperboard className="h-4 w-4 text-[oklch(0.78_0.16_158)]" strokeWidth={2} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-background status-pulse" />
          </span>
          <span>
            <span className="block text-[13px] font-semibold leading-none tracking-tight">Reino em Cena</span>
            <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground/50 mt-1 block">
              v1.0 · Produção
            </span>
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/55">
          <Kbd>⏎</Kbd> entrar
        </span>
      </header>

      <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 py-20 sm:py-24" style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}>
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-center">
          {/* Hero */}
          <div className="hidden lg:block lg:col-span-3 animate-in-view">
            <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[oklch(0.78_0.16_158)] mb-6">
              Plataforma do Ministério
            </p>
            <h1 className="font-heading text-5xl xl:text-6xl font-semibold leading-[1.02] tracking-[-0.035em] text-gradient-mint max-w-lg">
              Produção de vídeos com propósito.
            </h1>
            <p className="text-muted-foreground/75 text-base leading-relaxed mt-6 max-w-md">
              Do roteiro ao vídeo final. Cada etapa organizada com seu time, seu acervo e seu ritmo.
            </p>

            {/* Pipeline */}
            <div className="mt-12 relative">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/50 mb-5">
                Fluxo de produção
              </p>
              <div className="relative">
                <span className="absolute top-5 left-2 right-2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { icon: PenLine, label: "Roteiro", color: "oklch(0.78 0.13 220)" },
                    { icon: Mic, label: "Gravação", color: "oklch(0.78 0.13 60)" },
                    { icon: Film, label: "Edição", color: "oklch(0.78 0.13 300)" },
                    { icon: Eye, label: "Revisão", color: "oklch(0.78 0.13 25)" },
                    { icon: CircleCheck, label: "Concluído", color: "oklch(0.78 0.13 158)" },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="flex flex-col items-center text-center">
                        <span
                          className="relative h-10 w-10 rounded-lg flex items-center justify-center border"
                          style={{
                            background: `oklch(0.21 0.018 172)`,
                            borderColor: `${s.color.replace("0.78", "0.30").replace("0.13", "0.04")}`,
                            animation: `glow-pulse 3s ease-in-out infinite`,
                            animationDelay: `${i * 0.4}s`,
                          }}
                        >
                          <Icon className="h-4 w-4" style={{ color: s.color }} strokeWidth={1.8} />
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-[0.18em] mt-3" style={{ color: s.color }}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 flex justify-center lg:justify-end animate-in-view stagger-1 w-full">
            <div className="w-full max-w-sm relative">
              <div className="lg:hidden text-center mb-8">
                <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-gradient-mint inline-block">
                  Reino em Cena
                </h1>
              </div>

              {showWelcome ? (
                <Card elevated className="p-8 sm:p-10 text-center">
                  <div className="relative inline-flex">
                    <span className="absolute inset-0 rounded-full bg-[oklch(0.55_0.18_158)] blur-2xl opacity-50 glow-pulse" />
                    <span className="relative h-14 w-14 rounded-full bg-gradient-to-br from-[oklch(0.55_0.18_158)] to-[oklch(0.40_0.16_158)] flex items-center justify-center shadow-2xl shadow-[oklch(0.55_0.18_158)]/40">
                      <Check className="h-6 w-6 text-white" strokeWidth={2.5} />
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl mt-5 font-semibold tracking-[-0.02em] text-gradient-mint">
                    Bem-vindo, {welcomeName}
                  </h2>
                  <p className="text-muted-foreground/65 text-[12.5px] mt-2 font-mono uppercase tracking-[0.18em]">
                    Carregando painel
                  </p>
                  <div className="mt-6 h-0.5 bg-[oklch(0.255_0.016_170)] rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-[oklch(0.55_0.18_158)] to-[oklch(0.75_0.16_158)] animate-pulse" />
                  </div>
                </Card>
              ) : (
                <Card elevated className="p-6 sm:p-7">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-[oklch(0.78_0.16_158)]">
                    Entrar
                  </p>
                  <h2 className="font-heading text-2xl font-semibold tracking-[-0.02em] mt-1">
                    Acesse sua conta
                  </h2>
                  <p className="text-muted-foreground/65 text-[12.5px] mt-1.5">
                    Use seu usuário e senha
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                    {error && (
                      <div className="bg-[oklch(0.22_0.030_25)] border border-[oklch(0.30_0.060_25)] rounded-lg px-3 py-2.5 text-[12px] text-[oklch(0.85_0.16_25)] flex items-center gap-2 animate-in-view">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 status-pulse" />
                        {error}
                      </div>
                    )}

                    <Field label="Usuário">
                      <Input
                        type="text"
                        placeholder="seu.usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="username"
                      />
                    </Field>

                    <Field label="Senha">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="current-password"
                        trailing={
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                            disabled={isLoading}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-[oklch(0.255_0.016_170)] transition-colors"
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showPassword ? (
                              <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} />
                            ) : (
                              <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                            )}
                          </button>
                        }
                      />
                    </Field>

                    <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1 group/r">
                      <span className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={isLoading}
                          className="peer sr-only"
                        />
                        <span
                          className={`h-4 w-4 rounded-md border transition-all flex items-center justify-center ${
                            rememberMe
                              ? "bg-[oklch(0.45_0.16_158)] border-[oklch(0.60_0.16_158)] shadow-[0_0_10px_oklch(0.55_0.18_158_/_0.4)]"
                              : "bg-[oklch(0.205_0.016_172)] border-border group-hover/r:border-[oklch(0.34_0.018_170)]"
                          }`}
                        >
                          {rememberMe && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </span>
                      </span>
                      <span className="text-[12px] text-muted-foreground group-hover/r:text-foreground transition-colors">
                        Lembrar usuário neste dispositivo
                      </span>
                    </label>

                    <Button type="submit" size="lg" className="w-full mt-1" loading={isLoading}>
                      {isLoading ? "Autenticando…" : (
                        <>
                          Entrar
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </Button>
                  </form>
                </Card>
              )}

              <p className="text-center text-muted-foreground/40 text-[10px] font-mono uppercase tracking-[0.22em] mt-6">
                Reino em Cena
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
