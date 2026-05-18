"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  FileText,
  Activity,
  Eye,
  Filter,
  Inbox,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button, Card, PageHeader, EmptyState, Stat } from "@/components/v2/primitives";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = "escala" | "roteiro" | "status" | "revisao" | "geral";

type Notification = {
  _id: string;
  message: string;
  type: NotifType;
  read: boolean;
  link?: string;
  createdAt: string;
};

type FilterTab = "todas" | "nao-lidas" | NotifType;

// ─── Config por tipo ──────────────────────────────────────────────────────────

const TYPE_META: Record<
  NotifType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    bullet: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  escala: {
    label:     "Escala",
    icon:      Calendar,
    bullet:    "bg-[oklch(0.74_0.16_158)]",
    iconBg:    "bg-[oklch(0.22_0.030_158)]",
    iconColor: "text-[oklch(0.82_0.14_158)]",
  },
  roteiro: {
    label:     "Roteiro",
    icon:      FileText,
    bullet:    "bg-[oklch(0.72_0.16_220)]",
    iconBg:    "bg-[oklch(0.22_0.030_220)]",
    iconColor: "text-[oklch(0.82_0.14_220)]",
  },
  status: {
    label:     "Status",
    icon:      Activity,
    bullet:    "bg-[oklch(0.78_0.16_60)]",
    iconBg:    "bg-[oklch(0.22_0.030_60)]",
    iconColor: "text-[oklch(0.85_0.14_60)]",
  },
  revisao: {
    label:     "Revisão",
    icon:      Eye,
    bullet:    "bg-[oklch(0.65_0.20_25)]",
    iconBg:    "bg-[oklch(0.22_0.030_25)]",
    iconColor: "text-[oklch(0.82_0.14_25)]",
  },
  geral: {
    label:     "Geral",
    icon:      Bell,
    bullet:    "bg-[oklch(0.42_0.025_170)]",
    iconBg:    "bg-[oklch(0.22_0.016_172)]",
    iconColor: "text-muted-foreground",
  },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "todas",     label: "Todas"     },
  { key: "nao-lidas", label: "Não lidas" },
  { key: "escala",    label: "Escala"    },
  { key: "roteiro",   label: "Roteiro"   },
  { key: "status",    label: "Status"    },
  { key: "revisao",   label: "Revisão"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const groups: { label: string; items: Notification[] }[] = [];
  const map: Record<string, number> = {};
  items.forEach((n) => {
    const d = new Date(n.createdAt);
    const key = isToday(d)
      ? "Hoje"
      : isYesterday(d)
      ? "Ontem"
      : format(d, "d 'de' MMMM", { locale: ptBR });
    if (map[key] === undefined) {
      map[key] = groups.length;
      groups.push({ label: key, items: [] });
    }
    groups[map[key]].items.push(n);
  });
  return groups;
}

function countToday(items: Notification[]): number {
  return items.filter((n) => isToday(new Date(n.createdAt))).length;
}

// ─── Notification card item ───────────────────────────────────────────────────

