"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Calendar, FileText, Activity, Eye, Bell as BellIcon } from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button, Card, PageHeader, EmptyState } from "@/components/v2/primitives";

const TYPE_ICONS: Record<string, React.ElementType> = {
  escala: Calendar,
  roteiro: FileText,
  status: Activity,
  revisao: Eye,
  geral: BellIcon,
};

const TYPE_BG: Record<string, string> = {
  escala: "bg-[oklch(0.22_0.030_220)] text-[oklch(0.80_0.14_220)]",
  roteiro: "bg-[oklch(0.22_0.030_300)] text-[oklch(0.80_0.14_300)]",
  status: "bg-[oklch(0.22_0.030_60)] text-[oklch(0.80_0.14_60)]",
  revisao: "bg-[oklch(0.22_0.030_25)] text-[oklch(0.80_0.14_25)]",
  geral: "bg-[oklch(0.20_0.010_240)] text-muted-foreground",
};

function groupByDate(items: any[]) {
  const groups: { label: string; items: any[] }[] = [];
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

export default function NotificacoesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then(setNotifications)
      .catch(() => toast.error("Erro ao carregar notificações"))
      .finally(() => setLoading(false));
  }, []);

  async function markAsRead(id?: string) {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { markAllRead: true }),
    });
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifications(await res.json());
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 skeleton rounded-2xl" />
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Atividade"
        title="Notificações"
        description="Atualizações sobre suas escalas e a equipe"
        icon={Bell}
        actions={
          unread.length > 0 && (
            <Button variant="outline" onClick={() => markAsRead()}>
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </Button>
          )
        }
        meta={
          notifications.length > 0 && (
            <div className="flex items-center gap-5 text-xs">
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-lg font-semibold tabular-nums">{notifications.length}</span>
                <span className="text-muted-foreground">no total</span>
              </span>
              {unread.length > 0 && (
                <>
                  <span className="h-3 w-px bg-border" />
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-heading text-lg font-semibold tabular-nums text-primary">{unread.length}</span>
                    <span className="text-muted-foreground">não lidas</span>
                  </span>
                </>
              )}
            </div>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sem notificações"
          description="Você verá aqui avisos sobre suas escalas, roteiros e revisões."
        />
      ) : (
        <div className="space-y-5">
          {groupByDate(notifications).map(({ label, items }) => (
            <div key={label}>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 px-1 mb-2">
                {label}
              </p>
              <Card className="overflow-hidden">
                {items.map((n: any) => {
                  const NIcon = TYPE_ICONS[n.type] || TYPE_ICONS.geral;
                  const iconBg = TYPE_BG[n.type] || TYPE_BG.geral;
                  return (
                    <div
                      key={n._id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3.5 transition-colors",
                        !n.read && "bg-primary/[0.025]",
                        n.link ? "cursor-pointer hover:bg-accent/30" : "cursor-default"
                      )}
                      onClick={() => {
                        if (!n.read) markAsRead(n._id);
                        if (n.link) router.push(n.link);
                      }}
                    >
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
                        <NIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", !n.read ? "font-medium" : "text-muted-foreground")}>
                          {n.message}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {formatDistanceToNow(new Date(n.createdAt), { locale: ptBR, addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                        {!n.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n._id);
                            }}
                            className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                            title="Marcar como lida"
                          >
                            <Check className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
