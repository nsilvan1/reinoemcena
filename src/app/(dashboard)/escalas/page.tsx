"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  ArrowRight,
  PenLine,
  Mic,
  Film,
  Eye,
  CircleCheck,
  Clock,
  TrendingUp,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { Button, Card, PageHeader, EmptyState, Stat } from "@/components/v2/primitives";

// ─── Step metadata ───────────────────────────────────────────────────

type StepKey = "roteiro" | "gravacao" | "edicao" | "revisao" | "concluido";

interface StepMeta {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hue: number;
}

const STEP_META: Record<StepKey, StepMeta> = {
  roteiro:   { label: "Roteiro",   icon: PenLine,    hue: 220 },
  gravacao:  { label: "Gravação",  icon: Mic,        hue: 60  },
  edicao:    { label: "Edição",    icon: Film,       hue: 300 },
  revisao:   { label: "Revisão",   icon: Eye,        hue: 25  },
  concluido: { label: "Concluído", icon: CircleCheck,hue: 158 },
};

const STEP_ORDER: StepKey[] = ["roteiro", "gravacao", "edicao", "revisao", "concluido"];

// ─── Types ──────────────────────────────────────────────────────────

interface Week {
  number: number;
  theme: string;
  status: string;
  deadline: string;
}

interface Scale {
  _id: string;
  title: string;
  month: string;
  createdBy?: { name?: string };
  weeks: Week[];
}

// ─── Week-chip pipeline ─────────────────────────────────────────────

const MAX_VISIBLE = 5;

function WeekChip({ week }: { week: Week }) {
  const key = week.status as StepKey;
  const meta = STEP_META[key] ?? STEP_META.roteiro;
  const Icon = meta.icon;
  const overdue = isBefore(parseLocalDate(week.deadline), new Date()) && week.status !== "concluido";
  const hue = overdue ? 25 : meta.hue;

  return (
    <span
      title={`S${week.number} · ${week.theme} · ${meta.label} · prazo ${format(parseLocalDate(week.deadline), "dd/MM", { locale: ptBR })}`}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium",
        "border transition-opacity hover:opacity-80 cursor-default select-none"
      )}
      style={{
        background:    `oklch(0.20 0.025 ${hue})`,
        color:         `oklch(0.82 0.13 ${hue})`,
        borderColor:   `oklch(0.32 0.055 ${hue} / 0.50)`,
      }}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
      <span className="font-mono tracking-tight">S{week.number}</span>
    </span>
  );
}

function WeekPipelineStrip({ weeks }: { weeks: Week[] }) {
  const visible = weeks.slice(0, MAX_VISIBLE);
  const overflow = weeks.length - MAX_VISIBLE;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((w) => (
        <WeekChip key={w.number} week={w} />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] font-mono text-muted-foreground/50 px-1">
          +{overflow}
        </span>
      )}
      {weeks.length === 0 && (
        <span className="text-[10px] text-muted-foreground/35 font-mono italic">
          sem semanas
        </span>
      )}
    </div>
  );
}

// ─── Scale row ──────────────────────────────────────────────────────

