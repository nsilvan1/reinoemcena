"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bell,
  PenLine,
  Mic,
  Film,
  Eye,
  Plus,
  Sparkles,
  CircleCheck,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Button,
  Card,
  Stat,
  Avatar,
  Badge,
  SectionHeading,
} from "@/components/v2/primitives";

type WeekStatus = "roteiro" | "gravacao" | "edicao" | "revisao" | "concluido";

interface PendingTask {
  scaleId: string;
  scaleTitle: string;
  weekNumber: number;
  theme: string;
  status: WeekStatus;
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
  status: WeekStatus;
  deadline: string;
  daysRemaining: number;
  overdue: boolean;
}

interface DashboardData {
  myPendingTasks: PendingTask[];
  pendingReviews: PendingReview[];
  upcomingDeadlines: UpcomingDeadline[];
  phaseDistribution: Record<WeekStatus, number>;
  unreadCount: number;
  stats: {
    totalScales: number;
    totalWeeks: number;
    completedWeeks: number;
    progressPct: number;
    pendingWeeks: number;
  };
}

const ROLE_META = {
  roteirista: { icon: PenLine, label: "Roteiro", color: "text-[oklch(0.80_0.14_220)]", bg: "bg-[oklch(0.22_0.030_220)]" },
  narrador: { icon: Mic, label: "Gravação", color: "text-[oklch(0.80_0.14_60)]", bg: "bg-[oklch(0.22_0.030_60)]" },
  editor: { icon: Film, label: "Edição", color: "text-[oklch(0.80_0.14_300)]", bg: "bg-[oklch(0.22_0.030_300)]" },
} as const;

