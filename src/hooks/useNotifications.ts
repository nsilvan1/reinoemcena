"use client";
import { useState, useEffect, useCallback } from "react";

interface Notification {
  _id: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && !cancelled) {
          const data: Notification[] = await res.json();
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.read).length);
        }
      } catch (err) {
        console.error("Notifications fetch failed:", err);
      }
    }

    void load();
    const interval = setInterval(() => { void load(); }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  const markAsRead = useCallback(async (id?: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { markAllRead: true }),
    });
    setTick((t) => t + 1);
  }, []);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  return { notifications, unreadCount, markAsRead, refresh };
}
