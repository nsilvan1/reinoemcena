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
  PenLine,
  Mic,
  Film,
  Eye,
  AlertTriangle,
  Sparkles,
  Plus,
  CircleCheck,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const ROLE_THEME = {
  roteirista: {
    icon: PenLine,
    gradient: "from-blue-500 to-blue-600",
    soft: "from-blue-50 to-blue-100/60",
    text: "text-blue-700",
    bg: "bg-blue-500",
    ring: "ring-blue-200",
    chip: "bg-blue-100 text-blue-700",
    border: "border-blue-200",
  },
  narrador: {
    icon: Mic,
    gradient: "from-amber-500 to-amber-600",
    soft: "from-amber-50 to-amber-100/60",
    text: "text-amber-700",
    bg: "bg-amber-500",
    ring: "ring-amber-200",
    chip: "bg-amber-100 text-amber-700",
    border: "border-amber-200",
  },
  editor: {
    icon: Film,
    gradient: "from-violet-500 to-violet-600",
    soft: "from-violet-50 to-violet-100/60",
    text: "text-violet-700",
    bg: "bg-violet-500",
    ring: "ring-violet-200",
    chip: "bg-violet-100 text-violet-700",
    border: "border-violet-200",
  },
} as const;

const PHASE_THEME = {
  roteiro: { icon: PenLine, label: "Roteiro", text: "text-blue-700", bg: "bg-blue-500", soft: "bg-blue-50", border: "border-blue-200" },
  gravacao: { icon: Mic, label: "Gravação", text: "text-amber-700", bg: "bg-amber-500", soft: "bg-amber-50", border: "border-amber-200" },
  edicao: { icon: Film, label: "Edição", text: "text-violet-700", bg: "bg-violet-500", soft: "bg-violet-50", border: "border-violet-200" },
  revisao: { icon: Eye, label: "Revisão", text: "text-orange-700", bg: "bg-orange-500", soft: "bg-orange-50", border: "border-orange-200" },
  concluido: { icon: CircleCheck, label: "Concluído", text: "text-emerald-700", bg: "bg-emerald-500", soft: "bg-emerald-50", border: "border-emerald-200" },
} as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

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
      <div className="space-y-5">
        <div className="h-20 bg-muted/40 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-48 bg-muted/40 animate-pulse rounded-2xl" />
          <div className="h-48 bg-muted/40 animate-pulse rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read);
  const userRole = (session?.user as { role?: string })?.role ?? "membro";
  const canReview = ["admin", "coordenador"].includes(userRole);
  const userName = session?.user?.name?.split(" ")[0] ?? "";
  const userInitial = userName.charAt(0).toUpperCase();

  const heroTask = data.myPendingTasks[0];
  const heroReview = !heroTask && canReview ? data.pendingReviews[0] : null;
  const heroDeadline = !heroTask && !heroReview ? data.upcomingDeadlines[0] : null;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-4 flex-wrap animate-in-view">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center font-heading text-lg font-semibold shadow-sm shadow-primary/20">
            {userInitial}
          </div>
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl leading-tight">
              {greeting()}, {userName}
            </h1>
            <p className="text-xs text-muted-foreground/70 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span className="mx-1.5">·</span>
              {data.stats.progressPct}% do mês concluído
            </p>
          </div>
        </div>
        {canReview && (
          <Link
            href="/escalas"
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold shadow-sm shadow-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova escala
          </Link>
        )}
      </header>

      {/* ── HERO + STATS row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in-view stagger-1">
        {/* HERO card */}
        <div className="lg:col-span-2">
          {heroTask ? <HeroTask task={heroTask} /> : heroReview ? <HeroReview review={heroReview} /> : heroDeadline ? <HeroDeadline d={heroDeadline} /> : <HeroAllClear />}
        </div>

        {/* Stats vertical 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Escalas" value={data.stats.totalScales} icon={Calendar} hue="blue" />
          <StatCard label="Em andamento" value={data.stats.pendingWeeks} icon={Clock} hue="amber" />
          <StatCard label="Concluídos" value={data.stats.completedWeeks} icon={CheckCircle} hue="emerald" />
          <StatCard label="Notificações" value={unread.length} icon={Bell} hue="rose" />
        </div>
      </div>

      {/* ── Pipeline funnel ── */}
      {data.stats.totalWeeks > 0 && (
        <section className="animate-in-view stagger-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-2.5 px-1">
            Pipeline
          </h2>
          <div className="card-elevated border rounded-2xl bg-card p-2 grid grid-cols-5 gap-1.5">
            {(Object.keys(PHASE_THEME) as Array<keyof typeof PHASE_THEME>).map((key) => {
              const phase = PHASE_THEME[key];
              const count = data.phaseDistribution[key] || 0;
              const pct = data.stats.totalWeeks > 0 ? Math.round((count / data.stats.totalWeeks) * 100) : 0;
              const Icon = phase.icon;
              return (
                <div
                  key={key}
                  className={cn(
                    "relative rounded-xl p-3 transition-all overflow-hidden",
                    phase.soft,
                    "hover:scale-[1.02] hover:shadow-sm cursor-default"
                  )}
                >
                  <div className="relative z-10 flex items-start justify-between">
                    <Icon className={cn("h-3.5 w-3.5", phase.text)} />
                    <span className={cn("font-heading text-2xl font-semibold leading-none", phase.text)}>
                      {count}
                    </span>
                  </div>
                  <p className={cn("relative z-10 text-[9px] font-bold uppercase tracking-wider mt-2", phase.text)}>
                    {phase.label}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/70">
                    <div className={cn("h-full transition-all duration-700", phase.bg)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Two columns: tasks/deadlines | reviews/notifications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT */}
        <div className="lg:col-span-7 space-y-5">
          {data.myPendingTasks.length > 1 && (
            <section className="animate-in-view stagger-3">
              <SectionHeader
                eyebrow="Suas tarefas"
                title={`${data.myPendingTasks.length} pendentes`}
              />
              <div className="space-y-2.5">
                {data.myPendingTasks.slice(1).map((t) => (
                  <TaskCard key={`${t.scaleId}-${t.weekNumber}`} task={t} />
                ))}
              </div>
            </section>
          )}

          {data.upcomingDeadlines.length > 0 && (
            <section className="animate-in-view stagger-4">
              <SectionHeader
                eyebrow="Prazos"
                title="Próximos a vencer"
                icon={AlertTriangle}
                iconColor="text-amber-600"
              />
              <div className="space-y-2">
                {data.upcomingDeadlines.map((d) => (
                  <DeadlineRow key={`${d.scaleId}-${d.weekNumber}`} d={d} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT */}
        <aside className="lg:col-span-5 space-y-5">
          {canReview && data.pendingReviews.length > 0 && (
            <section className="animate-in-view stagger-3">
              <SectionHeader
                eyebrow="Revisão"
                title="Aguardando você"
                badge={data.pendingReviews.length}
                badgeColor="bg-orange-500"
              />
              <div className="card-elevated border-orange-200/60 border rounded-2xl bg-gradient-to-br from-orange-50/30 to-card divide-y divide-orange-100/60 overflow-hidden">
                {data.pendingReviews.map((r) => (
                  <Link
                    key={`${r.scaleId}-${r.weekNumber}-${r.editorId}`}
                    href={`/escalas/${r.scaleId}`}
                    className="flex items-center gap-3 p-3 hover:bg-orange-50/40 transition-colors group"
                  >
                    <div className="relative">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-heading text-sm font-semibold shadow-sm shadow-orange-300/40">
                        {r.editorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white border-2 border-white">
                        <div className="h-full w-full rounded-full bg-orange-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{r.editorName}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        S{r.weekNumber} · {r.theme}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-orange-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {unread.length > 0 && (
            <section className="animate-in-view stagger-4">
              <SectionHeader
                eyebrow="Atividade"
                title="Notificações"
                badge={unread.length}
                badgeColor="bg-rose-500"
                rightLink={{ href: "/notificacoes", label: "Ver todas" }}
              />
              <div className="card-elevated border rounded-2xl bg-card overflow-hidden divide-y">
                {unread.slice(0, 5).map((n) => (
                  <div key={n._id} className="flex items-start gap-2.5 p-3 hover:bg-accent/20 transition-colors">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse-ring" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider font-semibold">
                        {format(new Date(n.createdAt), "dd MMM · HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── HERO variants ─────────────────────────────────────────────────────────

function HeroTask({ task }: { task: PendingTask }) {
  const theme = ROLE_THEME[task.role];
  const Icon = theme.icon;
  const wasRejected = task.reviewStatus === "rejected";
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const overdue = deadline && deadline < new Date();

  return (
    <Link
      href={`/escalas/${task.scaleId}`}
      className={cn(
        "group relative block rounded-2xl overflow-hidden h-full min-h-[12rem] p-6",
        "bg-gradient-to-br",
        wasRejected ? "from-red-500 to-red-600 ring-red-200" : theme.gradient,
        "text-white shadow-lg shadow-black/5 transition-all hover:shadow-xl hover:scale-[1.005]"
      )}
    >
      {/* Decorative orbs */}
      <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 right-1/4 h-28 w-28 rounded-full bg-white/5 blur-xl" />
      <Icon className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 -rotate-12" strokeWidth={1.5} />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
            {wasRejected ? "Refazer entrega" : "Próxima tarefa"}
          </span>
          {wasRejected && (
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[9px] font-bold uppercase tracking-wider">
              Ajuste solicitado
            </span>
          )}
        </div>
        <div className="mt-3">
          <h2 className="font-heading text-2xl lg:text-3xl font-semibold leading-tight">
            {task.theme}
          </h2>
          <p className="text-sm text-white/85 mt-1">
            {task.hint} · {task.scaleTitle} · Semana {task.weekNumber}
          </p>
        </div>

        {wasRejected && task.reviewReason && (
          <p className="mt-3 text-[12px] text-white/95 italic line-clamp-2 leading-relaxed">
            “{task.reviewReason}”
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          {deadline && (
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 opacity-80" />
              <span className={cn("font-medium", overdue && "text-white")}>
                {overdue
                  ? `Atrasado há ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`
                  : `Vence em ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`}
              </span>
            </div>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full group-hover:bg-white/25 transition-colors">
            Abrir <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroReview({ review }: { review: PendingReview }) {
  return (
    <Link
      href={`/escalas/${review.scaleId}`}
      className="group relative block rounded-2xl overflow-hidden h-full min-h-[12rem] p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-black/5 transition-all hover:shadow-xl hover:scale-[1.005]"
    >
      <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <Eye className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 -rotate-12" strokeWidth={1.5} />

      <div className="relative z-10 flex flex-col h-full">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
          Sua revisão
        </span>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center font-heading text-2xl font-semibold">
            {review.editorName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-2xl font-semibold leading-tight truncate">
              {review.editorName}
            </h2>
            <p className="text-sm text-white/85">aguarda sua aprovação</p>
          </div>
        </div>
        <p className="text-sm text-white/85 mt-3 line-clamp-1">
          {review.scaleTitle} · S{review.weekNumber} · {review.theme}
        </p>
        <div className="mt-auto pt-4 flex items-center justify-end">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full group-hover:bg-white/25 transition-colors">
            Revisar agora <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroDeadline({ d }: { d: UpcomingDeadline }) {
  const phase = PHASE_THEME[d.status];
  const Icon = phase.icon;
  return (
    <Link
      href={`/escalas/${d.scaleId}`}
      className={cn(
        "group relative block rounded-2xl overflow-hidden h-full min-h-[12rem] p-6",
        "bg-gradient-to-br",
        d.overdue ? "from-red-500 to-red-600" : `${phase.bg} from-${phase.bg.replace("bg-", "")}`,
        "text-white shadow-lg shadow-black/5 transition-all hover:shadow-xl hover:scale-[1.005]"
      )}
      style={{
        backgroundImage: d.overdue
          ? undefined
          : "linear-gradient(to bottom right, var(--tw-gradient-stops))",
      }}
    >
      <div className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <Icon className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 -rotate-12" strokeWidth={1.5} />
      <div className="relative z-10 flex flex-col h-full">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
          Próximo prazo · {phase.label}
        </span>
        <h2 className="font-heading text-2xl lg:text-3xl font-semibold leading-tight mt-3">{d.theme}</h2>
        <p className="text-sm text-white/85 mt-1">
          {d.scaleTitle} · Semana {d.weekNumber}
        </p>
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="text-xs flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 opacity-80" />
            {d.overdue ? `Atrasado há ${Math.abs(d.daysRemaining)}d` : d.daysRemaining === 0 ? "Hoje" : `Em ${d.daysRemaining} dias`}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
            Abrir <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroAllClear() {
  return (
    <div className="relative h-full min-h-[12rem] rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-50/30 to-card border border-emerald-200/60 p-6 overflow-hidden">
      <Sparkles className="absolute -right-2 -bottom-2 h-32 w-32 text-emerald-200/40 -rotate-12" strokeWidth={1.2} />
      <div className="relative z-10 flex flex-col h-full">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700/80">
          Tudo em dia
        </span>
        <h2 className="font-heading text-3xl text-emerald-800 mt-3 leading-tight">
          Nada urgente pra você agora
        </h2>
        <p className="text-sm text-emerald-700/70 mt-2">
          Acompanhe o time pelo painel ao lado ou explore o acervo.
        </p>
        <div className="mt-auto pt-4">
          <Link
            href="/acervo"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-emerald-600 text-white px-3 py-2 rounded-full hover:bg-emerald-700 transition-colors"
          >
            Ver acervo <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  hue,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hue: "blue" | "amber" | "emerald" | "rose";
}) {
  const styles = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-600", border: "border-blue-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600", border: "border-amber-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-600", border: "border-emerald-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", icon: "text-rose-600", border: "border-rose-100" },
  }[hue];

  return (
    <div className={cn("relative rounded-2xl p-4 border overflow-hidden transition-all hover:-translate-y-0.5", styles.bg, styles.border)}>
      <Icon className={cn("absolute -right-2 -bottom-2 h-16 w-16 opacity-15", styles.icon)} strokeWidth={1.5} />
      <div className="relative">
        <p className="font-heading text-3xl font-semibold leading-none">
          <span className={styles.text}>{value}</span>
        </p>
        <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-2", styles.text)}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Task card (secondary, after hero) ─────────────────────────────────────

function TaskCard({ task }: { task: PendingTask }) {
  const theme = ROLE_THEME[task.role];
  const Icon = theme.icon;
  const wasRejected = task.reviewStatus === "rejected";
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const overdue = deadline && deadline < new Date();

  return (
    <Link
      href={`/escalas/${task.scaleId}`}
      className={cn(
        "group relative block rounded-2xl border bg-card hover:shadow-md transition-all overflow-hidden",
        wasRejected ? "border-red-200" : theme.border
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", wasRejected ? "bg-red-500" : theme.bg)} />
      <div className="pl-4 pr-3 py-3 flex items-center gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
            wasRejected ? "bg-red-100 text-red-700" : theme.chip
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", wasRejected ? "text-red-700" : theme.text)}>
              {task.hint}
            </span>
            {wasRejected && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-1 rounded">
                Refazer
              </span>
            )}
          </div>
          <p className="font-heading text-base font-semibold truncate group-hover:text-primary transition-colors">
            {task.theme}
          </p>
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {task.scaleTitle} · S{task.weekNumber}
          </p>
        </div>
        {deadline && (
          <span
            className={cn(
              "text-[11px] font-semibold shrink-0",
              overdue ? "text-red-600" : "text-muted-foreground/80"
            )}
          >
            {overdue ? `−${formatDistanceToNowStrict(deadline, { locale: ptBR, unit: "day" }).replace(/[^\d]/g, "")}d` : formatDistanceToNowStrict(deadline, { locale: ptBR, unit: "day" }).replace(/[^\d]/g, "") + "d"}
          </span>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}

// ─── Deadline row ──────────────────────────────────────────────────────────

function DeadlineRow({ d }: { d: UpcomingDeadline }) {
  const phase = PHASE_THEME[d.status];
  const Icon = phase.icon;
  return (
    <Link
      href={`/escalas/${d.scaleId}`}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border bg-card p-3 hover:shadow-sm transition-all overflow-hidden",
        d.overdue ? "border-red-200/70" : phase.border
      )}
    >
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", phase.soft)}>
        <Icon className={cn("h-4 w-4", phase.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors leading-tight">
          {d.theme}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", phase.text)}>
            {phase.label}
          </span>
          <span className="text-[10px] text-muted-foreground/60">·</span>
          <span className="text-[10px] text-muted-foreground/70 truncate">
            {d.scaleTitle} · S{d.weekNumber}
          </span>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 text-[11px] font-bold rounded-full px-2.5 py-1",
          d.overdue
            ? "bg-red-100 text-red-700"
            : d.daysRemaining <= 2
              ? "bg-amber-100 text-amber-700"
              : "bg-muted text-muted-foreground"
        )}
      >
        {d.overdue ? `${Math.abs(d.daysRemaining)}d atrasado` : d.daysRemaining === 0 ? "Hoje" : `${d.daysRemaining}d`}
      </span>
    </Link>
  );
}

// ─── Section header ────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  icon: Icon,
  iconColor,
  badge,
  badgeColor,
  rightLink,
}: {
  eyebrow?: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badge?: number;
  badgeColor?: string;
  rightLink?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-2 mb-2.5 px-1">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {Icon && <Icon className={cn("h-4 w-4", iconColor || "text-primary")} />}
          <h2 className="font-heading text-lg leading-none">{title}</h2>
          {badge !== undefined && badge > 0 && (
            <span className={cn("text-[10px] font-bold text-white rounded-full h-4 min-w-4 flex items-center justify-center px-1", badgeColor || "bg-primary")}>
              {badge}
            </span>
          )}
        </div>
      </div>
      {rightLink && (
        <Link href={rightLink.href} className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5 shrink-0">
          {rightLink.label} <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      )}
    </div>
  );
}