const PHASE_META = {
  roteiro: { icon: PenLine, label: "Roteiro", text: "text-[oklch(0.80_0.14_220)]", bg: "bg-[oklch(0.22_0.030_220)]", ring: "ring-[oklch(0.30_0.060_220)]" },
  gravacao: { icon: Mic, label: "Gravação", text: "text-[oklch(0.80_0.14_60)]", bg: "bg-[oklch(0.22_0.030_60)]", ring: "ring-[oklch(0.30_0.060_60)]" },
  edicao: { icon: Film, label: "Edição", text: "text-[oklch(0.80_0.14_300)]", bg: "bg-[oklch(0.22_0.030_300)]", ring: "ring-[oklch(0.30_0.060_300)]" },
  revisao: { icon: Eye, label: "Revisão", text: "text-[oklch(0.80_0.14_25)]", bg: "bg-[oklch(0.22_0.030_25)]", ring: "ring-[oklch(0.30_0.060_25)]" },
  concluido: { icon: CircleCheck, label: "Concluído", text: "text-[oklch(0.80_0.14_158)]", bg: "bg-[oklch(0.22_0.030_158)]", ring: "ring-[oklch(0.30_0.060_158)]" },
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
        <div className="h-12 w-72 skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-44 skeleton rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 skeleton rounded-xl" />
            <div className="h-20 skeleton rounded-xl" />
            <div className="h-20 skeleton rounded-xl" />
            <div className="h-20 skeleton rounded-xl" />
          </div>
        </div>
        <div className="h-24 skeleton rounded-xl" />
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read);
  const userRole = (session?.user as { role?: string })?.role ?? "membro";
  const canReview = ["admin", "coordenador"].includes(userRole);
  const userName = session?.user?.name?.split(" ")[0] ?? "";

  const heroTask = data.myPendingTasks[0];
  const heroReview = !heroTask && canReview ? data.pendingReviews[0] : null;
  const heroDeadline = !heroTask && !heroReview ? data.upcomingDeadlines[0] : null;

  return (
    <div className="space-y-7">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between gap-4 flex-wrap animate-in-view">
        <div className="flex items-center gap-3">
          <Avatar name={userName} size="lg" status="online" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-[oklch(0.65_0.12_158)]">
              {greeting()}
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] leading-none mt-1">
              {userName}.
            </h1>
            <p className="text-[12px] text-muted-foreground/65 mt-2 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span className="mx-2 text-muted-foreground/30">·</span>
              <span className="text-[oklch(0.80_0.14_158)]">{data.stats.progressPct}%</span> do mês
            </p>
          </div>
        </div>
        {canReview && (
          <Link href="/escalas">
            <Button>
              <Plus className="h-3.5 w-3.5" />
              Nova escala
            </Button>
          </Link>
        )}
      </header>

      {/* ─── Hero + Stats ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in-view stagger-1">
        <div className="lg:col-span-2">
          {heroTask ? (
            <HeroTask task={heroTask} />
          ) : heroReview ? (
            <HeroReview review={heroReview} />
          ) : heroDeadline ? (
            <HeroDeadline d={heroDeadline} />
          ) : (
            <HeroAllClear />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Escalas" value={data.stats.totalScales} icon={Calendar} accent="info" />
          <Stat label="Em curso" value={data.stats.pendingWeeks} icon={Clock} accent="warning" />
          <Stat label="Concluídos" value={data.stats.completedWeeks} icon={CheckCircle2} accent="primary" />
          <Stat label="Notificações" value={unread.length} icon={Bell} accent="danger" />
        </div>
      </div>

      {/* ─── Pipeline ─── */}
      {data.stats.totalWeeks > 0 && (
        <section className="animate-in-view stagger-2">
          <SectionHeading eyebrow="Pipeline" title="Distribuição das semanas" />
          <Card className="p-5">
            <div className="grid grid-cols-5 gap-3 sm:gap-4">
              {(Object.keys(PHASE_META) as Array<keyof typeof PHASE_META>).map((key, i, arr) => {
                const phase = PHASE_META[key];
                const count = data.phaseDistribution[key] || 0;
                const Icon = phase.icon;
                const isLast = i === arr.length - 1;
                return (
                  <div key={key} className="relative">
                    {!isLast && (
                      <span className="hidden sm:block absolute top-6 left-[55%] right-[-50%] h-px bg-gradient-to-r from-border via-border/50 to-border" />
                    )}
                    <div className="relative flex flex-col items-center text-center">
                      <span
                        className={cn(
                          "relative h-12 w-12 rounded-xl flex items-center justify-center ring-1",
                          phase.bg,
                          phase.ring
                        )}
                      >
                        <Icon className={cn("h-5 w-5", phase.text)} strokeWidth={1.8} />
                        {count > 0 && (
                          <span className={cn("absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-md font-mono tabular-nums text-[10px] font-bold flex items-center justify-center", phase.text, "bg-background border border-current/40")}>
                            {count}
                          </span>
                        )}
                      </span>
                      <p className={cn("text-[10px] font-mono uppercase tracking-[0.18em] mt-3", phase.text, "opacity-80")}>
                        {phase.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* ─── Two columns ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-7">
          {data.myPendingTasks.length > 1 && (
            <section className="animate-in-view stagger-3">
              <SectionHeading
                eyebrow="Suas tarefas"
                title="Pendentes"
                count={data.myPendingTasks.length}
              />
              <div className="space-y-2">
                {data.myPendingTasks.slice(1).map((t) => (
                  <TaskRow key={`${t.scaleId}-${t.weekNumber}`} task={t} />
                ))}
              </div>
            </section>
          )}

          {data.upcomingDeadlines.length > 0 && (
            <section className="animate-in-view stagger-4">
              <SectionHeading eyebrow="Prazos" title="Próximos a vencer" count={data.upcomingDeadlines.length} />
              <div className="space-y-2">
                {data.upcomingDeadlines.map((d) => (
                  <DeadlineRow key={`${d.scaleId}-${d.weekNumber}`} d={d} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-5 space-y-7">
          {canReview && data.pendingReviews.length > 0 && (
            <section className="animate-in-view stagger-3">
              <SectionHeading
                eyebrow="Revisão"
                title="Aguardando você"
                count={data.pendingReviews.length}
              />
              <Card className="overflow-hidden">
                {data.pendingReviews.map((r, i) => (
                  <Link
                    key={`${r.scaleId}-${r.weekNumber}-${r.editorId}`}
                    href={`/escalas/${r.scaleId}`}
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-[oklch(0.18_0.010_240)] transition-colors group",
                      i > 0 && "border-t border-border"
                    )}
                  >
                    <Avatar name={r.editorName} size="md" status="online" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-tight">{r.editorName}</p>
                      <p className="text-[11px] text-muted-foreground/65 truncate mt-0.5 font-mono">
                        S{r.weekNumber} · {r.theme}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/35 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </Card>
            </section>
          )}

          {unread.length > 0 && (
            <section className="animate-in-view stagger-4">
              <SectionHeading
                eyebrow="Atividade"
                title="Notificações"
                count={unread.length}
                action={
                  <Link href="/notificacoes" className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground/65 hover:text-foreground transition-colors">
                    Ver todas →
                  </Link>
                }
              />
              <Card className="overflow-hidden">
                {unread.slice(0, 5).map((n, i) => (
                  <div key={n._id} className={cn("flex items-start gap-2.5 p-3 hover:bg-[oklch(0.18_0.010_240)] transition-colors", i > 0 && "border-t border-border")}>
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[oklch(0.74_0.16_158)] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] leading-snug text-foreground/90">{n.message}</p>
                      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/55 mt-1.5">
                        {format(new Date(n.createdAt), "dd MMM · HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function HeroShell({
  eyebrow,
  accent,
  children,
}: {
  eyebrow: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Card elevated className="relative h-full min-h-[11rem] p-5 sm:p-6 overflow-hidden">
      <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full blur-3xl opacity-50 pointer-events-none" style={{ background: accent }} />
      <div className="absolute inset-0 bg-grid-faint opacity-50 pointer-events-none" />
      <div className="relative z-10 h-full flex flex-col">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/65">
          {eyebrow}
        </p>
        {children}
      </div>
    </Card>
  );
}

function HeroTask({ task }: { task: PendingTask }) {
  const meta = ROLE_META[task.role];
  const Icon = meta.icon;
  const wasRejected = task.reviewStatus === "rejected";
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const overdue = deadline && deadline < new Date();
  const accent = wasRejected ? "oklch(0.55 0.21 25)" : "oklch(0.55 0.18 158)";

  return (
    <Link href={`/escalas/${task.scaleId}`} className="block group">
      <HeroShell eyebrow={wasRejected ? "Refazer entrega" : "Sua próxima ação"} accent={accent}>
        <div className="flex items-start gap-3 mt-3">
          <span className={cn("h-11 w-11 rounded-xl flex items-center justify-center ring-1 ring-current/20", meta.bg)}>
            <Icon className={cn("h-5 w-5", meta.color)} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-2xl sm:text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">
              {task.theme}
            </h2>
            <p className="text-[12px] text-muted-foreground/70 mt-1.5 truncate font-mono">
              <span className={meta.color}>{task.hint}</span>
              <span className="mx-1.5 text-muted-foreground/30">·</span>
              {task.scaleTitle} · S{task.weekNumber}
            </p>
          </div>
        </div>

        {wasRejected && task.reviewReason && (
          <p className="mt-3 text-[12px] text-foreground/75 italic line-clamp-2 border-l-2 border-red-500/40 pl-3">
            “{task.reviewReason}”
          </p>
        )}

        <div className="mt-auto pt-5 flex items-center justify-between gap-3">
          {deadline && (
            <span className={cn("flex items-center gap-1.5 text-[11px] font-mono", overdue ? "text-red-400" : "text-muted-foreground/65")}>
              <Calendar className="h-3 w-3" />
              {overdue ? `Atrasado ${formatDistanceToNowStrict(deadline, { locale: ptBR })}` : `Em ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-md bg-[oklch(0.20_0.010_240)] border border-border group-hover:border-primary/40 group-hover:bg-[oklch(0.22_0.030_158)] transition-colors">
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
      <HeroShell eyebrow="Aguarda sua revisão" accent="oklch(0.55 0.18 60)">
        <div className="flex items-center gap-4 mt-3">
          <Avatar name={review.editorName} size="xl" status="online" />
          <div className="min-w-0">
            <h2 className="font-heading text-2xl sm:text-[28px] font-semibold tracking-[-0.02em] truncate">
              {review.editorName}
            </h2>
            <p className="text-[12px] text-muted-foreground/70 mt-1">aguarda sua aprovação</p>
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground/65 mt-4 truncate font-mono">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.14_60)] mr-2 align-middle" />
          {review.scaleTitle} · S{review.weekNumber} · {review.theme}
        </p>
        <div className="mt-auto pt-5 flex items-center justify-end">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1.5 rounded-md bg-[oklch(0.22_0.030_60)] text-[oklch(0.85_0.14_60)] border border-[oklch(0.32_0.060_60)] group-hover:bg-[oklch(0.26_0.040_60)] transition-colors">
            Revisar agora <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </HeroShell>
    </Link>
  );
}

function HeroDeadline({ d }: { d: UpcomingDeadline }) {
  const phase = PHASE_META[d.status];
  const Icon = phase.icon;
  return (
    <Link href={`/escalas/${d.scaleId}`} className="block group">
      <HeroShell eyebrow={`Próximo prazo · ${phase.label}`} accent={d.overdue ? "oklch(0.55 0.21 25)" : "oklch(0.55 0.18 158)"}>
        <div className="flex items-start gap-3 mt-3">
          <span className={cn("h-11 w-11 rounded-xl flex items-center justify-center ring-1", phase.bg, phase.ring)}>
            <Icon className={cn("h-5 w-5", phase.text)} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-2xl sm:text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">
              {d.theme}
            </h2>
            <p className="text-[12px] text-muted-foreground/65 mt-1.5 font-mono">
              {d.scaleTitle} · Semana {d.weekNumber}
            </p>
          </div>
        </div>
        <div className="mt-auto pt-5 flex items-center justify-between">
          <span className={cn("text-[11px] font-mono flex items-center gap-1.5", d.overdue ? "text-red-400" : "text-muted-foreground/65")}>
            <Calendar className="h-3 w-3" />
            {d.overdue ? `Atrasado ${Math.abs(d.daysRemaining)}d` : d.daysRemaining === 0 ? "Hoje" : `Em ${d.daysRemaining}d`}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-md bg-[oklch(0.20_0.010_240)] border border-border group-hover:border-primary/40 transition-colors">
            Abrir <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </HeroShell>
    </Link>
  );
}

function HeroAllClear() {
  return (
    <HeroShell eyebrow="Tudo em dia" accent="oklch(0.55 0.18 158)">
      <div className="flex items-start gap-3 mt-3">
        <span className="h-11 w-11 rounded-xl flex items-center justify-center ring-1 bg-[oklch(0.22_0.030_158)] ring-[oklch(0.30_0.060_158)]">
          <Sparkles className="h-5 w-5 text-[oklch(0.80_0.14_158)]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-2xl sm:text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-gradient-mint">
            Nada urgente.
          </h2>
          <p className="text-[12.5px] text-muted-foreground/70 mt-2 max-w-md">
            Acompanhe o time pelo painel ou explore o acervo de personagens e histórias.
          </p>
        </div>
      </div>
      <div className="mt-auto pt-5">
        <Link href="/acervo" className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em] px-2.5 py-1.5 rounded-md bg-[oklch(0.22_0.030_158)] text-[oklch(0.85_0.14_158)] border border-[oklch(0.32_0.060_158)] hover:bg-[oklch(0.26_0.040_158)] transition-colors">
          Acervo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </HeroShell>
  );
}

function TaskRow({ task }: { task: PendingTask }) {
  const meta = ROLE_META[task.role];
  const Icon = meta.icon;
  const wasRejected = task.reviewStatus === "rejected";
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const overdue = deadline && deadline < new Date();

  return (
    <Link
      href={`/escalas/${task.scaleId}`}
      className="block surface-interactive rounded-xl group relative overflow-hidden"
    >
      <span className={cn("absolute left-0 top-0 bottom-0 w-0.5", wasRejected ? "bg-red-500" : "bg-[oklch(0.74_0.16_158)]")} />
      <div className="pl-4 pr-3 py-3 flex items-center gap-3">
        <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", wasRejected ? "bg-[oklch(0.22_0.030_25)]" : meta.bg)}>
          <Icon className={cn("h-4 w-4", wasRejected ? "text-[oklch(0.80_0.14_25)]" : meta.color)} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn("text-[10px] font-mono uppercase tracking-[0.18em]", wasRejected ? "text-red-400" : meta.color)}>
              {task.hint}
            </span>
            {wasRejected && <Badge tone="danger">Refazer</Badge>}
          </div>
          <p className="font-medium text-foreground truncate group-hover:text-[oklch(0.92_0.05_158)] transition-colors">
            {task.theme}
          </p>
          <p className="text-[11px] text-muted-foreground/55 truncate mt-0.5 font-mono">
            {task.scaleTitle} · S{task.weekNumber}
          </p>
        </div>
        {deadline && (
          <span className={cn("text-[11px] font-mono tabular-nums shrink-0", overdue ? "text-red-400" : "text-muted-foreground/65")}>
            {overdue ? "−" : ""}
            {formatDistanceToNowStrict(deadline, { locale: ptBR, unit: "day" }).replace(/[^\d]/g, "")}d
          </span>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/35 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}

function DeadlineRow({ d }: { d: UpcomingDeadline }) {
  const phase = PHASE_META[d.status];
  const Icon = phase.icon;
  return (
    <Link
      href={`/escalas/${d.scaleId}`}
      className="surface-interactive rounded-xl group relative overflow-hidden flex items-center gap-3 p-3"
    >
      <span className={cn("absolute left-0 top-0 bottom-0 w-0.5", d.overdue ? "bg-red-500" : "bg-[oklch(0.74_0.16_158)]")} />
      <span className={cn("ml-1 h-9 w-9 rounded-lg flex items-center justify-center shrink-0", phase.bg)}>
        <Icon className={cn("h-4 w-4", phase.text)} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate group-hover:text-[oklch(0.92_0.05_158)] transition-colors leading-tight">
          {d.theme}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn("text-[10px] font-mono uppercase tracking-[0.18em]", phase.text)}>
            {phase.label}
          </span>
          <span className="text-[10px] text-muted-foreground/30">·</span>
          <span className="text-[10px] text-muted-foreground/55 truncate font-mono">
            {d.scaleTitle} · S{d.weekNumber}
          </span>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 text-[11px] font-mono font-bold rounded-md px-2 py-1 tabular-nums border",
          d.overdue
            ? "bg-[oklch(0.22_0.030_25)] text-[oklch(0.80_0.14_25)] border-[oklch(0.30_0.060_25)]"
            : d.daysRemaining <= 2
              ? "bg-[oklch(0.22_0.030_60)] text-[oklch(0.80_0.14_60)] border-[oklch(0.30_0.060_60)]"
              : "bg-[oklch(0.20_0.010_240)] text-muted-foreground border-border"
        )}
      >
        {d.overdue ? `−${Math.abs(d.daysRemaining)}d` : d.daysRemaining === 0 ? "Hoje" : `${d.daysRemaining}d`}
      </span>
    </Link>
  );
}
