"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Rewind,
  FastForward,
  Gauge,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  /** Mostrar título acima do player. */
  title?: string;
  /** Compact = altura reduzida (sem progress bar grande). */
  compact?: boolean;
  /** Quando true, começa tocando ao montar. */
  autoPlay?: boolean;
  className?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Player de áudio customizado moderno — dark theme teal.
 * - Play/pause grande central com pulse-ring quando tocando
 * - Progress bar clicável + seek arrastando
 * - Skip ±10s
 * - Speed control (0.5x → 2x)
 * - Volume com mute
 * - Wave de barras animadas decorativas
 */
export function AudioPlayer({
  src,
  title,
  compact = false,
  autoPlay = false,
  className,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [seeking, setSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Sync audio events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onLoaded = () => {
      setDuration(a.duration);
      setLoading(false);
    };
    const onTime = () => {
      if (!seeking) setCurrentTime(a.currentTime);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [seeking]);

  // Apply volume / mute / speed
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = muted ? 0 : volume;
    a.playbackRate = speed;
  }, [volume, muted, speed]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => setPlaying(false));
    } else {
      a.pause();
    }
  }, []);

  const skip = useCallback((delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  }, []);

  const handleSeek = useCallback(
    (clientX: number) => {
      const bar = progressRef.current;
      const a = audioRef.current;
      if (!bar || !a || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      a.currentTime = pct * duration;
      setCurrentTime(pct * duration);
    },
    [duration]
  );

  const onProgressMouseDown = (e: React.MouseEvent) => {
    setSeeking(true);
    handleSeek(e.clientX);
    const onMove = (ev: MouseEvent) => handleSeek(ev.clientX);
    const onUp = () => {
      setSeeking(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onProgressHover = (e: React.MouseEvent) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
  };

  const onProgressTouch = (e: React.TouchEvent) => {
    setSeeking(true);
    if (e.touches[0]) handleSeek(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => {
      if (ev.touches[0]) handleSeek(ev.touches[0].clientX);
    };
    const onEnd = () => {
      setSeeking(false);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Bars decorativas (waveform fake) — 32 barras pra desktop, 20 pra compact
  const barCount = compact ? 20 : 32;
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      // pseudo-random altura via senoide
      const h = 0.30 + Math.abs(Math.sin(i * 1.7 + 0.5)) * 0.7;
      return h;
    });
  }, [barCount]);

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-[oklch(0.205_0.014_172)]",
        "shadow-[0_1px_2px_oklch(0_0_0_/_0.3),0_8px_24px_oklch(0_0_0_/_0.20)]",
        compact ? "p-2.5" : "p-3 sm:p-4",
        className
      )}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" autoPlay={autoPlay} />

      {/* Glow ambient when playing — contido em wrapper próprio com overflow-hidden
          para não cortar dropdowns como o de velocidade. */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            playing ? "opacity-100" : "opacity-0"
          )}
          style={{
            background:
              "radial-gradient(60% 80% at 20% 50%, oklch(0.74 0.16 158 / 0.10), transparent 65%)",
          }}
        />
      </div>

      <div className="relative flex items-center gap-3">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pausar" : "Tocar"}
          className={cn(
            "shrink-0 inline-flex items-center justify-center rounded-full transition-all duration-200",
            "bg-primary text-primary-foreground hover:bg-[oklch(0.78_0.16_158)] active:scale-95",
            "shadow-[0_2px_12px_oklch(0.74_0.16_158_/_0.35)]",
            compact ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12",
            playing && "ring-2 ring-primary/30 ring-offset-2 ring-offset-[oklch(0.205_0.014_172)]"
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className={cn(compact ? "h-4 w-4" : "h-5 w-5")} fill="currentColor" />
          ) : (
            <Play
              className={cn(compact ? "h-4 w-4" : "h-5 w-5", "translate-x-[1px]")}
              fill="currentColor"
            />
          )}
        </button>

        {/* Centro: título + waveform/progress + tempos */}
        <div className="flex-1 min-w-0">
          {title && !compact && (
            <p className="text-[11px] font-semibold text-foreground/85 truncate mb-1.5">
              {title}
            </p>
          )}

          {/* Waveform / progress */}
          <div
            ref={progressRef}
            onMouseDown={onProgressMouseDown}
            onMouseMove={onProgressHover}
            onMouseLeave={() => setHoverTime(null)}
            onTouchStart={onProgressTouch}
            className={cn(
              "relative group cursor-pointer select-none",
              compact ? "h-7" : "h-9"
            )}
            role="slider"
            aria-label="Progresso"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
          >
            <div className="absolute inset-0 flex items-center gap-[2px]">
              {bars.map((h, i) => {
                const barCenter = ((i + 0.5) / bars.length) * 100;
                const filled = barCenter <= progress;
                const isPlayingBar = playing && Math.abs(barCenter - progress) < 100 / bars.length;
                return (
                  <span
                    key={i}
                    className={cn(
                      "flex-1 rounded-[1px] transition-all duration-300",
                      filled
                        ? "bg-primary"
                        : "bg-[oklch(0.32_0.015_172)] group-hover:bg-[oklch(0.40_0.018_172)]"
                    )}
                    style={{
                      height: `${h * 100}%`,
                      transform: isPlayingBar ? "scaleY(1.15)" : undefined,
                    }}
                  />
                );
              })}
            </div>

            {/* Hover tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums bg-[oklch(0.26_0.016_172)] border border-border text-foreground pointer-events-none whitespace-nowrap"
                style={{ left: `${(hoverTime / (duration || 1)) * 100}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Tempos */}
          <div
            className={cn(
              "flex items-center justify-between mt-1",
              compact ? "text-[10px]" : "text-[11px]"
            )}
          >
            <span className="font-mono tabular-nums text-foreground/85">
              {formatTime(currentTime)}
            </span>
            <span className="font-mono tabular-nums text-muted-foreground/60">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Controls direita: skip back / forward / speed / volume */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!compact && (
            <>
              <button
                type="button"
                onClick={() => skip(-10)}
                aria-label="Voltar 10s"
                className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[oklch(0.24_0.016_172)] transition-colors"
              >
                <Rewind className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => skip(10)}
                aria-label="Avançar 10s"
                className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[oklch(0.24_0.016_172)] transition-colors"
              >
                <FastForward className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {/* Speed */}
          <SpeedMenu speed={speed} onChange={setSpeed} compact={compact} />

          {/* Volume */}
          <VolumeMenu
            volume={volume}
            muted={muted}
            onVolume={(v) => {
              setVolume(v);
              if (v > 0) setMuted(false);
            }}
            onToggleMute={() => setMuted((m) => !m)}
            Icon={VolumeIcon}
            compact={compact}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Volume popover ─────────────────────────────────────────────────