function NotifCard({
  n,
  onRead,
  onNavigate,
}: {
  n: Notification;
  onRead: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) {
  const meta  = TYPE_META[n.type] || TYPE_META.geral;
  const NIcon = meta.icon;

  return (
    <Card
      interactive
      className={cn(
        "p-4 hover-lift animate-in-view",
        !n.read && "border-primary/20 bg-primary/[0.03]"
      )}
      onClick={() => onNavigate(n)}
    >
      <div className="flex items-start gap-3">
        {/* Icon square */}
        <span
          className={cn(
            "h-10 w-10 rounded-md inline-flex items-center justify-center shrink-0",
            meta.iconBg
          )}
        >
          <NIcon className={cn("h-4 w-4", meta.iconColor)} strokeWidth={1.8} />
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-[13px] leading-snug flex-1",
                !n.read ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {n.message}
            </p>

            {/* Unread dot + mark button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!n.read && (
                <span className={cn("h-2 w-2 rounded-full shrink-0", meta.bullet, "status-pulse")} />
              )}
              {!n.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead(n._id);
                  }}
                  className="h-7 w-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[oklch(0.255_0.016_172)] transition-colors"
                  title="Marcar como lida"
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-muted-foreground/50">
              {formatDistanceToNow(new Date(n.createdAt), { locale: ptBR, addSuffix: true })}
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
            <span className={cn("text-[10px] font-semibold uppercase tracking-[0.06em]", meta.iconColor)}>
              {meta.label}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificacoesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<FilterTab>("todas");

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then(setNotifications)
      .catch(() => toast.error("Erro ao carregar notificações"))
      .finally(() => setLoading(false));
  }, []);

  async function markAsRead(id?: string) {
    try {
      await fetch("/api/notifications", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(id ? { id } : { markAllRead: true }),
      });
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch {
      toast.error("Não foi possível marcar como lida");
    }
  }

  function handleNavigate(n: Notification) {
    if (!n.read) markAsRead(n._id);
    if (n.link) router.push(n.link);
  }

  const unread  = notifications.filter((n) => !n.read);
  const todayCount = countToday(notifications);

  const filtered = useMemo(() => {
    if (filter === "todas")     return notifications;
    if (filter === "nao-lidas") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 skeleton rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
        <div className="h-8 w-full skeleton rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Atividade"
        title="Notificações"
        description="Atualizações sobre suas escalas e a equipe"
        icon={Bell}
        actions={
          unread.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAsRead()}>
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />

      {/* ── Stat strip ── */}
      {notifications.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Stat
            icon={Bell}
            label="Não lidas"
            value={unread.length}
            accent={unread.length > 0 ? "danger" : "primary"}
            animated
            pulse={unread.length > 0}
            className="animate-in-view stagger-1"
          />
          <Stat
            icon={Calendar}
            label="Hoje"
            value={todayCount}
            accent="info"
            animated
            className="animate-in-view stagger-2"
          />
          <Stat
            icon={Inbox}
            label="Total"
            value={notifications.length}
            accent="primary"
            animated
            className="animate-in-view stagger-3"
          />
        </div>
      )}

      {/* Filter tabs */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 animate-in-view stagger-4">
          <Filter className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mr-1" />
          {FILTER_TABS.map((tab) => {
            const count =
              tab.key === "todas"
                ? notifications.length
                : tab.key === "nao-lidas"
                ? unread.length
                : notifications.filter((n) => n.type === tab.key).length;
            if (count === 0 && tab.key !== "todas" && tab.key !== "nao-lidas") return null;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors min-h-[36px]",
                  filter === tab.key
                    ? "bg-[oklch(0.255_0.016_172)] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-[oklch(0.225_0.014_172)]"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-[10px] tabular-nums px-1 py-0.5 rounded min-w-[18px] text-center",
                      filter === tab.key
                        ? "bg-primary/20 text-primary"
                        : "bg-[oklch(0.255_0.016_172)] text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sem notificações"
          description="Você verá aqui avisos sobre suas escalas, roteiros e revisões."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nenhuma notificação aqui"
          description="Tente outro filtro para ver mais."
        />
      ) : (
        <div className="space-y-8">
          {groups.map(({ label, items }) => (
            <div key={label}>
              {/* Day label */}
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/45 mb-3 px-1">
                {label}
              </p>

              {/* Card list */}
              <div className="space-y-2">
                {items.map((n, idx) => (
                  <div
                    key={n._id}
                    className={cn(
                      idx === 0 ? "stagger-5" :
                      idx === 1 ? "stagger-6" :
                      idx === 2 ? "stagger-7" :
                      "stagger-8"
                    )}
                  >
                    <NotifCard
                      n={n}
                      onRead={markAsRead}
                      onNavigate={handleNavigate}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
