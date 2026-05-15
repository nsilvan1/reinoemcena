"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  Bell,
  TrendingUp,
  Clapperboard,
  PenLine,
  Mic,
  Film,
  Eye,
  AlertTriangle,
  AlertCircle,
  Layers,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { STEPS } from "@/components/pipeline/mini-pipeline";

interface PendingTask {
  scaleId: string;
  scaleTitle: string;
  weekNumber: number;
  theme: string;
  status: "roteiro" | "gravacao" | "edicao" | "revisao" | "concluido";
  deadline: string;
  role: "roteirista" | "narrador" | "editor";
  hint: string;
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewReason?: string;
}

interface PendingReview {
  scaleId: string;
  scaleTitle: string;
  weekNumber: number;
  theme: string;
  editorId: string;
  editorName: string;
  reviewStatus: "pending" | "approved" | "rejected";
}

interface UpcomingDeadline {
  scaleId: string;
  scaleTitle: string;
  weekNumber: number;
  theme: string;
  status: PendingTask["status"];
  deadline: string;
  daysRemaining: number;
  overdue: boolean;
}

interface DashboardData {
  myPendingTasks: PendingTask[];
  pendingReviews: PendingReview[];
  upcomingDeadlines: UpcomingDeadline[];
  phaseDistribution: Record<PendingTask["status"], number>;
  unreadCount: number;
  stats: {
    totalScales: number;
    totalWeeks: number;
    completedWeeks: number;
    progressPct: number;
    pendingWeeks: number;
  };
}