function VolumeMenu({
  volume,
  muted,
  onVolume,
  onToggleMute,
  Icon,
  compact,
}: {
  volume: number;
  muted: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const menuH = 44;
      const wantsAbove = r.bottom + menuH > window.innerHeight - 8;
      setPos({
        top: wantsAbove ? r.top - menuH - 4 : r.bottom + 4,
        left: r.right - 124,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          // Click curto = toggle mute; long-press abre slider. Pra simplicidade aqui
          // usamos click duplo de comportamentos: shift+click ou botão direito abre slider.
          // Comportamento padrão: click = abre slider; double-click = mute toggle.
          if (e.detail >= 2) {
            onToggleMute();
            setOpen(false);
          } else {
            setOpen((v) => !v);
          }
        }}
        aria-label="Volume"
        className={cn(
          "rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[oklch(0.24_0.016_172)] transition-colors",
          compact ? "h-7 w-7" : "h-8 w-8"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>

      {open && mounted && pos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[2147483600] bg-[oklch(0.22_0.016_172)] border border-border rounded-md p-2 shadow-[0_8px_24px_oklch(0_0_0_/_0.5)] flex items-center gap-2 animate-in-view"
            style={{ top: pos.top, left: pos.left, width: 124 }}
          >
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? "Ativar som" : "Silenciar"}
              className="h-6 w-6 rounded inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => onVolume(parseFloat(e.target.value))}
              className="flex-1 accent-primary cursor-pointer"
              aria-label="Nível do volume"
            />
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Speed dropdown ─────────────────────────────────────────────────

function SpeedMenu({
  speed,
  onChange,
  compact,
}: {
  speed: number;
  onChange: (s: number) => void;
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Calcula posição quando abre e em scroll/resize
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      // Menu ~150px alto x 64px wide — abrir acima do botão pra não cortar embaixo
      const menuH = SPEEDS.length * 24 + 8;
      const wantsAbove = r.bottom + menuH > window.innerHeight - 8;
      setPos({
        top: wantsAbove ? r.top - menuH - 4 : r.bottom + 4,
        left: r.right - 64,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Velocidade"
        className={cn(
          "rounded-md inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold tabular-nums px-1.5 text-muted-foreground hover:text-foreground hover:bg-[oklch(0.24_0.016_172)] transition-colors",
          compact ? "h-7" : "h-8",
          speed !== 1 && "text-primary"
        )}
      >
        <Gauge className="h-3 w-3" />
        {speed}x
      </button>

      {open && mounted && pos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[2147483600] bg-[oklch(0.22_0.016_172)] border border-border rounded-md p-1 shadow-[0_8px_24px_oklch(0_0_0_/_0.5)] min-w-[64px] animate-in-view"
            style={{ top: pos.top, left: pos.left }}
          >
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2 py-1 rounded text-[11px] font-mono tabular-nums",
                  "hover:bg-[oklch(0.26_0.016_172)] transition-colors",
                  s === speed ? "text-primary font-semibold" : "text-foreground/80"
                )}
              >
                {s}x
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
