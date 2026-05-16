"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Pause,
  Play,
  Square,
  Save,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "recording" | "paused" | "stopped";

interface Props {
  /** Endpoint pra POST /audio (FormData com "file"). */
  uploadEndpoint: string;
  /** Nome do usuário pra default-name do arquivo. */
  username: string;
  /** Desativa botão enquanto upload externo está rolando ou faltam pré-condições. */
  disabled?: boolean;
  /** Notifica o pai que terminou (refresh). */
  onUploaded: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function isMediaRecorderSupported() {
  if (typeof window === "undefined") return false;
  return (
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** Tenta achar o melhor mimeType disponível pro MediaRecorder. */
function pickMimeType(): string {
  if (typeof window === "undefined" || !window.MediaRecorder) return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    if (window.MediaRecorder.isTypeSupported(c)) return c;
  }
  return "audio/webm";
}

/**
 * Gravador in-browser via MediaRecorder API. Captura microfone, mostra
 * timer + barras animadas (CSS), e ao parar gera um Blob (audio/webm).
 * O usuário decide se faz upload ou descarta.
 *
 * Sem fallback de polyfill: se MediaRecorder não existe, mostra mensagem
 * orientando o usuário a usar o botão de upload normal.
 */
export function LiveRecorder({
  uploadEndpoint,
  username,
  disabled,
  onUploaded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permError, setPermError] = useState<string | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [level, setLevel] = useState(0); // 0..1 para barra animada

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  useEffect(() => {
    setSupported(isMediaRecorderSupported());
  }, []);

  // Limpa preview URL quando blob muda
  useEffect(() => {
    if (!blob) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setPreviewUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  function stopAllTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      stopAllTracks();
    };
  }, []);

  function startLevelMeter(stream: MediaStream) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buffer);
        // RMS
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        setLevel(Math.min(1, rms * 2.4));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.warn("[live-recorder] analyser failed", err);
    }
  }

  async function start() {
    if (!supported) {
      toast.error("Seu navegador não suporta gravação");
      return;
    }
    setPermError(null);
    setBlob(null);
    setElapsed(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        setBlob(finalBlob);
        setState("stopped");
        stopAllTracks();
      };
      recorder.start(250);
      setState("recording");
      startLevelMeter(stream);

      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Permissão negada";
      setPermError(msg);
      stopAllTracks();
      setState("idle");
      toast.error("Não foi possível acessar o microfone");
    }
  }

  function pause() {
    const r = mediaRecorderRef.current;
    if (!r) return;
    if (r.state === "recording") {
      r.pause();
      setState("paused");
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (r.state === "paused") {
      r.resume();
      setState("recording");
      const baseElapsed = elapsed;
      const resumedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsed(baseElapsed + Math.floor((Date.now() - resumedAt) / 1000));
      }, 500);
    }
  }

  function stop() {
    const r = mediaRecorderRef.current;
    if (!r) return;
    if (r.state !== "inactive") r.stop();
  }

  function discard() {
    setBlob(null);
    setElapsed(0);
    setState("idle");
  }

  async function upload() {
    if (!blob) return;
    setUploading(true);
    try {
      // Extensão coerente com o mimeType
      const ext = mimeTypeRef.current.includes("ogg")
        ? "ogg"
        : mimeTypeRef.current.includes("mp4")
          ? "m4a"
          : "webm";
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user";
      const filename = `gravacao-${slug}-${stamp}.${ext}`;
      const file = new File([blob], filename, { type: mimeTypeRef.current });
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(uploadEndpoint, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no upload");
        return;
      }
      toast.success("Gravação enviada!");
      setBlob(null);
      setElapsed(0);
      setState("idle");
      setOpen(false);
      onUploaded();
    } catch {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  if (supported === false) {
    return (
      <div className="text-[11px] text-[oklch(0.82_0.13_60)] bg-[oklch(0.22_0.030_60)] border border-[oklch(0.35_0.06_60)] rounded-md px-2 py-1.5 flex items-center gap-1.5">
        <AlertCircle className="h-3 w-3 shrink-0" />
        Seu navegador não suporta gravação no app. Use &ldquo;Anexar arquivo&rdquo;.
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        className="h-9 text-xs w-full border-dashed border-[oklch(0.40_0.08_60)] text-[oklch(0.82_0.13_60)] hover:bg-[oklch(0.22_0.030_60)]"
        onClick={() => setOpen(true)}
      >
        <Mic className="h-3.5 w-3.5 mr-1.5" />
        Gravar agora (microfone)
      </Button>
    );
  }

  // Painel aberto
  return (
    <div className="rounded-lg border border-[oklch(0.40_0.08_60)] bg-[oklch(0.22_0.030_60)]/50 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5 text-[oklch(0.82_0.13_60)]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[oklch(0.82_0.13_60)]">
            Gravar microfone
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
              mediaRecorderRef.current.stop();
            }
            stopAllTracks();
            setOpen(false);
            setBlob(null);
            setElapsed(0);
            setState("idle");
          }}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          fechar
        </button>
      </div>

      {permError && (
        <div className="text-[11px] text-[oklch(0.82_0.13_25)] bg-[oklch(0.22_0.030_25)] border border-[oklch(0.35_0.06_25)] rounded-md px-2 py-1.5">
          {permError}
        </div>
      )}

      {/* Visualizador de ondas: 18 barras com altura baseada em RMS+random */}
      <div className="h-14 rounded-md bg-[oklch(0.16_0.012_60)] flex items-end justify-center gap-1 px-3 py-2 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => {
          const phase = state === "recording" ? Math.sin((Date.now() / 80 + i * 0.7)) * 0.35 + 0.65 : 0.15;
          const h = state === "recording"
            ? Math.max(0.08, Math.min(1, level * phase + 0.1))
            : state === "paused"
              ? 0.2
              : 0.1;
          return (
            <span
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-100",
                state === "recording" ? "bg-[oklch(0.78_0.13_60)]" : "bg-[oklch(0.40_0.08_60)]"
              )}
              style={{ height: `${h * 100}%` }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-lg font-bold tabular-nums text-[oklch(0.82_0.13_60)]">
          {formatTime(elapsed)}
        </span>
        <div className="flex items-center gap-1.5">
          {state === "idle" && !blob && (
            <Button
              type="button"
              size="sm"
              onClick={start}
              className="h-8 text-xs bg-[oklch(0.55_0.17_60)] hover:bg-[oklch(0.48_0.17_60)]"
            >
              <Mic className="h-3.5 w-3.5 mr-1" /> Iniciar
            </Button>
          )}
          {(state === "recording" || state === "paused") && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={pause}
                className="h-8 text-xs"
              >
                {state === "recording" ? (
                  <>
                    <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-1" /> Continuar
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={stop}
                className="h-8 text-xs"
              >
                <Square className="h-3.5 w-3.5 mr-1" /> Parar
              </Button>
            </>
          )}
        </div>
      </div>

      {blob && previewUrl && state === "stopped" && (
        <div className="space-y-2">
          <audio controls className="w-full h-9" src={previewUrl}>
            Seu navegador não suporta áudio.
          </audio>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 text-xs flex-1 bg-[oklch(0.55_0.17_60)] hover:bg-[oklch(0.48_0.17_60)]"
              disabled={uploading}
              onClick={upload}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {uploading ? "Enviando…" : "Salvar como minha gravação"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 text-xs"
              disabled={uploading}
              onClick={discard}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
