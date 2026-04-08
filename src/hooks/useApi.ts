"use client";
import { useState, useCallback } from "react";

export function useApi() {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (url: string, options?: RequestInit) => {
    setLoading(true);
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...options?.headers },
        ...options,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na requisição");
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading };
}
