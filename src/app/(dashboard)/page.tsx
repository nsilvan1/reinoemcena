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
  roteirista: { icon: PenLine, dot: "bg-blue-500", text: "text-blue-700", soft: "bg-blue-50", border: "border-blue-200", accent: "bg-blue-100/60" },
  narrador: { icon: Mic, dot: "bg-amber-500", text: "text-amber-700", soft: "bg-amber-50", border: "border-amber-200", accent: "bg-amber-100/60" },
  editor: { icon: Film, dot: "bg-violet-500", text: "text-violet-700", soft: "bg-violet-50", border: "border-violet-200", accent: "bg-violet-100/60" },
} as const;

const PHASE_THEME = {
  roteiro: { icon: PenLine, label: "Roteiro", dot: "bg-blue-500", text: "text-blue-700", soft: "bg-blue-50" },
  gravacao: { icon: Mic, label: "Gravação", dot: "bg-amber-500", text: "text-amber-700", soft: "bg-amber-50" },
  edicao: { icon: Film, label: "Edição", dot: "bg-violet-500", text: "text-violet-700", soft: "bg-violet-50" },
  revisao: { icon: Eye, label: "Revisão", dot: "bg-orange-500", text: "text-orange-700", soft: "bg-orange-50" },
  concluido: { icon: CircleCheck, label: "Concluído", dot: "bg-emerald-500", text: "text-emerald-700", soft: "bg-emerald-50" },
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
        <div className="h-20 skeleton rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-48 skeleton rounded-2xl" />
          <div className="h-48 skeleton rounded-2xl" />
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
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-heading text-lg font-semibold shadow-sm shadow-primary/15 ring-1 ring-primary/10">
            {userInitial}
          </div>
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl leading-tight tracking-tight">
              {greeting()}, {userName}
            </h1>
            <p className="text-xs text-muted-foreground/70 capitalize mt-0.5">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span className="mx-2 text-muted-foreground/30">·</span>
              <span className="text-primary/80 font-medium">{data.stats.progressPct}%</span>
              <span className="text-muted-foreground/70"> do mês concluído</span>
            </p>
          </div>
        </div>
        {canReview && (
          <Link
            href="/escalas"
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold shadow-sm shadow-primary/15"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova escala
          </Link>
        )}
      </header>

      {/* ── HERO + STATS row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in-view stagger-1">
        <div className="lg:col-span-2">
          {heroTask ? <HeroTask task={heroTask} /> : heroReview ? <HeroReview review={heroReview} /> : heroDeadline ? <HeroDeadline d={heroDeadline} /> : <HeroAllClear />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Escalas" value={data.stats.totalScales} icon={Calendar} hue="primary" />
          <StatCard label="Em andamento" value={data.stats.pendingWeeks} icon={Clock} hue="amber" />
          <StatCard label="Concluídos" value={data.stats.completedWeeks} icon={CheckCircle} hue="emerald" />
          <StatCard label="Notificações" value={unread.length} icon={Bell} hue="rose" />
        </div>
      </div>

      {/* ── Pipeline ── */}
      {data.stats.totalWeeks > 0 && (
        <section className="animate-in-view stagger-2">
          <SectionHeader eyebrow="Pipeline" title="Distribuição das semanas" />
          <div className="card-glass rounded-2xl p-5">
            <div className="flex items-center gap-2 lg:gap-4">
              {(Object.keys(PHASE_THEME) as Array<keyof typeof PHASE_THEME>).map((key, idx, arr) => {
                const phase = PHASE_THEME[key];
                const count = data.phaseDistribution[key] || 0;
                const Icon = phase.icon;
                const isLast = idx === arr.length - 1;
                return (
                  <div key={key} className="flex items-center gap-2 lg:gap-4 flex-1">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center relative", phase.soft)}>
                        <Icon className={cn("h-4 w-4", phase.text)} strokeWidth={2.2} />
                        {count > 0 && (
                          <span className={cn("absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-sm", phase.dot)}>
                            {count}
                          </span>
                        )}
                      </div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-2 text-center", phase.text)}>
                        {phase.label}
                      </p>
                    </div>
                    {!isLast && (
                      <div className="flex-1 h-px bg-gradient-to-r from-border via-border/50 to-border max-w-[40px] lg:max-w-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Two columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT */}
        <div className="lg:col-span-7 space-y-5">
          {data.myPendingTasks.length > 1 && (
            <section className="animate-in-view stagger-3">
              <SectionHeader eyebrow="Suas tarefas" title={`${data.myPendingTasks.length} pendentes`} />
              <div className="space-y-2">
                {data.myPendingTasks.slice(1).map((t) => (
                  <TaskCard key={`${t.scaleId}-${t.weekNumber}`} task={t} />
                ))}
              </div>
            </section>
          )}

          {data.upcomingDeadlines.length > 0 && (
            <section className="animate-in-view stagger-4">
              <SectionHeader eyebrow="Prazos" title="Próximos a vencer" />
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
              <SectionHeader eyebrow="Revisão" title="Aguardando você" badge={data.pendingReviews.length} />
              <div className="card-glass rounded-2xl overflow-hidden">
                {data.pendingReviews.map((r, i) => (
                  <Link
                    key={`${r.scaleId}-${r.weekNumber}-${r.editorId}`}
                    href={`/escalas/${r.scaleId}`}
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-primary/[0.03] transition-colors group",
                      i > 0 && "border-t"
                    )}
                  >
                    <div className="relative">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-100 to-orange-200/70 text-orange-700 flex items-center justify-center font-heading text-sm font-semibold ring-1 ring-orange-200/60">
                        {r.editorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-orange-500 ring-2 ring-card animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight text-foreground">{r.editorName}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        S{r.weekNumber} · {r.theme}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {unread.length > 0 && (
            <section className="animate-in-view stagger-4">
              <SectionHeader eyebrow="Atividade" title="Notificações" badge={unread.length} rightLink={{ href: "/notificacoes", label: "Ver todas" }} />
              <div className="card-glass rounded-2xl overflow-hidden">
                {unread.slice(0, 5).map((n, i) => (
                  <div key={n._id} className={cn("flex items-start gap-2.5 p-3 hover:bg-primary/[0.03] transition-colors", i > 0 && "border-t")}>
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-foreground">{n.message}</p>
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

// ─── HERO ──────────────────────────────────────────────────────────────────

function HeroShell({
  eyebrow,
  accentColor,
  children,
}: {
  eyebrow: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full min-h-[12rem] rounded-2xl overflow-hidden bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90 text-background p-6 shadow-lg shadow-foreground/10">
      {/* subtle decorative */}
      <div className={cn("absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-20 blur-3xl", accentColor)} />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-background/20 to-transparent" />
      <div className="relative z-10 flex flex-col h-full">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-background/55">
          {eyebrow}
        </span>
        {children}
      </div>
    </div>
  );
}

function HeroTask({ task }: { task: PendingTask }) {
  const theme = ROLE_THEME[task.role];
  const Icon = theme.icon;
  const wasRejected = task.reviewStatus === "rejected";
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const overdue = deadline && deadline < new Date();
  const accentColor = wasRejected ? "bg-red-500" : theme.dot;

  return (
    <Link href={`/escalas/${task.scaleId}`} className="block group">
      <HeroShell
        eyebrow={wasRejected ? "Refazer entrega" : "Sua próxima tarefa"}
        accentColor={accentColor}
      >
        <div className="flex items-start gap-3 mt-3">
          <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", "bg-background/10 backdrop-blur-sm ring-1 ring-background/15")}>
            <Icon className="h-5 w-5 text-background" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-2xl lg:text-3xl font-semibold leading-tight tracking-tight">
              {task.theme}
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-background/75">
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", accentColor)} />
              <span className="font-medium">{task.hint}</span>
              <span className="text-background/40">·</span>
              <span className="truncate">{task.scaleTitle} · S{task.weekNumber}</span>
            </div>
          </div>
        </div>

        {wasRejected && task.reviewReason && (
          <p className="mt-3 text-[12px] text-background/85 italic line-clamp-2 leading-relaxed border-l-2 border-red-400/60 pl-3">
            "{task.reviewReason}"
          </p>
        )}

        <div className="mt-auto pt-5 flex items-center justify-between gap-3">
          {deadline && (
            <div className={cn("flex items-center gap-1.5 text-xs", overdue ? "text-red-300" : "text-background/70")}>
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium">
                {overdue
                  ? `Atrasado há ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`
                  : `Vence em ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`}
              </span>
            </div>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-background bg-background/10 backdrop-blur-sm px-3 py-1.5 rounded-full ring-1 ring-background/15 group-hover:bg-background/20 transition-colors">
            Abrir <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </HeroShell>
    </Link>
  );
}

function HeroReview({ review }: { review: PendingReview }) {
  return (
    <Link href={`/escalas/${review.scaleId}`} className="block group">
      <HeroShell eyebrow="Aguarda sua revisão" accentColor="bg-orange-500">
        <div className="flex items-center gap-3 mt-3">
          <div className="relative shrink-0">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-400/30 to-orange-600/20 backdrop-blur-sm ring-1 ring-orange-300/30 flex items-center justify-center font-heading text-2xl font-semibold text-orange-100">
              {review.editorName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-orange-500 ring-2 ring-foreground animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-2xl lg:text-3xl font-semibold leading-tight truncate tracking-tight">
              {review.editorName}
            </h2>
            <p className="text-sm text-background/75 mt-0.5">aguarda sua aprovação</p>
          </div>
        </div>

        <p className="text-[12px] text-background/70 mt-3 line-clamp-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 mr-1.5 align-middle" />
          {review.scaleTitle} · S{review.weekNumber} · {review.theme}
        </p>

        <div className="mt-auto pt-5 flex items-center justify-end">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-background bg-orange-500/90 px-3 py-1.5 rounded-full group-hover:bg-orange-500 transition-colors">
            Revisar agora <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </HeroShell>
    </Link>
  );
}

function HeroDeadline({ d }: { d: UpcomingDeadline }) {
  const phase = PHASE_THEME[d.status];
  const Icon = phase.icon;
  const accent = d.overdue ? "bg-red-500" : phase.dot;
  return (
    <Link href={`/escalas/${d.scaleId}`} className="block group">
      <HeroShell eyebrow={`Próximo prazo · ${phase.label}`} accentColor={accent}>
        <div className="flex items-start gap-3 mt-3">
          <div className="h-11 w-11 rounded-xl bg-background/10 backdrop-blur-sm ring-1 ring-background/15 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-background" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-2xl lg:text-3xl font-semibold leading-tight tracking-tight">{d.theme}</h2>
            <p className="text-[12px] text-background/75 mt-1.5">
              {d.scaleTitle} · Semana {d.weekNumber}
            </p>
          </div>
        </div>
        <div className="mt-auto pt-5 flex items-center justify-between">
          <span className={cn("text-xs flex items-center gap-1.5", d.overdue ? "text-red-300" : "text-background/70")}>
            <Calendar className="h-3.5 w-3.5" />
            {d.overdue ? `Atrasado há ${Math.abs(d.daysRemaining)}d` : d.daysRemaining === 0 ? "Hoje" : `Em ${d.daysRemaining} dias`}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-background bg-background/10 backdrop-blur-sm px-3 py-1.5 rounded-full ring-1 ring-background/15 group-hover:bg-background/20 transition-colors">
            Abrir <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </HeroShell>
    </Link>
  );
}

function HeroAllClear() {
  return (
    <div className="relative h-full min-h-[12rem] rounded-2xl bg-gradient-to-br from-primary/8 via-primary/4 to-card border border-primary/10 p-6 overflow-hidden">
      <Sparkles className="absolute -right-4 -bottom-4 h-32 w-32 text-primary/8" strokeWidth={1.2} />
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative z-10 flex flex-col h-full">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">
          Tudo em dia
        </span>
        <h2 className="font-heading text-2xl lg:text-3xl text-foreground mt-3 leading-tight tracking-tight">
          Nada urgente pra você agora
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Acompanhe o time pelo painel ao lado ou explore o acervo.
        </p>
        <div className="mt-auto pt-5">
          <Link
            href="/acervo"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground px-3 py-2 rounded-full hover:bg-primary/90 transition-colors"
          >
            Ver acervo <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card — neutro, com accent ───────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  hue,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hue: "primary" | "amber" | "emerald" | "rose";
}) {
  const styles = {
    primary: { dot: "bg-primary", text: "text-primary", line: "bg-primary/60" },
    amber: { dot: "bg-amber-500", text: "text-amber-700", line: "bg-amber-500/60" },
    emerald: { dot: "bg-emerald-500", text: "text-emerald-700", line: "bg-emerald-500/60" },
    rose: { dot: "bg-rose-500", text: "text-rose-700", line: "bg-rose-500/60" },
  }[hue];

  return (
    <div className="relative rounded-2xl p-4 card-glass overflow-hidden transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-2">
        <Icon className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.8} />
        <span className={cn("h-1.5 w-1.5 rounded-full mt-1.5", styles.dot)} />
      </div>
      <p className="font-heading text-3xl font-semibold leading-none text-foreground tabular-nums">
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] mt-2 text-muted-foreground">
        {label}
      </p>
      <div className={cn("absolute bottom-0 left-0 h-0.5 transition-all", styles.line)} style={{ width: value > 0 ? "40%" : "0%" }} />
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: PendingTask }) {
  const theme = ROLE_THEME[task.role];
  const Icon = theme.icon;
  const wasRejected = task.reviewStatus === "rejected";
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const overdue = deadline && deadline < new Date();

  return (
    <Link
      href={`/escalas/${task.scaleId}`}
      className="group relative block rounded-xl card-glass hover:shadow-sm transition-all overflow-hidden"
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", wasRejected ? "bg-red-500" : theme.dot)} />
      <div className="pl-4 pr-3 py-3 flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", wasRejected ? "bg-red-50" : theme.soft)}>
          <Icon className={cn("h-4 w-4", wasRejected ? "text-red-700" : theme.text)} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", wasRejected ? "text-red-700" : theme.text)}>
              {task.hint}
            </span>
            {wasRejected && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-1 rounded">
                Refazer
              </span>
            )}
          </div>
          <p className="font-heading text-base font-semibold truncate text-foreground group-hover:text-primary transition-colors">
            {task.theme}
          </p>
          <p className="text-[11px] text-muted-foreground/70 truncate">
            {task.scaleTitle} · S{task.weekNumber}
          </p>
        </div>
        {deadline && (
          <span className={cn("text-[11px] font-semibold shrink-0 tabular-nums", overdue ? "text-red-600" : "text-muted-foreground/80")}>
            {overdue ? "−" : ""}
            {formatDistanceToNowStrict(deadline, { locale: ptBR, unit: "day" }).replace(/[^\d]/g, "")}d
          </span>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}

// ─── Deadline row ─────────────────────────────────────────────────────────

function DeadlineRow({ d }: { d: UpcomingDeadline }) {
  const phase = PHASE_THEME[d.status];
  const Icon = phase.icon;
  return (
    <Link
      href={`/escalas/${d.scaleId}`}
      className="group relative flex items-center gap-3 rounded-xl card-glass p-3 hover:shadow-sm transition-all overflow-hidden"
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", d.overdue ? "bg-red-500" : phase.dot)} />
      <div className={cn("ml-1 h-9 w-9 rounded-xl flex items-center justify-center shrink-0", phase.soft)}>
        <Icon className={cn("h-4 w-4", phase.text)} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors leading-tight">
          {d.theme}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", phase.text)}>
            {phase.label}
          </span>
          <span className="text-[10px] text-muted-foreground/40">·</span>
          <span className="text-[10px] text-muted-foreground/70 truncate">
            {d.scaleTitle} · S{d.weekNumber}
          </span>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 text-[11px] font-bold rounded-full px-2.5 py-1 tabular-nums",
          d.overdue
            ? "bg-red-50 text-red-700 ring-1 ring-red-200/60"
            : d.daysRemaining <= 2
              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60"
              : "bg-muted/60 text-muted-foreground"
        )}
      >
        {d.overdue ? `${Math.abs(d.daysRemaining)}d atrasado` : d.daysRemaining === 0 ? "Hoje" : `${d.daysRemaining}d`}
      </span>
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  badge,
  rightLink,
}: {
  eyebrow?: string;
  title: string;
  badge?: number;
  rightLink?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-2 mb-2.5 px-1">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <h2 className="font-heading text-lg leading-none tracking-tight">{title}</h2>
          {badge !== undefined && badge > 0 && (
            <span className="text-[10px] font-bold text-primary-foreground bg-primary rounded-full h-4 min-w-4 flex items-center justify-center px-1 tabular-nums">
              {badge}
            </span>
          )}
        </div>
      </div>
      {rightLink && (
        <Link href={rightLink.href} className="text-[11px] text-muted-foreground hover:text-primary font-semibold uppercase tracking-wider flex items-center gap-0.5 shrink-0 transition-colors">
          {rightLink.label} <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      )}
    </div>
  );
}
