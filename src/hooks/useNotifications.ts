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

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch {}
  }, []);

  const markAsRead = useCallback(async (id?: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { markAllRead: true }),
    });
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return { notifications, unreadCount, markAsRead, refresh: fetchNotifications };
}
