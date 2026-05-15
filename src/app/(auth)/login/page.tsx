"use client";
import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  ArrowRight,
  User,
  Lock,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stage = "form" | "authenticating" | "welcome";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [welcomeName, setWelcomeName] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStage("authenticating");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setStage("form");
      setError("Usuário ou senha incorretos");
      return;
    }

    // Sucesso — animação de boas-vindas
    try {
      const session = await getSession();
      const name = session?.user?.name?.split(" ")[0] ?? "de volta";
      setWelcomeName(name);
    } catch {
      setWelcomeName("de volta");
    }
    setStage("welcome");
    // Aguarda animação completar antes de navegar
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1400);
  }

  if (!mounted) return null;

  const isLoading = stage === "authenticating";
  const showWelcome = stage === "welcome";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.09_0.015_158)]">
      {/* Background — dark forest gradient + radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.30_0.08_158_/_0.35),transparent_60%),radial-gradient(ellipse_60%_80%_at_100%_100%,oklch(0.40_0.10_158_/_0.18),transparent_60%),radial-gradient(ellipse_50%_70%_at_0%_100%,oklch(0.35_0.09_158_/_0.12),transparent_60%)]" />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-[15%] h-72 w-72 rounded-full bg-[oklch(0.65_0.13_158)] opacity-[0.08] blur-3xl orb-float-slow" />
      <div className="absolute bottom-1/4 right-[10%] h-96 w-96 rounded-full bg-[oklch(0.55_0.11_158)] opacity-[0.10] blur-3xl orb-float-fast" />
      <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.70_0.14_158)] opacity-[0.04] blur-3xl" />

      {/* Subtle grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0_/_0.018)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0_/_0.018)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Top brand strip */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl glass flex items-center justify-center relative">
            <Clapperboard className="h-4 w-4 text-[oklch(0.78_0.13_158)]" strokeWidth={2} />
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[oklch(0.09_0.015_158)] status-pulse" />
          </div>
          <div>
            <p className="font-heading text-sm text-white/90 leading-tight">Reino em Cena</p>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.18em] mt-0.5">Produção</p>
          </div>
        </div>
        <a
          href="#"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Sobre o projeto
        </a>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* LEFT — Hero */}
          <div className="hidden lg:block">
            <div className="max-w-md pop-in">
              <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[oklch(0.78_0.13_158)] mb-5">
                Plataforma do Ministério
              </p>
              <h1 className="font-heading text-5xl xl:text-6xl leading-[1.05] tracking-[-0.02em] text-gradient-shift">
                Produção de vídeos com propósito.
              </h1>
              <p className="text-white/55 text-base leading-relaxed mt-6 max-w-md">
                Do roteiro ao vídeo final — cada etapa organizada com seu time, seu acervo e seu ritmo.
              </p>

              {/* Pipeline animated */}
              <div className="mt-12 space-y-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
                  Fluxo de produção
                </p>
                <div className="relative">
                  {/* Background track */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/8 -translate-y-1/2" />
                  {/* Animated flowing light */}
                  <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 pipeline-line" />

                  <div className="relative grid grid-cols-5 gap-2">
                    {[
                      { label: "Roteiro" },
                      { label: "Gravação" },
                      { label: "Edição" },
                      { label: "Revisão" },
                      { label: "Concluído" },
                    ].map((step, i) => (
                      <div key={step.label} className="flex flex-col items-center text-center">
                        <div
                          className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.13_158)] pipeline-dot"
                          style={{ animationDelay: `${i * 0.7}s` }}
                        />
                        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/45 mt-3">
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm relative">
              {/* Mobile brand */}
              <div className="lg:hidden text-center mb-8">
                <h1 className="font-heading text-3xl text-gradient-shift inline-block">Reino em Cena</h1>
                <p className="text-white/40 text-xs mt-1.5 uppercase tracking-[0.22em] font-mono">
                  Produção de Vídeos
                </p>
              </div>

              {/* Welcome state */}
              {showWelcome && (
                <div className="glass rounded-3xl p-10 text-center welcome-in">
                  <div className="relative inline-flex">
                    <div className="absolute inset-0 rounded-full bg-[oklch(0.65_0.13_158)] blur-2xl opacity-50 status-pulse" />
                    <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-[oklch(0.55_0.13_158)] to-[oklch(0.65_0.13_158)] flex items-center justify-center shadow-2xl shadow-[oklch(0.55_0.13_158)]/40">
                      <Check className="h-7 w-7 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  <h2 className="font-heading text-2xl mt-6 text-gradient-shift">
                    Bem-vindo, {welcomeName}
                  </h2>
                  <p className="text-white/50 text-sm mt-2">Redirecionando ao painel…</p>
                  <div className="mt-6 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[oklch(0.65_0.13_158)] to-[oklch(0.78_0.13_158)] sweep-glow rounded-full" />
                  </div>
                </div>
              )}

              {/* Form */}
              {!showWelcome && (
                <div className={`glass rounded-3xl p-8 pop-in ${isLoading ? "form-out" : ""}`}>
                  <div className="mb-7">
                    <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[oklch(0.78_0.13_158)]">
                      Entrar
                    </p>
                    <h2 className="font-heading text-2xl text-white/95 mt-1.5 tracking-tight">
                      Acesse sua conta
                    </h2>
                    <p className="text-white/40 text-sm mt-1">
                      Use seu usuário e senha
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="bg-red-500/[0.08] text-red-300 text-xs px-3 py-2.5 rounded-xl border border-red-500/20 flex items-start gap-2 pop-in">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0 status-pulse" />
                        <span className="leading-relaxed">{error}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                        Usuário
                      </label>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 group-focus-within:text-[oklch(0.78_0.13_158)] transition-colors" strokeWidth={1.8} />
                        <Input
                          type="text"
                          placeholder="seu.usuario"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          disabled={isLoading}
                          autoComplete="username"
                          className="h-12 pl-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 focus:bg-white/[0.06] focus:border-[oklch(0.55_0.13_158)]/40 focus:ring-2 focus:ring-[oklch(0.55_0.13_158)]/15 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                        Senha
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 group-focus-within:text-[oklch(0.78_0.13_158)] transition-colors" strokeWidth={1.8} />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          autoComplete="current-password"
                          className="h-12 pl-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 focus:bg-white/[0.06] focus:border-[oklch(0.55_0.13_158)]/40 focus:ring-2 focus:ring-[oklch(0.55_0.13_158)]/15 rounded-xl"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 mt-2 bg-gradient-to-br from-[oklch(0.50_0.13_158)] to-[oklch(0.42_0.11_158)] hover:from-[oklch(0.55_0.13_158)] hover:to-[oklch(0.46_0.11_158)] text-white font-semibold rounded-xl shadow-lg shadow-[oklch(0.40_0.10_158)]/30 hover:shadow-[oklch(0.40_0.10_158)]/50 hover:-translate-y-0.5 transition-all group relative overflow-hidden"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                      <span className="relative flex items-center justify-center gap-2">
                        {isLoading ? (
                          <>
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Autenticando…
                          </>
                        ) : (
                          <>
                            Entrar
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </span>
                    </Button>
                  </form>
                </div>
              )}

              <p className="text-center text-white/20 text-[10px] mt-6 uppercase tracking-[0.18em] font-mono">
                Reino em Cena · v1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
