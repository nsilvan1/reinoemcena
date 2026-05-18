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
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button, Avatar, KpiInline, KpiDivider } from "@/components/v2/primitives";

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
  roteirista: { icon: PenLine, label: "Roteiro", hue: 220 },
  narrador: { icon: Mic, label: "Gravação", hue: 60 },
  editor: { icon: Film, label: "Edição", hue: 300 },
} as const;

const PHASE_META = {
  roteiro: { icon: PenLine, label: "Roteiro", hue: 220 },
  gravacao: { icon: Mic, label: "Gravação", hue: 60 },
  edicao: { icon: Film, label: "Edição", hue: 300 },
  revisao: { icon: Eye, label: "Revisão", hue: 25 },
  concluido: { icon: CircleCheck, label: "Concluído", hue: 158 },
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
  const [notifications, setNotifications] = useState<
    Array<{ _id: string; message: string; createdAt: string; read: boolean }>
  >([]);
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

  if (loading || !data) return <DashboardSkeleton />;

  const unread = notifications.filter((n) => !n.read);
  const userRole = (session?.user as { role?: string })?.role ?? "membro";
  const canReview = ["admin", "coordenador"].includes(userRole);
  const userName = session?.user?.name?.split(" ")[0] ?? "";

  const heroTask = data.myPendingTasks[0];
  const heroReview = !heroTask && canReview ? data.pendingReviews[0] : null;
  const heroDeadline = !heroTask && !heroReview ? data.upcomingDeadlines[0] : null;

  const totalWeeks = data.stats.totalWeeks || 1;

  return (
    <div className="space-y-8">
      {/* ─── Header: greeting + inline KPI strip ─── */}
      <header className="flex items-end justify-between gap-6 flex-wrap pb-5 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={userName} size="lg" status="online" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/65 leading-none">
              {greeting()}
            </p>
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.025em] leading-tight mt-1.5">
              {userName || "Olá"}
            </h1>
            <p className="text-[12.5px] text-muted-foreground/65 mt-1 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 ml-auto">
          <KpiInline value={data.stats.totalScales} label="escalas" />
          <KpiDivider />
          <KpiInline value={data.stats.pendingWeeks} label="em curso" />
          <KpiDivider />
          <KpiInline value={data.stats.completedWeeks} label="concluídos" tone="primary" />
          <KpiDivider />
          <KpiInline value={unread.length} label="alertas" tone={unread.length > 0 ? "warning" : "muted"} />
        </div>

        {canReview && (
          <Link href="/escalas">
            <Button>
              <Plus className="h-3.5 w-3.5" /> Nova escala
            </Button>
          </Link>
        )}
      </header>

      {/* ─── Hero compacto (ação prioritária) ─── */}
      <section>
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
        <section>
          <SectionLabel
            title="Distribuição do mês"
            hint={`${data.stats.completedWeeks}/${data.stats.totalWeeks} semanas concluídas · ${data.stats.progressPct}%`}
          />
          <div className="grid grid-cols-5 gap-px bg-border/40 rounded-md overflow-hidden">
            {(Object.keys(PHASE_META) as WeekStatus[]).map((key) => {
              const phase = PHASE_META[key];
              const count = data.phaseDistribution[key] || 0;
              const pct = (count / totalWeeks) * 100;
              const Icon = phase.icon;
              return (
                <div
                  key={key}
                  className="bg-card relative p-3.5 group cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: `oklch(0.82 0.14 ${phase.hue})` }}
                      strokeWidth={1.9}
                    />
                    <span
                      className="text-[10px] font-medium uppercase tracking-[0.08em]"
                      style={{ color: `oklch(0.75 0.10 ${phase.hue})` }}
                    >
                      {phase.label}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums leading-none">{count}</p>
                  {/* progress bar embaixo */}
                  <div
                    className="absolute left-0 right-0 bottom-0 h-0.5"
                    style={{ background: `oklch(0.22 0.030 ${phase.hue})` }}
                  >
                    <div
                      className="h-full transition-all"
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

      {/* ─── Two columns: prazos (tabela) + revisão/atividade ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Esquerda: TABELA densa de prazos */}
        <div className="lg:col-span-7">
          {data.upcomingDeadlines.length > 0 ? (
            <DeadlinesTable items={data.upcomingDeadlines} />
          ) : (
            <EmptyBlock
              title="Sem prazos críticos"
              hint="Tudo no ritmo certo — nenhuma semana vencendo agora."
            />
          )}
        </div>

        {/* Direita: stack vertical com listas slim */}
        <aside className="lg:col-span-5 space-y-7">
          {canReview && data.pendingReviews.length > 0 && (
            <ReviewsList items={data.pendingReviews} />
          )}

          {unread.length > 0 && (
            <ActivityTimeline items={unread.slice(0, 6)} />
          )}

          {/* Suas tarefas extras (além da hero) */}
          {data.myPendingTasks.length > 1 && (
            <PersonalTasks items={data.myPendingTasks.slice(1, 4)} />
          )}
        </aside>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Hero (ação prioritária — compacto, banner horizontal)
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
  const className = "relative block rounded-lg border border-border bg-card overflow-hidden group transition-colors hover:border-[oklch(0.40_0.10_var(--h))]";
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
    <Link href={href} className={className} style={{ "--h": hue } as React.CSSProperties}>
      {inner}
    </Link>
  ) : (
    <div className={className} style={{ "--h": hue } as React.CSSProperties}>
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
              {wasRejected ? "Refazer entrega" : "Sua próxima ação"}
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
              “{task.reviewReason}”
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
        <Avatar name={review.editorName} size="lg" status="online" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[oklch(0.82_0.14_60)]">
              Aguarda sua revisão
            </span>
            <span className="text-[11px] text-muted-foreground/50 font-mono">
              {review.scaleTitle} · S{review.weekNumber} · {review.theme}
            </span>
          </div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] leading-snug mt-0.5">
            {review.editorName} <span className="font-normal text-muted-foreground/70 text-[15px]">precisa da sua aprovação</span>
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
              Próximo prazo · {phase.label}
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
          {d.overdue ? `−${Math.abs(d.daysRemaining)}d` : d.daysRemaining === 0 ? "Hoje" : `${d.daysRemaining}d`}
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
            Nenhuma ação pendente
          </h2>
          <p className="text-[12.5px] text-muted-foreground/70 mt-0.5">
            Aproveite pra explorar o acervo ou revisar comentários antigos.
          </p>
        </div>
        <Link
          href="/acervo"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md bg-[oklch(0.26_0.040_158)] text-[oklch(0.86_0.14_158)] hover:bg-[oklch(0.30_0.045_158)] transition-colors shrink-0"
        >
          Acervo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </HeroFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Section label (simples — sem Card)
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
// Tabela densa de prazos (substitui DeadlineRow Card-soup)
// ═══════════════════════════════════════════════════════════════════

function DeadlinesTable({ items }: { items: UpcomingDeadline[] }) {
  return (
    <section>
      <SectionLabel
        title="Próximos prazos"
        hint={`${items.length} semanas em produção · ordenadas por urgência`}
        action={
          <Link
            href="/escalas"
            className="text-[12px] text-muted-foreground/65 hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left border-b border-border/60">
              <th className="font-medium text-[10px] uppercase tracking-[0.08em] text-muted-foreground/55 px-4 py-2.5 w-16">
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
              <th className="font-medium text-[10px] uppercase tracking-[0.08em] text-muted-foreground/55 px-4 py-2.5 text-right w-24">
                Prazo
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => {
              const phase = PHASE_META[d.status];
              const Icon = phase.icon;
              const urgent = d.overdue || d.daysRemaining <= 2;
              return (
                <tr
                  key={`${d.scaleId}-${d.weekNumber}`}
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
                    <span className="text-[12px] text-muted-foreground/70">{d.scaleTitle}</span>
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
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Lista vertical slim de Aguardando você
// ═══════════════════════════════════════════════════════════════════

function ReviewsList({ items }: { items: PendingReview[] }) {
  return (
    <section>
      <SectionLabel
        title="Aguardando sua revisão"
        hint={`${items.length} entrega${items.length > 1 ? "s" : ""} esperando aprovação`}
      />
      <ul className="divide-y divide-border/40 border-y border-border/40">
        {items.map((r) => (
          <li key={`${r.scaleId}-${r.weekNumber}-${r.editorId}`}>
            <Link
              href={`/escalas/${r.scaleId}`}
              className="flex items-center gap-3 py-3 group"
            >
              <Avatar name={r.editorName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground/90 leading-tight">
                  {r.editorName}
                </p>
                <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5 font-mono">
                  {r.scaleTitle} · S{r.weekNumber} · {r.theme}
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
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
      <SectionLabel
        title="Atividade recente"
        action={
          <Link
            href="/notificacoes"
            className="text-[12px] text-muted-foreground/65 hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Tudo <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <ol className="relative space-y-3.5 pl-4">
        <span className="absolute left-1 top-1 bottom-1 w-px bg-border/60" aria-hidden />
        {items.map((n) => (
          <li key={n._id} className="relative">
            <span className="absolute -left-3.5 top-1.5 h-2 w-2 rounded-full bg-[oklch(0.65_0.18_158)] ring-4 ring-background" />
            <p className="text-[13px] leading-snug text-foreground/90">{n.message}</p>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/45 mt-1">
              {format(new Date(n.createdAt), "dd MMM · HH:mm", { locale: ptBR })}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tarefas pessoais (slim)
// ═══════════════════════════════════════════════════════════════════

function PersonalTasks({ items }: { items: PendingTask[] }) {
  return (
    <section>
      <SectionLabel title="Outras tarefas suas" hint={`${items.length} pendente${items.length > 1 ? "s" : ""}`} />
      <ul className="space-y-1.5">
        {items.map((t) => {
          const meta = ROLE_META[t.role];
          const Icon = meta.icon;
          const deadline = t.deadline ? new Date(t.deadline) : null;
          const overdue = deadline && deadline < new Date();
          return (
            <li key={`${t.scaleId}-${t.weekNumber}`}>
              <Link
                href={`/escalas/${t.scaleId}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-[oklch(0.22_0.016_172)] transition-colors group"
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: `oklch(0.78 0.13 ${meta.hue})` }}
                  strokeWidth={1.9}
                />
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-dashed border-border/60 rounded-md p-8 text-center bg-card/40">
      <TrendingUp className="h-5 w-5 text-muted-foreground/35 mx-auto" />
      <p className="text-[13.5px] font-medium mt-2.5">{title}</p>
      {hint && <p className="text-[12px] text-muted-foreground/60 mt-1">{hint}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6 pb-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full skeleton" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 skeleton" />
            <div className="h-7 w-44 skeleton" />
            <div className="h-3 w-32 skeleton" />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-20 skeleton" />
          ))}
        </div>
      </div>
      <div className="h-20 skeleton rounded-md" />
      <div className="h-24 skeleton rounded-md" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 h-72 skeleton rounded-md" />
        <div className="lg:col-span-5 space-y-7">
          <div className="h-40 skeleton rounded-md" />
          <div className="h-40 skeleton rounded-md" />
        </div>
      </div>
    </div>
  );
}
