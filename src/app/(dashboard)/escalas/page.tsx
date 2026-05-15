"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar } from "lucide-react";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { STEPS } from "@/components/pipeline/mini-pipeline";

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
          <p className="text-sm text-muted-foreground mt-0.5">Escalas mensais de produção</p>
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
                          <p className="text-[10px] text-muted-foreground">concluído</p>
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
                        <th className="px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-32">Etapa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scale.weeks.map((week: any) => {
                        const sc = STEPS.find((s) => s.key === week.status) || STEPS[0];
                        const isOverdue = isBefore(parseLocalDate(week.deadline), new Date());
                        return (
                          <tr key={week.number} className="border-t hover:bg-accent/20 transition-colors">
                            <td className="px-5 py-2.5">
                              <span className="text-xs font-bold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">S{week.number}</span>
                            </td>
                            <td className="px-5 py-2.5 font-medium">{week.theme}</td>
                            <td className={cn(
                              "px-5 py-2.5 tabular-nums text-xs hidden sm:table-cell",
                              isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                            )}>
                              {format(parseLocalDate(week.deadline), "dd/MM", { locale: ptBR })}
                              {isOverdue && <span className="ml-1 text-red-400">•</span>}
                            </td>
                            <td className="px-5 py-2.5">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                sc.tagBg
                              )}>
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
