"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  escala: "Escala", roteiro: "Roteiro", status: "Status", revisao: "Revisao", geral: "Geral",
};

const TYPE_DOTS: Record<string, string> = {
  escala: "bg-blue-500", roteiro: "bg-violet-500", status: "bg-amber-500", revisao: "bg-orange-500", geral: "bg-gray-400",
};

export default function NotificacoesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications").then((r) => r.json()).then(setNotifications).finally(() => setLoading(false));
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
          <h1 className="font-heading text-2xl">Notificacoes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{unread.length} nao lidas</p>
        </div>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAsRead()}>
            <CheckCheck className="h-4 w-4 mr-1.5" /> Marcar todas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="border rounded-lg p-16 text-center bg-card">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma notificacao</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left bg-muted/30">
                <th className="px-4 py-3 w-6"></th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mensagem</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell w-20">Tipo</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell w-28">Data</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n: any) => (
                <tr
                  key={n._id}
                  className={cn(
                    "border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
                    !n.read && "bg-primary/[0.02]"
                  )}
                  onClick={() => {
                    if (!n.read) markAsRead(n._id);
                    if (n.link) router.push(n.link);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className={cn("h-1.5 w-1.5 rounded-full", !n.read ? "bg-primary" : "bg-transparent")} />
                  </td>
                  <td className="px-4 py-3">
                    <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOTS[n.type] || TYPE_DOTS.geral)} />
                      {TYPE_LABELS[n.type] || "Geral"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground tabular-nums hidden md:table-cell">
                    {format(new Date(n.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    {!n.read && (
                      <button
                        className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
                        onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                      >
                        <Check className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
