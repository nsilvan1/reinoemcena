"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  className?: string;
}

export function TraitInput({
  value,
  onChange,
  placeholder = "Adicionar característica…",
  maxItems = 10,
  className,
}: Props) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim().slice(0, 30);
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setDraft("");
      return;
    }
    if (value.length >= maxItems) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function remove(t: string) {
    onChange(value.filter((x) => x !== t));
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
          >
            #{t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="hover:bg-primary/20 rounded-full -mr-0.5"
              aria-label={`Remover ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {value.length < maxItems && (
        <div className="flex gap-1.5">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder={placeholder}
            className="h-8 text-xs"
            maxLength={30}
          />
          <button
            type="button"
            onClick={commit}
            disabled={!draft.trim()}
            className="h-8 w-8 rounded-md border bg-background hover:bg-muted disabled:opacity-40 flex items-center justify-center"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
