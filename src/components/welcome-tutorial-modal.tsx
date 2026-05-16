"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  PenLine,
  Mic,
  Film,
  Eye,
  CircleCheck,
  Calendar,
  Images,
  Bell,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./v2/primitives";

const STORAGE_KEY = "reinoemcena.tutorial.v1";

// Helper exposto para reabrir o tutorial (botão na FAQ/perfil).
export function resetTutorial() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function hasSeenTutorial() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface Slide {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent: string; // OKLCH hue
  bullets?: string[];
  illustration?: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "Boas-vindas",
    title: "Reino em Cena",
    description:
      "Plataforma de produção de vídeos do ministério. Aqui você acompanha desde o roteiro até a entrega final, com seu time, seu acervo e seu ritmo.",
    icon: Clapperboard,
    accent: "158",
    bullets: [
      "Mobile-first — funciona como app (PWA)",
      "Cada papel vê só o que precisa fazer",
      "Notificações em tempo real",
    ],
  },
  {
    eyebrow: "Pipeline",
    title: "5 etapas, do roteiro ao concluído",
    description:
      "Cada semana percorre o mesmo fluxo. A fase avança automaticamente quando todos atribuídos terminam.",
    icon: Sparkles,
    accent: "158",
    illustration: <PipelineIllustration />,
  },
  {
    eyebrow: "Escalas",
    title: "A visão do mês",
    description:
      "Cada escala representa um mês. Dentro dela, semanas com tema, prazo e equipe. Abra uma semana para ver tudo: referências do acervo, painel da fase atual, equipe, chat e atividade.",
    icon: Calendar,
    accent: "220",
    bullets: [
      "Coordenadores criam a escala em /escalas/nova",
      "Atribuem roteiristas, narradores e editores por semana",
      "Cada papel só conclui quando entrega sua parte",
    ],
  },
  {
    eyebrow: "Acervo",
    title: "Banco visual da equipe",
    description:
      "Personagens (com galeria) e Histórias (cards) ficam vinculados às semanas. Filtre por trait, busque por nome, importe imagens novas direto pelo painel de edição.",
    icon: Images,
    accent: "300",
    bullets: [
      "Cards com chips clicáveis e ordenação A↔Z / Recentes",
      "Clique numa imagem → lightbox em tela cheia",
      "Imagens enviadas na fase de edição podem ir pro acervo",
    ],
  },
  {
    eyebrow: "Notificações",
    title: "Acompanhe o que importa",
    description:
      "Atribuições, mudanças de fase e revisões geram notificações. Polling a cada 30s mantém tudo em dia. O badge vermelho no sino mostra quantas não foram lidas.",
    icon: Bell,
    accent: "25",
    bullets: [
      "Tipos: escala, roteiro, status, revisão, geral",
      "Clique para ir direto ao item relacionado",
      "Marque como lido depois de ver",
    ],
  },
  {
    eyebrow: "Tudo certo",
    title: "Bora produzir",
    description:
      "Você está pronto. Se quiser revisar a qualquer momento, abra a página de Ajuda no menu lateral — ela tem o FAQ completo e este tutorial.",
    icon: CircleCheck,
    accent: "158",
    bullets: [
      "Atalhos: ⌘K (busca), G + tecla (navegar)",
      "Toque no avatar para editar seu perfil",
      "Dúvida? /ajuda tem respostas detalhadas",
    ],
  },
];

