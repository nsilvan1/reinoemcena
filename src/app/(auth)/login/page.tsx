"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Clapperboard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (result?.error) setError("Usuário ou senha incorretos");
    else { router.push("/"); router.refresh(); }
  }

  if (!mounted) return null;

  return (
    <div className="grain min-h-screen flex bg-[oklch(0.13_0.016_158)]">
      {/* Left side — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.20_0.04_158)] via-[oklch(0.16_0.025_158)] to-[oklch(0.12_0.01_158)]" />
        {/* Decorative circles */}
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[oklch(0.25_0.04_158)] blur-3xl opacity-40" />
        <div className="absolute bottom-1/3 right-1/4 h-48 w-48 rounded-full bg-[oklch(0.30_0.05_158)] blur-3xl opacity-30" />
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-8">
            <Clapperboard className="h-8 w-8 text-[oklch(0.70_0.11_158)]" />
          </div>
          <h2 className="font-heading text-4xl text-white/90 leading-tight">
            Produção de<br />vídeos com<br /><span className="text-[oklch(0.70_0.11_158)]">propósito</span>
          </h2>
          <p className="text-white/30 text-sm mt-4 max-w-sm leading-relaxed">
            Gerencie escalas, roteiros e equipe em um só lugar. Do roteiro ao vídeo final, cada etapa organizada.
          </p>
          {/* Pipeline preview */}
          <div className="flex items-center gap-2 mt-8">
            {["Roteiro", "Gravação", "Edição", "Revisão", "Concluído"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${i < 3 ? "bg-[oklch(0.70_0.11_158)]" : "bg-white/10"}`} />
                <span className={`text-[10px] font-medium uppercase tracking-wider ${i < 3 ? "text-[oklch(0.70_0.11_158)]" : "text-white/15"}`}>
                  {step}
                </span>
                {i < 4 && <div className={`w-4 h-px ${i < 2 ? "bg-[oklch(0.70_0.11_158)]/40" : "bg-white/5"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-in-view">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex mb-4">
              <div className="h-14 w-14 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                <Clapperboard className="h-7 w-7 text-[oklch(0.70_0.11_158)]" />
              </div>
            </div>
            <h1 className="font-heading text-2xl text-white/90">Reino em Cena</h1>
            <p className="text-white/25 text-sm mt-1">Produção de Vídeos</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h1 className="font-heading text-2xl text-white/90">Entrar</h1>
            <p className="text-white/30 text-sm mt-1">Acesse sua conta para continuar</p>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 text-red-300 text-sm p-3 rounded-lg border border-red-500/15">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/40">Usuário</label>
                <Input
                  type="text"
                  placeholder="seu.usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:ring-[oklch(0.60_0.09_158)]/30 focus:border-[oklch(0.60_0.09_158)]/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/40">Senha</label>
                <Input
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:ring-[oklch(0.60_0.09_158)]/30 focus:border-[oklch(0.60_0.09_158)]/30"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[oklch(0.44_0.10_158)] hover:bg-[oklch(0.50_0.11_158)] text-white font-medium transition-all group"
              >
                {loading ? "Entrando..." : (
                  <span className="flex items-center gap-2">
                    Entrar
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-white/10 text-[11px] mt-8">
            Reino em Cena &middot; Gestão de Produção
          </p>
        </div>
      </div>
    </div>
  );
}
