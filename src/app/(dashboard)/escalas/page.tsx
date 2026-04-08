"use client";
import { useEffect, useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Calendar, ArrowRight, CheckCircle,
  PenLine, Mic, Film, Eye, CircleCheck,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "roteiro", label: "Roteiro", icon: PenLine, color: "text-blue-600", bg: "bg-blue-600", dot: "bg-blue-500" },
  { key: "gravacao", label: "Gravacao", icon: Mic, color: "text-amber-600", bg: "bg-amber-600", dot: "bg-amber-500" },
  { key: "edicao", label: "Edicao", icon: Film, color: "text-violet-600", bg: "bg-violet-600", dot: "bg-violet-500" },
  { key: "revisao", label: "Revisao", icon: Eye, color: "text-orange-600", bg: "bg-orange-600", dot: "bg-orange-500" },
  { key: "concluido", label: "Concluido", icon: CircleCheck, color: "text-emerald-600", bg: "bg-emerald-600", dot: "bg-emerald-500" },
];

function MiniPipeline({ status }: { status: string }) {
  const idx = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-px">
      {STEPS.map((step, i) => (
        <Fragment key={step.key}>
          <div className={cn(
            "h-4 w-4 rounded-full flex items-center justify-center",
            i === idx ? `${step.bg} text-white` :
            i < idx ? "bg-emerald-500 text-white" :
            "bg-muted text-muted-foreground/15"
          )}>
            {i < idx ? <CheckCircle className="h-2 w-2" /> : <step.icon className="h-2 w-2" />}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("w-1 h-px", i < idx ? "bg-emerald-300" : "bg-muted")} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default function EscalasPage() {
  const { data: session } = useSession();
  const [scales, setScales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const role = (session?.user as any)?.role;
  const canCreate = ["admin", "coordenador"].includes(role);

  useEffect(() => {
    fetch("/api/scales").then((r) => r.json()).then(setScales).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-muted animate-pulse rounded-md" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-56 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Escalas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Escalas mensais de producao</p>
        </div>
        {canCreate && (
          <Link href="/escalas/nova">
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Nova Escala</Button>
          </Link>
        )}
      </div>

      {scales.length === 0 ? (
        <div className="card-elevated border rounded-xl bg-card p-16 text-center">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground/15 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma escala criada</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Crie sua primeira escala mensal</p>
        </div>
      ) : (
        <div className="space-y-5">
          {scales.map((scale: any) => {
            const totalWeeks = scale.weeks.length;
            const doneWeeks = scale.weeks.filter((w: any) => w.status === "concluido").length;
            const progress = totalWeeks > 0 ? Math.round((doneWeeks / totalWeeks) * 100) : 0;

            return (
              <Link key={scale._id} href={`/escalas/${scale._id}`} className="block group">
                <div className="card-elevated border rounded-xl bg-card hover:border-primary/30 transition-all duration-300 overflow-hidden">
                  {/* Header with progress bar */}
                  <div className="px-5 py-4 border-b relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {scale.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {totalWeeks} semanas &middot; Por {scale.createdBy?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-lg font-bold text-primary">{progress}%</p>
                          <p className="text-[10px] text-muted-foreground">concluido</p>
                        </div>
                        <Badge variant="secondary" className="text-xs font-mono">{scale.month}</Badge>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Weeks table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left bg-muted/30">
                        <th className="px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-14">#</th>
                        <th className="px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tema</th>
                        <th className="px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell w-20">Prazo</th>
                        <th className="px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Pipeline</th>
                        <th className="px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Etapa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scale.weeks.map((week: any) => {
                        const sc = STEPS.find((s) => s.key === week.status) || STEPS[0];
                        return (
                          <tr key={week.number} className="border-t hover:bg-accent/20 transition-colors">
                            <td className="px-5 py-2.5">
                              <span className="text-xs font-bold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">S{week.number}</span>
                            </td>
                            <td className="px-5 py-2.5 font-medium">{week.theme}</td>
                            <td className="px-5 py-2.5 text-muted-foreground tabular-nums text-xs hidden sm:table-cell">
                              {format(new Date(week.deadline), "dd/MM", { locale: ptBR })}
                            </td>
                            <td className="px-5 py-2.5">
                              <MiniPipeline status={week.status} />
                            </td>
                            <td className="px-5 py-2.5">
                              <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", sc.color)}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
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
