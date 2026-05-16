"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, Calendar, ArrowRight, PenLine, Mic, Film, Eye, CircleCheck } from "lucide-react";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { Button, Card, PageHeader, EmptyState } from "@/components/v2/primitives";

const STEP_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; text: string; bg: string }> = {
  roteiro: { label: "Roteiro", icon: PenLine, text: "text-[oklch(0.80_0.14_220)]", bg: "bg-[oklch(0.22_0.030_220)]" },
  gravacao: { label: "Gravação", icon: Mic, text: "text-[oklch(0.80_0.14_60)]", bg: "bg-[oklch(0.22_0.030_60)]" },
  edicao: { label: "Edição", icon: Film, text: "text-[oklch(0.80_0.14_300)]", bg: "bg-[oklch(0.22_0.030_300)]" },
  revisao: { label: "Revisão", icon: Eye, text: "text-[oklch(0.80_0.14_25)]", bg: "bg-[oklch(0.22_0.030_25)]" },
  concluido: { label: "Concluído", icon: CircleCheck, text: "text-[oklch(0.80_0.14_158)]", bg: "bg-[oklch(0.22_0.030_158)]" },
};

export default function EscalasPage() {
  const { data: session } = useSession();
  const [scales, setScales] = useState<Array<{ _id: string; title: string; month: string; createdBy?: { name?: string }; weeks: Array<{ number: number; theme: string; status: string; deadline: string }> }>>([]);
  const [loading, setLoading] = useState(true);
  const role = (session?.user as { role?: string })?.role;
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
        <div className="h-72 skeleton rounded-xl" />
        <div className="h-72 skeleton rounded-xl" />
      </div>
    );
  }

  const totalScales = scales.length;
  const totalWeeks = scales.reduce((acc, s) => acc + (s.weeks?.length || 0), 0);
  const doneWeeks = scales.reduce(
    (acc, s) => acc + (s.weeks?.filter((w) => w.status === "concluido").length || 0),
    0
  );

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
        meta={
          totalScales > 0 && (
            <div className="flex items-center gap-6 text-[12px]">
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold tabular-nums">{totalScales}</span>
                <span className="text-muted-foreground/65 font-mono uppercase tracking-[0.18em] text-[10px]">
                  {totalScales === 1 ? "escala" : "escalas"}
                </span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold tabular-nums">{totalWeeks}</span>
                <span className="text-muted-foreground/65 font-mono uppercase tracking-[0.18em] text-[10px]">
                  semanas
                </span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold tabular-nums text-[oklch(0.80_0.14_158)]">
                  {doneWeeks}
                </span>
                <span className="text-muted-foreground/65 font-mono uppercase tracking-[0.18em] text-[10px]">
                  concluídas
                </span>
              </span>
            </div>
          )
        }
      />

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
        <div className="space-y-5 animate-in-view">
          {scales.map((scale, idx) => {
            const totalW = scale.weeks.length;
            const doneW = scale.weeks.filter((w) => w.status === "concluido").length;
            const progress = totalW > 0 ? Math.round((doneW / totalW) * 100) : 0;
            return (
              <Link
                key={scale._id}
                href={`/escalas/${scale._id}`}
                className={cn(
                  "block group animate-in-view",
                  idx === 0 ? "stagger-1" : idx === 1 ? "stagger-2" : "stagger-3"
                )}
              >
                <Card interactive className="overflow-hidden">
                  <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-transparent via-transparent to-[oklch(0.18_0.014_158)]/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono uppercase tracking-[0.22em] px-1.5 py-0.5 rounded-md bg-[oklch(0.20_0.010_240)] text-muted-foreground border border-border">
                            {scale.month}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45">
                            por {scale.createdBy?.name}
                          </span>
                        </div>
                        <h3 className="font-heading text-2xl font-semibold tracking-[-0.025em] group-hover:text-[oklch(0.92_0.05_158)] transition-colors truncate">
                          {scale.title}
                        </h3>
                        <p className="text-[12px] text-muted-foreground/65 mt-1 font-mono">
                          {totalW} semanas · {doneW} concluída{doneW !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-heading text-3xl font-semibold text-[oklch(0.85_0.14_158)] tabular-nums leading-none">
                            {progress}%
                          </p>
                          <p className="text-[9px] font-mono text-muted-foreground/55 uppercase tracking-[0.22em] mt-1.5">
                            concluído
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                    <div className="mt-4 h-1 rounded-full bg-[oklch(0.18_0.010_240)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[oklch(0.55_0.18_158)] to-[oklch(0.78_0.16_158)] transition-all duration-700 shadow-[0_0_8px_oklch(0.74_0.16_158)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left bg-[oklch(0.16_0.010_240)] border-b border-border">
                        <th className="pl-6 pr-2 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 w-14">#</th>
                        <th className="px-2 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">Tema</th>
                        <th className="px-2 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 hidden sm:table-cell w-20">Prazo</th>
                        <th className="px-2 pr-6 py-2.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 w-32">Etapa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scale.weeks.map((week) => {
                        const step = STEP_META[week.status] || STEP_META.roteiro;
                        const StepIcon = step.icon;
                        const overdue = isBefore(parseLocalDate(week.deadline), new Date());
                        return (
                          <tr key={week.number} className="border-t border-border/60 hover:bg-[oklch(0.17_0.010_240)] transition-colors">
                            <td className="pl-6 pr-2 py-3">
                              <span className="text-[11px] font-mono font-bold text-muted-foreground bg-[oklch(0.20_0.010_240)] rounded-md px-1.5 py-0.5 tabular-nums border border-border">
                                S{week.number}
                              </span>
                            </td>
                            <td className="px-2 py-3 font-medium text-foreground/90">{week.theme}</td>
                            <td className={cn("px-2 py-3 tabular-nums text-xs hidden sm:table-cell font-mono", overdue ? "text-red-400 font-semibold" : "text-muted-foreground/65")}>
                              {format(parseLocalDate(week.deadline), "dd/MM", { locale: ptBR })}
                              {overdue && <span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-red-500 align-middle" />}
                            </td>
                            <td className="px-2 pr-6 py-3">
                              <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-mono uppercase tracking-[0.15em] border border-current/30", step.bg, step.text)}>
                                <StepIcon className="h-3 w-3" strokeWidth={1.8} />
                                {step.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
