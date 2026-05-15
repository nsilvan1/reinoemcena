"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, Calendar, FileText, Activity, Eye, Bell as BellIcon } from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, React.ElementType> = {
  escala: Calendar,
  roteiro: FileText,
  status: Activity,
  revisao: Eye,
  geral: BellIcon,
};

const TYPE_BG: Record<string, string> = {
  escala: "bg-blue-100 text-blue-600",
  roteiro: "bg-violet-100 text-violet-600",
  status: "bg-amber-100 text-amber-600",
  revisao: "bg-orange-100 text-orange-600",
  geral: "bg-gray-100 text-gray-600",
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
        <div className="h-8 w-40 bg-muted animate-pulse rounded-md" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Notificações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{unread.length} não lidas</p>
        </div>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAsRead()}>
            <CheckCheck className="h-4 w-4 mr-1.5" /> Marcar todas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="border rounded-xl p-16 text-center bg-card">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma notificacao</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupByDate(notifications).map(({ label, items }) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                {label}
              </p>
              <div className="card-elevated border rounded-xl bg-card overflow-hidden divide-y">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
