"use client";
import { Fragment } from "react";
import { PenLine, Mic, Film, Eye, CircleCheck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEPS = [
  {
    key: "roteiro",
    label: "Roteiro",
    icon: PenLine,
    color: "text-blue-600",
    bg: "bg-blue-600",
    lightBg: "bg-blue-50",
    lightText: "text-blue-700",
    lightBorder: "border-blue-200",
    gradient: "from-blue-500 to-blue-600",
    dotBg: "bg-blue-500",
    dot: "bg-blue-500",
    tagBg: "bg-blue-100 text-blue-700",
  },
  {
    key: "gravacao",
    label: "Gravação",
    icon: Mic,
    color: "text-amber-600",
    bg: "bg-amber-600",
    lightBg: "bg-amber-50",
    lightText: "text-amber-700",
    lightBorder: "border-amber-200",
    gradient: "from-amber-500 to-amber-600",
    dotBg: "bg-amber-500",
    dot: "bg-amber-500",
    tagBg: "bg-amber-100 text-amber-700",
  },
  {
    key: "edicao",
    label: "Edição",
    icon: Film,
    color: "text-violet-600",
    bg: "bg-violet-600",
    lightBg: "bg-violet-50",
    lightText: "text-violet-700",
    lightBorder: "border-violet-200",
    gradient: "from-violet-500 to-violet-600",
    dotBg: "bg-violet-500",
    dot: "bg-violet-500",
    tagBg: "bg-violet-100 text-violet-700",
  },
  {
    key: "revisao",
    label: "Revisão",
    icon: Eye,
    color: "text-orange-600",
    bg: "bg-orange-600",
    lightBg: "bg-orange-50",
    lightText: "text-orange-700",
    lightBorder: "border-orange-200",
    gradient: "from-orange-500 to-orange-600",
    dotBg: "bg-orange-500",
    dot: "bg-orange-500",
    tagBg: "bg-orange-100 text-orange-700",
  },
  {
    key: "concluido",
    label: "Concluído",
    icon: CircleCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-600",
    lightBg: "bg-emerald-50",
    lightText: "text-emerald-700",
    lightBorder: "border-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
    dotBg: "bg-emerald-500",
    dot: "bg-emerald-500",
    tagBg: "bg-emerald-100 text-emerald-700",
  },
];

export default function MiniPipeline({ status }: { status: string }) {
  const idx = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-px">
      {STEPS.map((step, i) => (
        <Fragment key={step.key}>
          <div
            className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center transition-all",
              i === idx
                ? `${step.bg} text-white`
                : i < idx
                ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground/20"
            )}
          >
            {i < idx ? (
              <CheckCircle className="h-2.5 w-2.5" />
            ) : (
              <step.icon className="h-2.5 w-2.5" />
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "w-1.5 h-0.5 rounded-full",
                i < idx ? "bg-emerald-300" : "bg-muted"
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
