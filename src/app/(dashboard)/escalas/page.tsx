"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, ArrowRight } from "lucide-react";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { STEPS } from "@/components/pipeline/mini-pipeline";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

export default function EscalasPage() {
  const { data: session } = useSession();
  const [scales, setScales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const role = (session?.user as any)?.role;
  const canCreate = ["admin", "coordenador"].includes(role);

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
        <div className="h-8 w-40 skeleton rounded-md" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-56 skeleton rounded-xl" />)}
      </div>
    );
  }

  const totalScales = scales.length;
  const totalWeeks = scales.reduce((acc, s) => acc + (s.weeks?.length || 0), 0);
  const doneWeeks = scales.reduce(
    (acc, s) => acc + (s.weeks?.filter((w: { status: string }) => w.status === "concluido").length || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Produção"
        title="Escalas"
        description="Escalas mensais de produção do ministério"
        icon={Calendar}
        actions={
          canCreate && (
            <Link href="/escalas/nova">
              <Button size="sm" className="h-9 shadow-sm shadow-primary/15">
                <Plus className="h-4 w-4 mr-1.5" /> Nova escala
              </Button>
            </Link>
          )
        }
        meta={
          totalScales > 0 && (
            <div className="flex items-center gap-5 text-xs">
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-lg font-semibold tabular-nums">{totalScales}</span>
                <span className="text-muted-foreground">{totalScales === 1 ? "escala" : "escalas"}</span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-lg font-semibold tabular-nums">{totalWeeks}</span>
                <span className="text-muted-foreground">semanas</span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-lg font-semibold tabular-nums text-emerald-600">
                  {doneWeeks}
                </span>
                <span className="text-muted-foreground">concluídas</span>
              </span>
            </div>
          )
        }
      />

      {scales.length === 0 ? (
        <EmptyState
          icon={Calendar}
          tone="primary"
          title="Nenhuma escala criada ainda"
          description="Crie sua primeira escala mensal para começar a organizar a produção dos vídeos do ministério."
          action={
            canCreate && (
              <Link href="/escalas/nova">
                <Button size="sm" className="h-9 shadow-sm shadow-primary/15">
                  <Plus className="h-4 w-4 mr-1.5" /> Criar primeira escala
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4 animate-in-view">
          {scales.map((scale: any, idx: number) => {
            const totalW = scale.weeks.length;
            const doneW = scale.weeks.filter((w: any) => w.status === "concluido").length;
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
                <div className="card-glass rounded-2xl hover:border-primary/25 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 sm:py-5 border-b bg-gradient-to-r from-card to-primary/[0.02]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider">
                            {scale.month}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground/60">
                            Por {scale.createdBy?.name}
                          </span>
                        </div>
                        <h3 className="font-heading text-xl font-semibold tracking-tight group-hover:text-primary transition-colors truncate">
                          {scale.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {totalW} {totalW === 1 ? "semana" : "semanas"} · {doneW} concluída{doneW !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-heading text-2xl font-semibold text-primary tabular-nums leading-none">
                            {progress}%
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                            concluído
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left bg-muted/30">
                        <th className="pl-5 sm:pl-6 pr-2 py-2.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] w-14">
                          #
                        </th>
                        <th className="px-2 py-2.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em]">
                          Tema
                        </th>
                        <th className="px-2 py-2.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] hidden sm:table-cell w-20">
                          Prazo
                        </th>
                        <th className="px-2 sm:pr-6 py-2.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] w-32">
                          Etapa
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scale.weeks.map((week: any) => {
                        const sc = STEPS.find((s) => s.key === week.status) || STEPS[0];
                        const isOverdue = isBefore(parseLocalDate(week.deadline), new Date());
                        return (
                          <tr key={week.number} className="border-t border-border/60 hover:bg-primary/[0.025] transition-colors">
                            <td className="pl-5 sm:pl-6 pr-2 py-3">
                              <span className="text-[11px] font-bold text-muted-foreground bg-muted/70 rounded-md px-1.5 py-0.5 tabular-nums">
                                S{week.number}
                              </span>
                            </td>
                            <td className="px-2 py-3 font-medium text-foreground/90">{week.theme}</td>
                            <td
                              className={cn(
                                "px-2 py-3 tabular-nums text-xs hidden sm:table-cell",
                                isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"
                              )}
                            >
                              {format(parseLocalDate(week.deadline), "dd/MM", { locale: ptBR })}
                              {isOverdue && <span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-red-500 align-middle" />}
                            </td>
                            <td className="px-2 sm:pr-6 py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                  sc.tagBg
                                )}
                              >
                                <sc.icon className="h-3 w-3" />
                                {sc.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
