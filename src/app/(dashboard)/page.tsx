"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  ArrowRight,
  Bell,
  PenLine,
  Mic,
  Film,
  Eye,
  Plus,
  Sparkles,
  CircleCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  ChevronRight,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Button,
  Avatar,
  Stat,
  Card,
  Badge,
  SectionHeading,
} from "@/components/v2/primitives";
import type { Role } from "@/types";

// ─── Tipos locais ────────────────────────────────────────────────────

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

interface ScaleItem {
  _id: string;
  title: string;
  month: string;
  weeks: Array<{
    number: number;
    theme: string;
    status: WeekStatus;
    deadline?: string;
  }>;
}

interface UserItem {
  _id: string;
  name: string;
  role: Role;
  skills?: string[];
}

// ─── Metas de fase/role ──────────────────────────────────────────────

const ROLE_META = {
  roteirista: { icon: PenLine, label: "Roteiro", hue: 220 },
  narrador: { icon: Mic, label: "Gravacao", hue: 60 },
  editor: { icon: Film, label: "Edicao", hue: 300 },
} as const;

const PHASE_META = {
  roteiro: { icon: PenLine, label: "Roteiro", hue: 220 },
  gravacao: { icon: Mic, label: "Gravacao", hue: 60 },
  edicao: { icon: Film, label: "Edicao", hue: 300 },
  revisao: { icon: Eye, label: "Revisao", hue: 25 },
  concluido: { icon: CircleCheck, label: "Concluido", hue: 158 },
} as const;

const ROLE_BADGE_TONE: Record<Role, "primary" | "info" | "violet" | "neutral"> = {
  admin: "primary",
  coordenador: "info",
  roteirista: "violet",
  membro: "neutral",
};

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  coordenador: "Coord.",
  roteirista: "Roteirista",
  membro: "Membro",
};

