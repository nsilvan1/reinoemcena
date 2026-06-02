"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, ArrowRight } from "lucide-react";
import { Button } from "./v2/primitives";

/**
 * Tour guiado com spotlight sobre elementos REAIS da interface.
 *
 * Cada passo aponta para um elemento via `target` (atributo data-tour="...").
 * O engine localiza o elemento, escurece o resto da tela com um recorte
 * iluminado (box-shadow gigante) e posiciona um balão explicativo perto dele.
 *
 * Robustez: se o alvo não existir (ex.: sidebar fechada no mobile, página
 * ainda não renderizada), o passo cai para um card central — o tour nunca
 * quebra. Passos podem navegar de rota antes de procurar o alvo (`route`).
 */

export interface TourStep {
  id: string;
  /** Valor do atributo data-tour do elemento alvo. Ausente = card central. */
  target?: string;
  /** Navega para esta rota antes de procurar o alvo. */
  route?: string;
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const TOOLTIP_W = 340;

export function GuidedTour({
  steps,
  open,
  onClose,
  storageKey,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: (completed: boolean) => void;
  storageKey?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const cancelRef = useRef(false);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  // Reseta para o início sempre que abre.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setReady(false);
    }
  }, [open]);

  // Localiza o alvo do passo atual (navegando de rota se preciso).
  useEffect(() => {
    if (!open || !step) return;
    cancelRef.current = false;
    setReady(false);
    setRect(null);

    if (step.route && step.route !== pathname) {
      router.push(step.route);
    }

    if (!step.target) {
      // Card central, sem alvo.
      setReady(true);
      return;
    }

    let tries = 0;
    const maxTries = 60; // ~2s a 30fps

    const tick = () => {
      if (cancelRef.current) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setReady(true);
        return;
      }
      if (++tries > maxTries) {
        // Não encontrou → fallback card central.
        setReady(true);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => {
      cancelRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, step?.target, step?.route]);

  // Recalcula a posição em scroll/resize.
  useEffect(() => {
    if (!open || !step?.target) return;
    const update = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, index, step?.target]);

  // Bloqueia o scroll do body enquanto o tour está aberto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const finish = useCallback(
    (completed: boolean) => {
      if (completed && storageKey) {
        try {
          localStorage.setItem(storageKey, "1");
        } catch {}
      }
      onClose(completed);
    },
    [onClose, storageKey]
  );

  const next = useCallback(() => {
    if (isLast) finish(true);
    else setIndex((i) => i + 1);
  }, [isLast, finish]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Teclado.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, next, prev, finish]);

  if (!open || !step) return null;

  const hasSpot = ready && rect && rect.width > 0;

  // ── Posição do balão ──────────────────────────────────────────────
  let tipStyle: React.CSSProperties;
  if (hasSpot && rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const centerX = rect.left + rect.width / 2;
    const left = Math.min(Math.max(centerX - TOOLTIP_W / 2, 12), vw - TOOLTIP_W - 12);

    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      tipStyle = { top: rect.top + rect.height + PAD + 6, left };
    } else {
      tipStyle = { bottom: vh - rect.top + PAD + 6, left };
    }
  } else {
    // Card central.
    tipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return createPortal(
    <div className="fixed inset-0 z-[2147483600]" role="dialog" aria-modal="true">
      {/* Camada que bloqueia interação com a página (transparente). */}
      <div className="absolute inset-0" onClick={() => finish(false)} />

      {/* Spotlight: recorte iluminado com o resto escurecido. */}
      {hasSpot && rect ? (
        <div
          className="absolute pointer-events-none transition-all duration-300 ease-out rounded-xl"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow:
              "0 0 0 9999px oklch(0 0 0 / 0.74), 0 0 0 2px oklch(0.74 0.16 158 / 0.9), 0 0 22px 4px oklch(0.62 0.16 158 / 0.45)",
          }}
        />
      ) : (
        // Backdrop uniforme para o card central.
        <div className="absolute inset-0 bg-black/74 backdrop-blur-[2px] pointer-events-none" />
      )}

      {/* Balão */}
      <div
        className="absolute w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-[oklch(0.30_0.016_170)] bg-[oklch(0.175_0.014_172)] shadow-2xl overflow-hidden animate-in-view"
        style={tipStyle}
      >
        {/* Hero */}
        <div
          className="relative px-5 pt-5 pb-4"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 0%, oklch(0.28 0.10 158 / 0.45), transparent 60%), linear-gradient(180deg, oklch(0.205 0.020 172), oklch(0.175 0.014 172))",
          }}
        >
          <button
            type="button"
            onClick={() => finish(false)}
            className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-black/30 hover:bg-black/50 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Fechar tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-[oklch(0.80_0.14_158)] mb-1.5">
            Passo {index + 1} de {steps.length}
          </p>
          <h3 className="font-heading text-[19px] font-semibold leading-tight tracking-[-0.02em] pr-7">
            {step.title}
          </h3>
        </div>

        {/* Corpo */}
        <div className="px-5 py-4">
          <p className="text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3.5 border-t border-border bg-[oklch(0.16_0.014_172)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={
                  i === index
                    ? "h-1.5 w-5 rounded-full bg-[oklch(0.78_0.16_158)] transition-all"
                    : "h-1.5 w-1.5 rounded-full bg-muted-foreground/30 transition-all"
                }
              />
            ))}
          </div>
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
      </div>

      {/* Atalho "pular" discreto no canto */}
      <button
        type="button"
        onClick={() => finish(false)}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] font-mono uppercase tracking-[0.18em] text-white/45 hover:text-white/80 transition-colors"
      >
        Pular tour
      </button>
    </div>,
    document.body
  );
}
