"use client";
import { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
  endpoint: string;
  className?: string;
  label?: string;
  aspect?: "square" | "video";
}

export function ImageUpload({
  value,
  onChange,
  endpoint,
  className,
  label = "Imagem",
  aspect = "square",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || "Erro no upload");
        return;
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {value ? (
        <div className="relative group">
          <div
            className={cn(
              "w-full overflow-hidden rounded-lg border bg-muted",
              aspect === "square" ? "aspect-square" : "aspect-video"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white hover:bg-red-600 flex items-center justify-center transition-colors"
            title="Remover"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "block cursor-pointer w-full border-2 border-dashed rounded-lg bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-colors flex flex-col items-center justify-center text-muted-foreground",
            aspect === "square" ? "aspect-square" : "aspect-video",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          <Upload className={cn("h-6 w-6 mb-1", uploading && "animate-pulse")} />
          <span className="text-xs font-medium">
            {uploading ? "Enviando…" : "Clique para enviar"}
          </span>
          <span className="text-[10px] text-muted-foreground/60 mt-0.5">JPG · PNG · WEBP</span>
          <input
            ref={ref}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