// ─── Saudacao ────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ═══════════════════════════════════════════════════════════════════
// PAGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [scales, setScales] = useState<ScaleItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ _id: string; message: string; createdAt: string; read: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/notifications").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/scales").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/users").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([d, n, s, u]) => {
        if (d) setData(d);
        setNotifications(Array.isArray(n) ? n : []);
        setScales(Array.isArray(s) ? s : []);
        setUsers(Array.isArray(u) ? u : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <DashboardSkeleton />;

  const unread = notifications.filter((n) => !n.read);
  const userRole = (session?.user as { role?: string })?.role ?? "membro";
  const canCreate = ["admin", "coordenador"].includes(userRole);
  const canReview = ["admin", "coordenador"].includes(userRole);
  const userName = session?.user?.name?.split(" ")[0] ?? "";

  const heroTask = data.myPendingTasks[0];
  const heroReview = !heroTask && canReview ? data.pendingReviews[0] : null;
  const heroDeadline = !heroTask && !heroReview ? data.upcomingDeadlines[0] : null;

  const totalWeeks = data.stats.totalWeeks || 1;
  const alertCount = unread.length;

  // Proximas escalas — ate 4 mais recentes nao totalmente concluidas
  const upcomingScales = scales
    .filter((s) => s.weeks.some((w) => w.status !== "concluido"))
    .slice(0, 4);

  // Equipe — ate 6 usuarios
  const teamUsers = users.slice(0, 6);

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ─── Header: avatar + saudacao + data + botao ─── */}
      <header className="flex items-end justify-between gap-4 flex-wrap pb-5 border-b border-border/60 animate-in-view stagger-1">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={userName} size="lg" status="online" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/65 leading-none">
              {greeting()}
            </p>
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.025em] leading-tight mt-1.5">
              {userName || "Ola"}
            </h1>
            <p className="text-[12.5px] text-muted-foreground/65 mt-1 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        {canCreate && (
          <Link href="/escalas" className="ml-auto shrink-0">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> Nova escala
            </Button>
          </Link>
        )}
      </header>

      {/* ─── Stat cards grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat
          icon={Calendar}
          label="Escalas ativas"
          value={data.stats.totalScales}
          accent="primary"
          animated
          className="animate-in-view stagger-1"
        />
        <Stat
          icon={Clock}
          label="Em curso"
          value={data.stats.pendingWeeks}
          accent="warning"
          animated
          hint="semanas ativas"
          className="animate-in-view stagger-2"
        />
        <Stat
          icon={CheckCircle2}
          label="Concluidas"
          value={data.stats.completedWeeks}
          accent="primary"
          animated
          hint="este ciclo"
          className="animate-in-view stagger-3"
        />
        <Stat
          icon={Bell}
          label="Alertas"
          value={alertCount}
          accent={alertCount > 0 ? "danger" : "primary"}
          animated
          pulse={alertCount > 0}
          hint={alertCount > 0 ? "nao lidas" : "tudo em dia"}
          className="animate-in-view stagger-4"
        />
      </div>

      {/* ─── Hero (acao prioritaria) ─── */}
      <section className="animate-in-view stagger-5">
        {heroTask ? (
          <HeroTask task={heroTask} />
        ) : heroReview ? (
          <HeroReview review={heroReview} />
        ) : heroDeadline ? (
          <HeroDeadline d={heroDeadline} />
        ) : (
          <HeroAllClear />
        )}
      </section>

      {/* ─── Pipeline com barras de progresso ─── */}
      {data.stats.totalWeeks > 0 && (
        <section className="animate-in-view stagger-6">
          <SectionLabel
            title="Distribuicao do mes"
            hint={`${data.stats.completedWeeks}/${data.stats.totalWeeks} semanas concluidas · ${data.stats.progressPct}%`}
          />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-px bg-border/40 rounded-lg overflow-hidden">
            {(Object.keys(PHASE_META) as WeekStatus[]).map((key) => {
              const phase = PHASE_META[key];
              const count = data.phaseDistribution[key] || 0;
              const pct = (count / totalWeeks) * 100;
              const Icon = phase.icon;
              return (
                <div
                  key={key}
                  className="bg-card relative p-3 sm:p-3.5 group cursor-default"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Icon
                      className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0"
                      style={{ color: `oklch(0.82 0.14 ${phase.hue})` }}
                      strokeWidth={1.9}
                    />
                    <span
                      className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.06em] sm:tracking-[0.08em] truncate"
                      style={{ color: `oklch(0.75 0.10 ${phase.hue})` }}
                    >
                      {phase.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xl sm:text-2xl font-semibold tabular-nums leading-none">{count}</p>
                  {/* barra de progresso */}
                  <div
                    className="absolute left-0 right-0 bottom-0 h-0.5"
                    style={{ background: `oklch(0.22 0.030 ${phase.hue})` }}
                  >
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${pct}%`,
                        background: `oklch(0.65 0.18 ${phase.hue})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Grade principal (8+4) ─── */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8">

        {/* ESQUERDA — prazos + resumo do mes */}
        <div className="col-span-12 lg:col-span-8 space-y-6 animate-in-view stagger-7">
          {data.upcomingDeadlines.length > 0 ? (
            <DeadlinesTable items={data.upcomingDeadlines} />
          ) : (
            <EmptyBlock
              title="Sem prazos criticos"
              hint="Tudo no ritmo certo — nenhuma semana vencendo agora."
            />
          )}

          {/* Resumo do mes — barra de progresso animada */}
          <MonthSummaryCard stats={data.stats} />
        </div>

        {/* DIREITA — aside vertical */}
        <aside className="col-span-12 lg:col-span-4 space-y-5 animate-in-view stagger-8">

          {/* Revisoes pendentes */}
          {canReview && data.pendingReviews.length > 0 && (
            <ReviewsList items={data.pendingReviews} />
          )}

          {/* Tarefas pessoais extras */}
          {data.myPendingTasks.length > 1 && (
            <PersonalTasks items={data.myPendingTasks.slice(1, 4)} />
          )}

          {/* Proximas escalas — sempre visivel */}
          {upcomingScales.length > 0 && (
            <UpcomingScalesCard scales={upcomingScales} />
          )}

          {/* Equipe ativa — sempre visivel */}
          {teamUsers.length > 0 && (
            <TeamCard users={teamUsers} total={users.length} />
          )}

          {/* Atividade recente */}
          {unread.length > 0 && (
            <ActivityTimeline items={unread.slice(0, 5)} />
          )}
        </aside>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Hero (acao prioritaria — compacto, banner horizontal)
// ═══════════════════════════════════════════════════════════════════

function HeroFrame({
  children,
  hue,
  href,
}: {
  children: React.ReactNode;
  hue: number;
  href?: string;
}) {
  const cls =
    "relative block rounded-lg border border-border bg-card overflow-hidden group transition-all duration-200 hover:border-[oklch(0.40_0.10_var(--h))] hover:-translate-y-0.5 hover:shadow-[0_6px_28px_oklch(0_0_0_/_0.45)]";
  const inner = (
    <div className="relative">
      {/* glow lateral */}
      <span
        className="absolute -left-32 top-1/2 -translate-y-1/2 h-64 w-64 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: `oklch(0.55 0.20 ${hue})` }}
      />
      {/* rail lateral */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: `oklch(0.65 0.18 ${hue})` }}
      />
      <div className="relative pl-5 pr-4 py-4">{children}</div>
    </div>
  );
  return href ? (
    <Link href={href} className={cls} style={{ "--h": hue } as React.CSSProperties}>
      {inner}
    </Link>
  ) : (
    <div className={cls} style={{ "--h": hue } as React.CSSProperties}>
      {inner}
    </div>
  );
}

function HeroTask({ task }: { task: PendingTask }) {
  const meta = ROLE_META[task.role];
  const Icon = meta.icon;
  const wasRejected = task.reviewStatus === "rejected";
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const overdue = deadline && deadline < new Date();
  const hue = wasRejected ? 25 : meta.hue;

  return (
    <HeroFrame hue={hue} href={`/escalas/${task.scaleId}`}>
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "h-10 w-10 rounded-md flex items-center justify-center shrink-0",
            wasRejected && "glow-pulse"
          )}
          style={{ background: `oklch(0.24 0.045 ${hue})` }}
        >
          <Icon
            className="h-4 w-4"
            style={{ color: `oklch(0.82 0.14 ${hue})` }}
            strokeWidth={1.9}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: `oklch(0.78 0.14 ${hue})` }}
            >
              {wasRejected ? "Refazer entrega" : "Sua proxima acao"}
            </span>
            <span className="text-[11px] text-muted-foreground/50 font-mono">
              {task.scaleTitle} · S{task.weekNumber}
            </span>
          </div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] leading-snug truncate mt-0.5">
            {task.theme}
          </h2>
          {wasRejected && task.reviewReason && (
            <p className="text-[12px] text-foreground/70 italic mt-1 line-clamp-1">
              &ldquo;{task.reviewReason}&rdquo;
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {deadline && (
            <span
              className={cn(
                "text-[12px] tabular-nums font-medium",
                overdue ? "text-[oklch(0.80_0.14_25)]" : "text-muted-foreground/75"
              )}
            >
              {overdue
                ? `Atrasada ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`
                : `Em ${formatDistanceToNowStrict(deadline, { locale: ptBR })}`}
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </HeroFrame>
  );
}

function HeroReview({ review }: { review: PendingReview }) {
  return (
    <HeroFrame hue={60} href={`/escalas/${review.scaleId}`}>
      <div className="flex items-center gap-4">
        <span className="glow-pulse inline-flex shrink-0">
          <Avatar name={review.editorName} size="lg" status="online" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[oklch(0.82_0.14_60)]">
              Aguarda sua revisao
            </span>
            <span className="text-[11px] text-muted-foreground/50 font-mono">
              {review.scaleTitle} · S{review.weekNumber} · {review.theme}
            </span>
          </div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] leading-snug mt-0.5">
            {review.editorName}{" "}
            <span className="font-normal text-muted-foreground/70 text-[15px]">
              precisa da sua aprovacao
            </span>
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md bg-[oklch(0.26_0.040_60)] text-[oklch(0.86_0.14_60)] group-hover:bg-[oklch(0.30_0.045_60)] transition-colors shrink-0">
          Revisar <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </HeroFrame>
  );
}

function HeroDeadline({ d }: { d: UpcomingDeadline }) {
  const phase = PHASE_META[d.status];
  const Icon = phase.icon;
  const hue = d.overdue ? 25 : phase.hue;
  return (
    <HeroFrame hue={hue} href={`/escalas/${d.scaleId}`}>
      <div className="flex items-center gap-4">
        <span
          className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `oklch(0.24 0.045 ${hue})` }}
        >
          <Icon
            className="h-4 w-4"
            style={{ color: `oklch(0.82 0.14 ${hue})` }}
            strokeWidth={1.9}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: `oklch(0.78 0.14 ${hue})` }}
            >
              Proximo prazo · {phase.label}
            </span>
            <span className="text-[11px] text-muted-foreground/50 font-mono">
              {d.scaleTitle} · S{d.weekNumber}
            </span>
          </div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] leading-snug truncate mt-0.5">
            {d.theme}
          </h2>
        </div>
        <span
          className={cn(
            "text-[13px] font-semibold tabular-nums shrink-0",
            d.overdue ? "text-[oklch(0.82_0.14_25)]" : "text-foreground/85"
          )}
        >
          {d.overdue
            ? `−${Math.abs(d.daysRemaining)}d`
            : d.daysRemaining === 0
              ? "Hoje"
              : `${d.daysRemaining}d`}
        </span>
      </div>
    </HeroFrame>
  );
}

