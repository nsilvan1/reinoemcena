"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar, CheckCircle, Clock, ArrowRight, Bell,
  TrendingUp, Clapperboard,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, parseLocalDate } from "@/lib/utils";
import { STEPS } from "@/components/pipeline/mini-pipeline";

const PHASE_BORDER: Record<string, string> = {
  roteiro: "border-t-blue-500",
  gravacao: "border-t-amber-500",
  edicao: "border-t-violet-500",
  revisao: "border-t-orange-500",
  concluido: "border-t-emerald-500",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [scales, setScales] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/scales").then((r) => r.ok ? r.json() : []),
      fetch("/api/notifications").then((r) => r.ok ? r.json() : []),
    ]).then(([s, n]) => { setScales(s); setNotifications(n); }).finally(() => setLoading(false));
  }, []);

  const allWeeks = scales.flatMap((s: any) => s.weeks.map((w: any) => ({ ...w, scaleId: s._id, scaleTitle: s.title })));
  const pending = allWeeks.filter((w) => w.status !== "concluido");
  const completed = allWeeks.filter((w) => w.status === "concluido").length;
  const total = allWeeks.length;
  const unread = notifications.filter((n: any) => !n.read);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-28 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { label: "Escalas", value: scales.length, icon: Calendar, accent: "bg-blue-500", iconBg: "bg-blue-50 text-blue-600" },
    { label: "Em andamento", value: pending.length, icon: Clock, accent: "bg-amber-500", iconBg: "bg-amber-50 text-amber-600" },
    { label: "Concluídos", value: completed, icon: CheckCircle, accent: "bg-emerald-500", iconBg: "bg-emerald-50 text-emerald-600" },
    { label: "Notificações", value: unread.length, icon: Bell, accent: "bg-rose-500", iconBg: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="animate-in-view relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Clapperboard className="h-4 w-4 text-primary/60" />
            <span className="text-[11px] font-semibold text-primary/60 uppercase tracking-widest">Dashboard</span>
          </div>
          <h1 className="font-heading text-3xl mt-1">
            Olá, {session?.user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          {total > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 max-w-48 h-2 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-medium text-primary">{progress}% concluído</span>
            </div>
          )}
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/5" />
        <div className="absolute -bottom-8 -right-4 h-24 w-24 rounded-full bg-primary/3" />
      </div>

      {/* Stats */}
      <div className="animate-in-view stagger-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card-elevated bg-card rounded-xl p-4 border transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", stat.iconBg)}>
                <stat.icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <div className={cn("h-1 w-8 rounded-full", stat.accent, "opacity-40")} />
            </div>
          </div>
        ))}
      </div>

      {/* Pending weeks */}
      <div className="animate-in-view stagger-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-xl">Em andamento</h2>
          </div>
          <Link href="/escalas" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {pending.length === 0 ? (
          <div className="card-elevated border rounded-xl bg-card p-14 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/15 mb-3" />
            <p className="text-sm text-muted-foreground/50">Nenhuma semana em andamento</p>
            <p className="text-xs text-muted-foreground/30 mt-1">Crie uma escala para comecar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pending.slice(0, 6).map((week: any) => {
              const step = STEPS.find((s) => s.key === week.status) || STEPS[0];
              const overdue = week.deadline ? isBefore(parseLocalDate(week.deadline), new Date()) : false;
              return (
                <Link
                  key={`${week.scaleId}-${week.number}`}
                  href={`/escalas/${week.scaleId}`}
                  className={cn(
                    "bg-card border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all group cursor-pointer overflow-hidden block",
                    "border-t-[3px]",
                    PHASE_BORDER[week.status] || "border-t-muted"
                  )}
                >
                  {/* Topo: badge fase + pill semana */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                      step.tagBg
                    )}>
                      <step.icon className="h-2.5 w-2.5" />
                      {step.label}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      S{week.number}
                    </span>
                  </div>

                  {/* Tema */}
                  <p className="font-heading text-base font-semibold mt-3 group-hover:text-primary transition-colors leading-tight">
                    {week.theme}
                  </p>

                  {/* Nome da escala */}
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{week.scaleTitle}</p>

                  {/* Rodapé */}
                  <div className="flex items-center justify-between mt-4">
                    {week.deadline ? (
                      <span className={cn(
                        "text-xs flex items-center gap-1",
                        overdue ? "text-red-500 font-medium" : "text-muted-foreground/70"
                      )}>
                        <Calendar className="h-3 w-3" />
                        {format(parseLocalDate(week.deadline), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      Abrir <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Notifications */}
      {unread.length > 0 && (
        <div className="animate-in-view stagger-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-rose-500" />
              <h2 className="font-heading text-xl">Notificações</h2>
              <span className="text-[10px] font-bold bg-rose-500 text-white rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                {unread.length}
              </span>
            </div>
            <Link href="/notificacoes" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="card-elevated border rounded-xl bg-card divide-y overflow-hidden">
            {unread.slice(0, 4).map((n: any) => (
              <div key={n._id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-accent/20 transition-colors">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0 animate-pulse-ring" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(n.createdAt), "dd/MM 'as' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