function ScaleRow({ scale, index }: { scale: Scale; index: number }) {
  const totalW = scale.weeks.length;
  const doneW  = scale.weeks.filter((w) => w.status === "concluido").length;
  const progress = totalW > 0 ? Math.round((doneW / totalW) * 100) : 0;
  const allDone  = totalW > 0 && doneW === totalW;

  return (
    <Link
      href={`/escalas/${scale._id}`}
      className={cn(
        "group relative flex items-center gap-4 lg:gap-6 px-5 py-4 animate-in-view",
        "border-t border-border/40 transition-colors",
        "hover:bg-[oklch(0.225_0.018_172)]",
        "first:border-t-0",
        index === 0 ? "stagger-5" : index === 1 ? "stagger-6" : index === 2 ? "stagger-7" : "stagger-8"
      )}
    >
      {/* Left: month badge + title + creator */}
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <span
          className={cn(
            "shrink-0 h-10 w-10 rounded-md flex items-center justify-center",
            "text-[10px] font-mono font-bold tracking-tight tabular-nums text-center leading-tight",
            allDone
              ? "bg-[oklch(0.22_0.030_158)] text-[oklch(0.82_0.13_158)]"
              : "bg-[oklch(0.215_0.016_172)] text-muted-foreground/70"
          )}
        >
          {(() => {
            const parts = scale.month.split("-");
            if (parts.length === 2) {
              const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
              return (
                <>
                  <span>{format(d, "MMM", { locale: ptBR })}</span>
                  <span className="text-[8px] opacity-60">{parts[0].slice(2)}</span>
                </>
              );
            }
            return scale.month;
          })()}
        </span>

        <div className="min-w-0">
          <p className="font-semibold text-[14px] leading-tight tracking-[-0.01em] group-hover:text-[oklch(0.90_0.06_158)] transition-colors truncate">
            {scale.title}
          </p>
          <p className="text-[11px] text-muted-foreground/50 font-mono mt-0.5">
            {scale.createdBy?.name ?? "—"} · {totalW} semana{totalW !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Center: week chips */}
      <div className="hidden sm:block min-w-0 flex-[2]">
        <WeekPipelineStrip weeks={scale.weeks} />
      </div>

      {/* Right: % + arrow */}
      <div className="shrink-0 flex items-center gap-4">
        <div className="text-right hidden xs:block">
          <p
            className={cn(
              "text-[22px] font-semibold tabular-nums leading-none tracking-tight",
              allDone ? "text-[oklch(0.82_0.14_158)]" : "text-foreground/85"
            )}
          >
            {progress}%
          </p>
          <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-[0.18em] mt-1">
            concluído
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/25 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>

      {/* Progress bar — full-width bottom rail */}
      {totalW > 0 && (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: allDone
              ? "oklch(0.74 0.16 158)"
              : "oklch(0.62 0.14 158 / 0.60)",
          }}
        />
      )}
    </Link>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function EscalasPage() {
  const { data: session } = useSession();
  const [scales, setScales] = useState<Scale[]>([]);
  const [loading, setLoading] = useState(true);
  const role    = (session?.user as { role?: string })?.role;
  const canCreate = ["admin", "coordenador"].includes(role || "");

  useEffect(() => {
    fetch("/api/scales")
      .then((r) => (r.ok ? r.json() : []))
      .then(setScales)
      .catch(() => toast.error("Erro ao carregar escalas"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 w-72 skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
        <div className="h-14 skeleton rounded-lg" />
        <div className="h-14 skeleton rounded-lg" />
        <div className="h-14 skeleton rounded-lg" />
      </div>
    );
  }

  const totalScales  = scales.length;
  const totalWeeks   = scales.reduce((acc, s) => acc + (s.weeks?.length || 0), 0);
  const doneWeeks    = scales.reduce(
    (acc, s) => acc + (s.weeks?.filter((w) => w.status === "concluido").length || 0),
    0
  );
  const progressPct  = totalWeeks > 0 ? Math.round((doneWeeks / totalWeeks) * 100) : 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Produção"
        title="Escalas"
        description="Escalas mensais de produção do ministério."
        icon={Calendar}
        actions={
          canCreate && (
            <Link href="/escalas/nova">
              <Button>
                <Plus className="h-3.5 w-3.5" />
                Nova escala
              </Button>
            </Link>
          )
        }
      />

      {/* ── Stat strip ── */}
      {totalScales > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat
            icon={Calendar}
            label="Escalas"
            value={totalScales}
            accent="primary"
            animated
            className="animate-in-view stagger-1"
          />
          <Stat
            icon={Clock}
            label="Semanas"
            value={totalWeeks}
            accent="info"
            animated
            className="animate-in-view stagger-2"
          />
          <Stat
            icon={CircleCheck}
            label="Concluídas"
            value={doneWeeks}
            accent="primary"
            animated
            className="animate-in-view stagger-3"
          />
          <Stat
            icon={TrendingUp}
            label="Progresso"
            value={`${progressPct}%`}
            accent={progressPct === 100 ? "primary" : "warning"}
            className="animate-in-view stagger-4"
          />
        </div>
      )}

      {scales.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nenhuma escala criada ainda"
          description="Crie sua primeira escala mensal para organizar a produção dos vídeos do ministério."
          action={
            canCreate && (
              <Link href="/escalas/nova">
                <Button>
                  <Plus className="h-3.5 w-3.5" /> Criar primeira escala
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <Card elevated className="overflow-hidden animate-in-view stagger-5">
          <div className="max-h-[65vh] overflow-y-auto">
            {/* Column headers — sticky dentro do scroll */}
            <div className="hidden sm:flex items-center gap-4 lg:gap-6 px-5 py-2.5 border-b border-border/50 bg-[oklch(0.205_0.014_172)] sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45">
                Escala
              </div>
              <div className="flex-[2] text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45">
                Semanas
              </div>
              <div className="w-20 text-right text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45 pr-8">
                Avanço
              </div>
            </div>

            <div>
              {scales.map((scale, idx) => (
                <ScaleRow key={scale._id} scale={scale} index={idx} />
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