function HeroAllClear() {
  return (
    <HeroFrame hue={158}>
      <div className="flex items-center gap-4">
        <span className="h-10 w-10 rounded-md flex items-center justify-center shrink-0 bg-[oklch(0.24_0.045_158)]">
          <Sparkles className="h-4 w-4 text-[oklch(0.82_0.14_158)]" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[oklch(0.78_0.14_158)]">
            Tudo em dia
          </span>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] leading-snug mt-0.5">
            Nenhuma acao pendente
          </h2>
          <p className="text-[12.5px] text-muted-foreground/70 mt-0.5">
            Aproveite para explorar o acervo ou revisar comentarios antigos.
          </p>
        </div>
        <Link
          href="/escalas"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md bg-[oklch(0.26_0.040_158)] text-[oklch(0.86_0.14_158)] hover:bg-[oklch(0.30_0.045_158)] transition-colors shrink-0"
        >
          Escalas <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </HeroFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Section label
// ═══════════════════════════════════════════════════════════════════

function SectionLabel({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {hint && <p className="text-[12px] text-muted-foreground/60 mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tabela densa de prazos
// ═══════════════════════════════════════════════════════════════════

function DeadlinesTable({ items }: { items: UpcomingDeadline[] }) {
  return (
    <section>
      <SectionLabel
        title="Proximos prazos"
        hint={`${items.length} semanas em producao · ordenadas por urgencia`}
        action={
          <Link
            href="/escalas"
            className="text-[12px] text-muted-foreground/65 hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10 bg-card backdrop-blur-sm">
            <tr className="text-left border-b border-border/60">
              <th className="font-medium text-[10px] uppercase tracking-[0.08em] text-muted-foreground/55 px-4 py-2.5 w-14">
                Sem
              </th>
              <th className="font-medium text-[10px] uppercase tracking-[0.08em] text-muted-foreground/55 px-2 py-2.5">
                Tema
              </th>
              <th className="font-medium text-[10px] uppercase tracking-[0.08em] text-muted-foreground/55 px-2 py-2.5 hidden sm:table-cell">
                Fase
              </th>
              <th className="font-medium text-[10px] uppercase tracking-[0.08em] text-muted-foreground/55 px-2 py-2.5 hidden md:table-cell">
                Escala
              </th>
              <th className="font-medium text-[10px] uppercase tracking-[0.08em] text-muted-foreground/55 px-4 py-2.5 text-right w-20">
                Prazo
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((d, idx) => {
              const phase = PHASE_META[d.status];
              const Icon = phase.icon;
              const urgent = d.overdue || d.daysRemaining <= 2;
              return (
                <tr
                  key={`${d.scaleId}-${d.weekNumber}-${idx}`}
                  className="border-t border-border/40 hover:bg-[oklch(0.22_0.016_172)] transition-colors group"
                >
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={`/escalas/${d.scaleId}`}
                      className="font-mono text-[12px] font-medium text-muted-foreground/85 group-hover:text-foreground"
                    >
                      S{d.weekNumber}
                    </Link>
                  </td>
                  <td className="px-2 py-3 align-middle">
                    <Link
                      href={`/escalas/${d.scaleId}`}
                      className="font-medium text-foreground/90 group-hover:text-foreground line-clamp-1"
                    >
                      {d.theme}
                    </Link>
                  </td>
                  <td className="px-2 py-3 align-middle hidden sm:table-cell">
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium"
                      style={{ color: `oklch(0.78 0.13 ${phase.hue})` }}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2} />
                      {phase.label}
                    </span>
                  </td>
                  <td className="px-2 py-3 align-middle hidden md:table-cell">
                    <span className="text-[12px] text-muted-foreground/70 truncate max-w-[12ch] block">
                      {d.scaleTitle}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    <span
                      className={cn(
                        "text-[12px] font-semibold tabular-nums",
                        d.overdue
                          ? "text-[oklch(0.82_0.14_25)]"
                          : urgent
                            ? "text-[oklch(0.82_0.14_60)]"
                            : "text-muted-foreground/85"
                      )}
                    >
                      {d.overdue
                        ? `−${Math.abs(d.daysRemaining)}d`
                        : d.daysRemaining === 0
                          ? "Hoje"
                          : `${d.daysRemaining}d`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Resumo do mes — barra de progresso animada
// ═══════════════════════════════════════════════════════════════════

function MonthSummaryCard({
  stats,
}: {
  stats: DashboardData["stats"];
}) {
  const pct = stats.progressPct;
  const completed = stats.completedWeeks;
  const total = stats.totalWeeks;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/65">
            Resumo do ciclo
          </p>
          <p className="text-[15px] font-semibold mt-0.5">
            {completed} de {total} semanas concluidas
          </p>
        </div>
        <span
          className="text-[28px] font-semibold tabular-nums tracking-tight text-[oklch(0.82_0.14_158)]"
        >
          {pct}%
        </span>
      </div>

      {/* Barra principal */}
      <div className="h-2 bg-[oklch(0.24_0.018_172)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, oklch(0.60 0.18 158), oklch(0.78 0.16 158))`,
          }}
        />
      </div>

      {/* Mini legenda de fases */}
      <div className="flex gap-3 mt-4 flex-wrap">
        {(["roteiro", "gravacao", "edicao", "revisao", "concluido"] as WeekStatus[]).map((key) => {
          const phase = PHASE_META[key];
          return (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: `oklch(0.65 0.18 ${phase.hue})` }}
              />
              <span className="text-[11px] text-muted-foreground/65">{phase.label}</span>
            </span>
          );
        })}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Revisoes pendentes
// ═══════════════════════════════════════════════════════════════════

function ReviewsList({ items }: { items: PendingReview[] }) {
  return (
    <section>
      <SectionHeading
        eyebrow="Aguardando voce"
        title="Revisoes"
        count={items.length}
        action={
          <Link href="/escalas" className="text-[12px] text-muted-foreground/65 hover:text-foreground transition-colors inline-flex items-center gap-1">
            Ver <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <Card className="divide-y divide-border/40 overflow-hidden">
        {items.slice(0, 4).map((r) => (
          <Link
            key={`${r.scaleId}-${r.weekNumber}-${r.editorId}`}
            href={`/escalas/${r.scaleId}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[oklch(0.22_0.016_172)] transition-colors group"
          >
            <Avatar name={r.editorName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground/90 leading-tight truncate">
                {r.editorName}
              </p>
              <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5 font-mono">
                S{r.weekNumber} · {r.theme}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </Card>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tarefas pessoais (slim)
// ═══════════════════════════════════════════════════════════════════

function PersonalTasks({ items }: { items: PendingTask[] }) {
  return (
    <section>
      <SectionHeading
        eyebrow="Minhas tarefas"
        title="Outras pendencias"
        count={items.length}
      />
      <Card className="divide-y divide-border/40 overflow-hidden">
        {items.map((t) => {
          const meta = ROLE_META[t.role];
          const Icon = meta.icon;
          const deadline = t.deadline ? new Date(t.deadline) : null;
          const overdue = deadline && deadline < new Date();
          return (
            <Link
              key={`${t.scaleId}-${t.weekNumber}`}
              href={`/escalas/${t.scaleId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[oklch(0.22_0.016_172)] transition-colors group"
            >
              <span
                className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `oklch(0.22 0.030 ${meta.hue})` }}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: `oklch(0.78 0.13 ${meta.hue})` }}
                  strokeWidth={1.9}
                />
              </span>
              <span className="text-[13px] font-medium truncate flex-1">{t.theme}</span>
              {deadline && (
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums shrink-0",
                    overdue ? "text-[oklch(0.78_0.14_25)]" : "text-muted-foreground/55"
                  )}
                >
                  {overdue ? "−" : ""}
                  {formatDistanceToNowStrict(deadline, { locale: ptBR, unit: "day" }).replace(/[^\d]/g, "")}d
                </span>
              )}
            </Link>
          );
        })}
      </Card>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOVO — Proximas escalas
// ═══════════════════════════════════════════════════════════════════

const STATUS_ORDER: WeekStatus[] = ["roteiro", "gravacao", "edicao", "revisao", "concluido"];

function WeekMiniChip({ status }: { status: WeekStatus }) {
  const phase = PHASE_META[status];
  return (
    <span
      className="h-1.5 w-1.5 rounded-full"
      style={{ background: `oklch(0.65 0.18 ${phase.hue})` }}
      title={phase.label}
    />
  );
}

function UpcomingScalesCard({ scales }: { scales: ScaleItem[] }) {
  return (
    <section>
      <SectionHeading
        eyebrow="Em andamento"
        title="Proximas escalas"
        action={
          <Link href="/escalas" className="text-[12px] text-muted-foreground/65 hover:text-foreground transition-colors inline-flex items-center gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="space-y-2">
        {scales.map((scale) => {
          const total = scale.weeks.length;
          const done = scale.weeks.filter((w) => w.status === "concluido").length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          // Mes formatado ex: "Mai 2026"
          const [year, mon] = scale.month.split("-");
          const monthLabel = mon && year
            ? format(new Date(Number(year), Number(mon) - 1, 1), "MMM yyyy", { locale: ptBR })
            : scale.month;

          return (
            <Link
              key={scale._id}
              href={`/escalas/${scale._id}`}
              className="hover-lift"
            >
              <Card interactive className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {/* Badge mes */}
                  <span className="flex-col items-center justify-center bg-[oklch(0.22_0.030_158)] rounded-md px-2 py-1.5 shrink-0 hidden sm:flex min-w-[44px]">
                    <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[oklch(0.78_0.14_158)] leading-none">
                      {monthLabel.split(" ")[0]}
                    </span>
                    <span className="text-[11px] font-bold text-[oklch(0.86_0.13_158)] leading-none mt-0.5">
                      {monthLabel.split(" ")[1]}
                    </span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground/90 truncate leading-tight">
                      {scale.title}
                    </p>
                    {/* Mini pipeline de semanas */}
                    <div className="flex items-center gap-1 mt-2">
                      {scale.weeks
                        .slice()
                        .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
                        .map((w) => (
                          <WeekMiniChip key={w.number} status={w.status} />
                        ))}
                    </div>
                    {/* Barra de progresso */}
                    <div className="h-1 bg-[oklch(0.24_0.018_172)] rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100
                            ? "oklch(0.72 0.18 158)"
                            : "oklch(0.62 0.16 158)",
                        }}
                      />
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold tabular-nums text-muted-foreground/65 shrink-0 mt-0.5">
                    {pct}%
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOVO — Equipe ativa
// ═══════════════════════════════════════════════════════════════════

function TeamCard({ users, total }: { users: UserItem[]; total: number }) {
  return (
    <section>
      <SectionHeading
        eyebrow="Ministerio"
        title="Equipe ativa"
        action={
          <Link href="/membros" className="text-[12px] text-muted-foreground/65 hover:text-foreground transition-colors inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {total}
          </Link>
        }
      />
      <Card className="p-4">
        {/* Cluster de avatares */}
        <div className="flex items-center -space-x-2 mb-4">
          {users.slice(0, 6).map((u) => (
            <Avatar
              key={u._id}
              name={u.name}
              size="md"
              className="ring-2 ring-card"
            />
          ))}
          {total > 6 && (
            <span className="h-9 w-9 rounded-full bg-[oklch(0.255_0.016_172)] border-2 border-card inline-flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
              +{total - 6}
            </span>
          )}
        </div>

        {/* Lista de nomes */}
        <ul className="space-y-2">
          {users.slice(0, 5).map((u) => (
            <li key={u._id} className="flex items-center gap-2.5">
              <Avatar name={u.name} size="xs" />
              <span className="text-[13px] font-medium truncate flex-1 text-foreground/90">
                {u.name.split(" ")[0]}{" "}
                <span className="text-muted-foreground/50 font-normal">
                  {u.name.split(" ").slice(1).join(" ")}
                </span>
              </span>
              <Badge tone={ROLE_BADGE_TONE[u.role as Role] ?? "neutral"} className="shrink-0">
                {ROLE_LABELS[u.role as Role] ?? u.role}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Timeline de atividade
// ═══════════════════════════════════════════════════════════════════

function ActivityTimeline({
  items,
}: {
  items: Array<{ _id: string; message: string; createdAt: string; read: boolean }>;
}) {
  return (
    <section>
      <SectionHeading
        eyebrow="Notificacoes"
        title="Atividade recente"
        count={items.length}
        action={
          <Link
            href="/notificacoes"
            className="text-[12px] text-muted-foreground/65 hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Tudo <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <Card className="p-4">
        <ol className="relative space-y-4 pl-4">
          <span className="absolute left-1 top-1 bottom-1 w-px bg-border/60" aria-hidden />
          {items.map((n) => (
            <li key={n._id} className="relative">
              <span
                className={cn(
                  "absolute -left-3.5 top-1.5 h-2 w-2 rounded-full ring-4 ring-card",
                  !n.read ? "bg-[oklch(0.74_0.16_158)] status-pulse" : "bg-[oklch(0.40_0.06_172)]"
                )}
              />
              <p className="text-[13px] leading-snug text-foreground/90">{n.message}</p>
              <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/45 mt-1">
                {format(new Date(n.createdAt), "dd MMM · HH:mm", { locale: ptBR })}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-dashed border-border/60 rounded-lg p-8 text-center bg-card/40">
      <TrendingUp className="h-5 w-5 text-muted-foreground/35 mx-auto" />
      <p className="text-[13.5px] font-medium mt-2.5">{title}</p>
      {hint && <p className="text-[12px] text-muted-foreground/60 mt-1">{hint}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Skeleton de carregamento
// ═══════════════════════════════════════════════════════════════════

function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 pb-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full skeleton" />
          <div className="space-y-1.5">
            <div className="h-3 w-20 skeleton" />
            <div className="h-7 w-40 skeleton" />
            <div className="h-3 w-28 skeleton" />
          </div>
        </div>
        <div className="h-8 w-28 skeleton rounded-md" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 skeleton rounded-lg" />
        ))}
      </div>

      {/* Hero */}
      <div className="h-20 skeleton rounded-lg" />

      {/* Pipeline */}
      <div className="h-20 skeleton rounded-lg" />

      {/* Grade */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <div className="h-64 skeleton rounded-lg" />
          <div className="h-32 skeleton rounded-lg" />
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="h-40 skeleton rounded-lg" />
          <div className="h-48 skeleton rounded-lg" />
          <div className="h-36 skeleton rounded-lg" />
        </div>
      </div>
    </div>
  );
}