const ROLE_ICON = { roteirista: PenLine, narrador: Mic, editor: Film } as const;
const ROLE_STYLES = {
  roteirista: {
    badge: "bg-blue-100 text-blue-700",
    text: "text-blue-700",
    hoverBorder: "hover:border-blue-300",
  },
  narrador: {
    badge: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
    hoverBorder: "hover:border-amber-300",
  },
  editor: {
    badge: "bg-violet-100 text-violet-700",
    text: "text-violet-700",
    hoverBorder: "hover:border-violet-300",
  },
} as const;

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<Array<{ _id: string; message: string; createdAt: string; read: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/notifications").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([d, n]) => {
        if (d) setData(d);
        setNotifications(n);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read);
  const userRole = (session?.user as { role?: string })?.role ?? "membro";
  const canReview = ["admin", "coordenador"].includes(userRole);

  const stats = [
    { label: "Escalas", value: data.stats.totalScales, icon: Calendar, iconBg: "bg-blue-50 text-blue-600", accent: "bg-blue-500" },
    { label: "Em andamento", value: data.stats.pendingWeeks, icon: Clock, iconBg: "bg-amber-50 text-amber-600", accent: "bg-amber-500" },
    { label: "Concluídos", value: data.stats.completedWeeks, icon: CheckCircle, iconBg: "bg-emerald-50 text-emerald-600", accent: "bg-emerald-500" },
    { label: "Notificações", value: unread.length, icon: Bell, iconBg: "bg-rose-50 text-rose-600", accent: "bg-rose-500" },
  ];

  const PIPELINE_ORDER: Array<{ key: PendingTask["status"]; label: string; text: string; bg: string; bar: string }> = [
    { key: "roteiro", label: "Roteiro", text: "text-blue-700", bg: "bg-blue-50", bar: "bg-blue-500" },
    { key: "gravacao", label: "Gravação", text: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-500" },
    { key: "edicao", label: "Edição", text: "text-violet-700", bg: "bg-violet-50", bar: "bg-violet-500" },
    { key: "revisao", label: "Revisão", text: "text-orange-700", bg: "bg-orange-50", bar: "bg-orange-500" },
    { key: "concluido", label: "Concluído", text: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500" },
  ];

  const hasNothing =
    data.myPendingTasks.length === 0 &&
    data.pendingReviews.length === 0 &&
    data.upcomingDeadlines.length === 0;

  return (
    <div className="space-y-5">
      {/* Header row: Welcome (left) + Stats compact (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in-view">
        {/* Welcome banner */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border p-5">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Clapperboard className="h-4 w-4 text-primary/60" />
              <span className="text-[11px] font-semibold text-primary/60 uppercase tracking-widest">Dashboard</span>
            </div>
            <h1 className="font-heading text-2xl lg:text-3xl mt-1">
              Olá, {session?.user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            {data.stats.totalWeeks > 0 && (
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 max-w-48 h-2 rounded-full bg-primary/10 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${data.stats.progressPct}%` }} />
                </div>
                <span className="text-xs font-medium text-primary">{data.stats.progressPct}% concluído</span>
              </div>
            )}
          </div>
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/5" />
          <div className="absolute -bottom-8 -right-4 h-24 w-24 rounded-full bg-primary/3" />
        </div>

        {/* Stats — 2x2 compactas ao lado do banner */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="card-elevated bg-card rounded-xl p-3 border transition-all hover:-translate-y-0.5">
              <div className="flex items-center gap-2">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", stat.iconBg)}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tracking-tight leading-none">{stat.value}</p>
                  <p className="text-[10px] font-medium text-muted-foreground mt-1 truncate">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state full width */}
      {hasNothing && unread.length === 0 && (
        <div className="animate-in-view stagger-2 card-elevated border rounded-xl bg-card p-14 text-center">
          <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/15 mb-3" />
          <p className="text-sm text-muted-foreground/50">Nada pendente pra você agora</p>
          <p className="text-xs text-muted-foreground/30 mt-1">Tudo no ritmo</p>
        </div>
      )}

      {!hasNothing && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT COLUMN — 7/12: tarefas + prazos */}
          <div className="lg:col-span-7 space-y-4">
            {/* My pending tasks */}
            {data.myPendingTasks.length > 0 && (
              <section className="animate-in-view stagger-2">
                <SectionHeader
                  icon={AlertCircle}
                  iconColor="text-primary"
                  title="Suas tarefas"
                  badge={{ count: data.myPendingTasks.length, color: "bg-primary" }}
                />
                <div className="grid grid-cols-1 gap-2.5">
                  {data.myPendingTasks.map((t) => {
                    const Icon = ROLE_ICON[t.role];
                    const styles = ROLE_STYLES[t.role];
                    const wasRejected = t.reviewStatus === "rejected";
                    const deadline = t.deadline ? new Date(t.deadline) : null;
                    const overdue = deadline && deadline < new Date();
                    return (
                      <Link
                        key={`${t.scaleId}-${t.weekNumber}`}
                        href={`/escalas/${t.scaleId}`}
                        className={cn(
                          "block bg-card border rounded-xl p-3.5 hover:shadow-md transition-all group",
                          wasRejected ? "border-red-300 hover:border-red-400" : styles.hoverBorder
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                              wasRejected ? "bg-red-100 text-red-700" : styles.badge
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                wasRejected ? "text-red-700" : styles.text
                              )}>
                                {t.hint}
                              </span>
                              {wasRejected && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-1 rounded">
                                  Refazer
                                </span>
                              )}
                            </div>
                            <p className="font-heading text-base font-semibold truncate group-hover:text-primary transition-colors">
                              {t.theme}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {t.scaleTitle} · Semana {t.weekNumber}
                            </p>
                            {wasRejected && t.reviewReason && (
                              <p className="text-[11px] text-red-700 mt-1.5 italic line-clamp-2">
                                “{t.reviewReason}”
                              </p>
                            )}
                            {deadline && (
                              <p
                                className={cn(
                                  "text-[11px] mt-1.5 flex items-center gap-1",
                                  overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                                )}
                              >
                                <Calendar className="h-3 w-3" />
                                {overdue
                                  ? `Atrasado há ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`
                                  : `Em ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Upcoming deadlines */}
            {data.upcomingDeadlines.length > 0 && (
              <section className="animate-in-view stagger-3">
                <SectionHeader
                  icon={AlertTriangle}
                  iconColor="text-amber-600"
                  title="Prazos próximos"
                  badge={{ count: data.upcomingDeadlines.length, color: "bg-amber-500" }}
                />
                <div className="card-elevated border rounded-xl bg-card overflow-hidden divide-y">
                  {data.upcomingDeadlines.map((d) => {
                    const step = STEPS.find((s) => s.key === d.status) || STEPS[0];
                    return (
                      <Link
                        key={`${d.scaleId}-${d.weekNumber}`}
                        href={`/escalas/${d.scaleId}`}
                        className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/30 transition-colors group"
                      >
                        <span
                          className={cn(
                            "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                            step.tagBg
                          )}
                        >
                          <step.icon className="h-2.5 w-2.5" />
                          {step.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {d.theme}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {d.scaleTitle} · S{d.weekNumber}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium shrink-0",
                            d.overdue
                              ? "text-red-600"
                              : d.daysRemaining <= 2
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          )}
                        >
                          {d.overdue
                            ? `Atrasado há ${Math.abs(d.daysRemaining)}d`
                            : d.daysRemaining === 0
                              ? "Hoje"
                              : `Em ${d.daysRemaining}d`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN — 5/12: revisão + pipeline + notificações */}
          <div className="lg:col-span-5 space-y-4">
            {/* Pending reviews (apenas coordenador+) */}
            {canReview && data.pendingReviews.length > 0 && (
              <section className="animate-in-view stagger-2">
                <SectionHeader
                  icon={Eye}
                  iconColor="text-orange-600"
                  title="Aguardando sua revisão"
                  badge={{ count: data.pendingReviews.length, color: "bg-orange-500" }}
                />
                <div className="card-elevated border rounded-xl bg-card divide-y overflow-hidden">
                  {data.pendingReviews.map((r) => (
                    <Link
                      key={`${r.scaleId}-${r.weekNumber}-${r.editorId}`}
                      href={`/escalas/${r.scaleId}`}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-orange-50/40 transition-colors group"
                    >
                      <div className="h-7 w-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {r.editorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">
                          <span className="text-orange-700">{r.editorName}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {r.scaleTitle} · S{r.weekNumber} · {r.theme}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Pipeline distribution */}
            {data.stats.totalWeeks > 0 && (
              <section className="animate-in-view stagger-3">
                <SectionHeader
                  icon={Layers}
                  iconColor="text-primary"
                  title="Pipeline"
                />
                <div className="card-elevated border rounded-xl bg-card p-3">
                  <div className="space-y-1.5">
                    {PIPELINE_ORDER.map((p) => {
                      const count = data.phaseDistribution[p.key] || 0;
                      const pct = data.stats.totalWeeks > 0 ? (count / data.stats.totalWeeks) * 100 : 0;
                      return (
                        <div key={p.key} className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider w-20 shrink-0", p.text)}>
                            {p.label}
                          </span>
                          <div className="flex-1 h-5 bg-muted/40 rounded-md overflow-hidden relative">
                            <div
                              className={cn("h-full rounded-md transition-all duration-500", p.bar, "opacity-80")}
                              style={{ width: `${pct}%` }}
                            />
                            <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-foreground/80">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Notifications */}
            {unread.length > 0 && (
              <section className="animate-in-view stagger-4">
                <SectionHeader
                  icon={Bell}
                  iconColor="text-rose-500"
                  title="Notificações"
                  badge={{ count: unread.length, color: "bg-rose-500" }}
                  rightLink={{ href: "/notificacoes", label: "Ver todas" }}
                />
                <div className="card-elevated border rounded-xl bg-card divide-y overflow-hidden">
                  {unread.slice(0, 4).map((n) => (
                    <div key={n._id} className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-accent/20 transition-colors">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse-ring" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-tight line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(n.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  iconColor,
  title,
  badge,
  rightLink,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  badge?: { count: number; color: string };
  rightLink?: { href: string; label: string };
}) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <h2 className="font-heading text-base">{title}</h2>
        {badge && (
          <span className={cn("text-[10px] font-bold text-white rounded-full h-4 min-w-4 flex items-center justify-center px-1", badge.color)}>
            {badge.count}
          </span>
        )}
      </div>
      {rightLink && (
        <Link href={rightLink.href} className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5">
          {rightLink.label} <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      )}
    </div>
  );
}
