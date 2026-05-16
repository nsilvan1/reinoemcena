"use client";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  images: string[];
  startIndex?: number;
  altPrefix?: string;
  onClose: () => void;
}

export function ImageLightbox({ open, images, startIndex = 0, altPrefix = "", onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, prev, next]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || images.length === 0 || !mounted) return null;

  const currentUrl = images[index];
  const isMulti = images.length > 1;

  async function handleDownload() {
    try {
      const res = await fetch(currentUrl);
      const blob = await res.blob();
      const ext = currentUrl.split(".").pop()?.toLowerCase() || "img";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${altPrefix || "imagem"}-${index + 1}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {
      // fallback: navegação direta
      window.open(currentUrl, "_blank");
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483600] bg-black/90 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 px-4 py-3 flex items-center justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-white/80 text-sm font-medium">
          {altPrefix && <span>{altPrefix} · </span>}
          {isMulti && (
            <span className="text-white/50">
              {index + 1} / {images.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Baixar imagem"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Fechar (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="max-w-[95vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentUrl}
          alt={altPrefix}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          draggable={false}
        />
      </div>

      {/* Nav arrows */}
      {isMulti && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              "h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white",
              "flex items-center justify-center transition-colors shadow-lg"
            )}
            title="Anterior (←)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white",
              "flex items-center justify-center transition-colors shadow-lg"
            )}
            title="Próxima (→)"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Bottom strip with thumbs */}
      {isMulti && images.length <= 12 && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent flex justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1.5 overflow-x-auto max-w-[90vw] py-1">
            {images.map((u, i) => (
              <button
                key={u}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-12 w-12 shrink-0 rounded-md overflow-hidden border-2 transition-all",
                  i === index ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