interface Props {
  /** Quando true, modal abre automaticamente se nunca foi visto */
  autoOpen?: boolean;
  /** Modal controlado externamente (FAQ → "ver tutorial") */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function WelcomeTutorialModal({ autoOpen, open: openProp, onOpenChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [dontShow, setDontShow] = useState(true);

  const isControlled = openProp !== undefined;
  const open = isControlled ? !!openProp : internalOpen;

  function setOpen(v: boolean) {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!autoOpen || !mounted) return;
    if (!hasSeenTutorial()) {
      const t = setTimeout(() => setInternalOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [autoOpen, mounted]);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, dontShow]);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function next() {
    if (index < SLIDES.length - 1) setIndex((i) => i + 1);
    else finish(true);
  }

  function prev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  function finish(persist: boolean) {
    if (persist && dontShow) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }
    setOpen(false);
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483600] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => finish(false)}
      />

      {/* modal */}
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-[oklch(0.30_0.016_170)] bg-[oklch(0.175_0.014_172)]">
        {/* close */}
        <button
          type="button"
          onClick={() => finish(false)}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white flex items-center justify-center transition-colors z-10"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* hero */}
        <div
          className="relative px-8 pt-9 pb-6 overflow-hidden"
          style={{
            background: `radial-gradient(120% 80% at 20% 0%, oklch(0.28 0.10 ${slide.accent} / 0.45), transparent 60%), linear-gradient(180deg, oklch(0.205 0.020 172), oklch(0.175 0.014 172))`,
          }}
        >
          <span
            className="absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-50"
            style={{ background: `oklch(0.55 0.18 ${slide.accent})` }}
          />
          <p
            className="relative text-[10px] font-mono uppercase tracking-[0.25em] mb-3"
            style={{ color: `oklch(0.80 0.14 ${slide.accent})` }}
          >
            {slide.eyebrow}
          </p>
          <div className="relative flex items-start gap-3 sm:gap-4">
            <span
              className="shrink-0 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center border"
              style={{
                background: `oklch(0.22 0.040 ${slide.accent})`,
                borderColor: `oklch(0.40 0.08 ${slide.accent})`,
              }}
            >
              <slide.icon
                className="h-6 w-6 sm:h-7 sm:w-7"
                style={{ color: `oklch(0.85 0.16 ${slide.accent})` }}
                strokeWidth={1.7}
              />
            </span>
            <div className="min-w-0">
              <h2 className="font-heading text-2xl sm:text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">
                {slide.title}
              </h2>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="px-8 py-6 space-y-4">
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {slide.description}
          </p>

          {slide.illustration && <div className="py-2">{slide.illustration}</div>}

          {slide.bullets && (
            <ul className="space-y-2 mt-1">
              {slide.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 text-[13px] text-foreground/90"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: `oklch(0.78 0.14 ${slide.accent})` }}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* footer */}
        <div className="px-8 py-5 border-t border-border bg-[oklch(0.16_0.014_172)]">
          {/* dots */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-6 bg-[oklch(0.78_0.16_158)]"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/55"
                )}
                aria-label={`Ir para o passo ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground/75 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-[oklch(0.74_0.16_158)]"
              />
              Não mostrar mais
            </label>

            <div className="flex items-center gap-2">
              {index > 0 && (
                <Button variant="ghost" size="sm" onClick={prev}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Voltar
                </Button>
              )}
              <Button size="sm" onClick={next}>
                {isLast ? (
                  <>
                    Concluir <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Próximo <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/40 text-center">
            {index + 1} de {SLIDES.length} · use ← → para navegar
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PipelineIllustration() {
  const stages = [
    { icon: PenLine, label: "Roteiro", hue: 220 },
    { icon: Mic, label: "Gravação", hue: 60 },
    { icon: Film, label: "Edição", hue: 300 },
    { icon: Eye, label: "Revisão", hue: 25 },
    { icon: CircleCheck, label: "Concluído", hue: 158 },
  ];
  return (
    <div className="relative">
      <span className="absolute top-5 left-3 right-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="grid grid-cols-5 gap-1.5 relative">
        {stages.map((s, i) => (
          <div key={s.label} className="flex flex-col items-center text-center">
            <span
              className="relative h-10 w-10 rounded-lg flex items-center justify-center border"
              style={{
                background: `oklch(0.22 0.030 ${s.hue})`,
                borderColor: `oklch(0.40 0.08 ${s.hue})`,
                animation: `glow-pulse 3s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              <s.icon
                className="h-4 w-4"
                style={{ color: `oklch(0.85 0.14 ${s.hue})` }}
                strokeWidth={1.8}
              />
            </span>
            <span
              className="text-[9px] font-mono uppercase tracking-[0.18em] mt-2"
              style={{ color: `oklch(0.78 0.13 ${s.hue})` }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
