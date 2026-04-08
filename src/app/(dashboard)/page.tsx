"use client";
import { useEffect, useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar, FileText, CheckCircle, Clock, ArrowRight, Bell,
  PenLine, Mic, Film, Eye, CircleCheck, TrendingUp, Clapperboard,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "roteiro", label: "Roteiro", icon: PenLine, color: "text-blue-600", bg: "bg-blue-600", dot: "bg-blue-500", light: "bg-blue-50" },
  { key: "gravacao", label: "Gravacao", icon: Mic, color: "text-amber-600", bg: "bg-amber-600", dot: "bg-amber-500", light: "bg-amber-50" },
  { key: "edicao", label: "Edicao", icon: Film, color: "text-violet-600", bg: "bg-violet-600", dot: "bg-violet-500", light: "bg-violet-50" },
  { key: "revisao", label: "Revisao", icon: Eye, color: "text-orange-600", bg: "bg-orange-600", dot: "bg-orange-500", light: "bg-orange-50" },
  { key: "concluido", label: "Concluido", icon: CircleCheck, color: "text-emerald-600", bg: "bg-emerald-600", dot: "bg-emerald-500", light: "bg-emerald-50" },
];

function MiniPipeline({ status }: { status: string }) {
  const idx = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-px">
      {STEPS.map((step, i) => (
        <Fragment key={step.key}>
          <div className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center transition-all",
            i === idx ? `${step.bg} text-white` :
            i < idx ? "bg-emerald-500 text-white" :
            "bg-muted text-muted-foreground/20"
          )}>
            {i < idx ? (
              <CheckCircle className="h-2.5 w-2.5" />
            ) : (
              <step.icon className="h-2.5 w-2.5" />
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("w-1.5 h-0.5 rounded-full", i < idx ? "bg-emerald-300" : "bg-muted")} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

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
    { label: "Concluidos", value: completed, icon: CheckCircle, accent: "bg-emerald-500", iconBg: "bg-emerald-50 text-emerald-600" },
    { label: "Notificacoes", value: unread.length, icon: Bell, accent: "bg-rose-500", iconBg: "bg-rose-50 text-rose-600" },
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
            Ola, {session?.user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          {total > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 max-w-48 h-2 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-medium text-primary">{progress}% concluido</span>
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
          <div className="card-elevated border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left w-14">#</th>
                  <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left">Tema</th>
                  <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left hidden sm:table-cell">Escala</th>
                  <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left hidden md:table-cell w-24">Prazo</th>
                  <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left">Pipeline</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 8).map((week: any) => {
                  const step = STEPS.find((s) => s.key === week.status) || STEPS[0];
                  return (
                    <tr key={`${week.scaleId}-${week.number}`} className="border-b last:border-0 hover:bg-accent/30 transition-colors group">
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">S{week.number}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/escalas/${week.scaleId}`} className="font-medium hover:text-primary transition-colors">
                          {week.theme}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{week.scaleTitle}</td>
                      <td className="px-4 py-3.5 text-muted-foreground tabular-nums text-xs hidden md:table-cell">
                        {format(new Date(week.deadline), "dd MMM", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <MiniPipeline status={week.status} />
                          <span className={cn("text-[10px] font-semibold uppercase", step.color)}>{step.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/escalas/${week.scaleId}`}>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/15 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notifications */}
      {unread.length > 0 && (
        <div className="animate-in-view stagger-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-rose-500" />
              <h2 className="font-heading text-xl">Notificacoes</h2>
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
