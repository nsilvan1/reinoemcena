"use client";
import { Fragment } from "react";
import { PenLine, Mic, Film, Eye, CircleCheck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEPS = [
  {
    key: "roteiro",
    label: "Roteiro",
    icon: PenLine,
    color: "text-[oklch(0.78_0.13_220)]",
    bg: "bg-[oklch(0.78_0.13_220)]",
    lightBg: "bg-[oklch(0.22_0.030_220)]",
    lightText: "text-[oklch(0.82_0.13_220)]",
    lightBorder: "border-[oklch(0.35_0.06_220)]",
    gradient: "from-[oklch(0.65_0.15_220)] to-[oklch(0.55_0.17_220)]",
    dotBg: "bg-[oklch(0.65_0.15_220)]",
    dot: "bg-[oklch(0.65_0.15_220)]",
    tagBg: "bg-[oklch(0.22_0.030_220)] text-[oklch(0.82_0.13_220)]",
  },
  {
    key: "gravacao",
    label: "Gravação",
    icon: Mic,
    color: "text-[oklch(0.78_0.13_60)]",
    bg: "bg-[oklch(0.78_0.13_60)]",
    lightBg: "bg-[oklch(0.22_0.030_60)]",
    lightText: "text-[oklch(0.82_0.13_60)]",
    lightBorder: "border-[oklch(0.35_0.06_60)]",
    gradient: "from-[oklch(0.65_0.15_60)] to-[oklch(0.55_0.17_60)]",
    dotBg: "bg-[oklch(0.65_0.15_60)]",
    dot: "bg-[oklch(0.65_0.15_60)]",
    tagBg: "bg-[oklch(0.22_0.030_60)] text-[oklch(0.82_0.13_60)]",
  },
  {
    key: "edicao",
    label: "Edição",
    icon: Film,
    color: "text-[oklch(0.78_0.13_300)]",
    bg: "bg-[oklch(0.78_0.13_300)]",
    lightBg: "bg-[oklch(0.22_0.025_300)]",
    lightText: "text-[oklch(0.82_0.13_300)]",
    lightBorder: "border-[oklch(0.35_0.05_300)]",
    gradient: "from-[oklch(0.65_0.15_300)] to-[oklch(0.55_0.17_300)]",
    dotBg: "bg-[oklch(0.65_0.15_300)]",
    dot: "bg-[oklch(0.65_0.15_300)]",
    tagBg: "bg-[oklch(0.22_0.025_300)] text-[oklch(0.82_0.13_300)]",
  },
  {
    key: "revisao",
    label: "Revisão",
    icon: Eye,
    color: "text-[oklch(0.78_0.13_25)]",
    bg: "bg-[oklch(0.78_0.13_25)]",
    lightBg: "bg-[oklch(0.22_0.030_25)]",
    lightText: "text-[oklch(0.82_0.13_25)]",
    lightBorder: "border-[oklch(0.35_0.06_25)]",
    gradient: "from-[oklch(0.65_0.15_25)] to-[oklch(0.55_0.17_25)]",
    dotBg: "bg-[oklch(0.65_0.15_25)]",
    dot: "bg-[oklch(0.65_0.15_25)]",
    tagBg: "bg-[oklch(0.22_0.030_25)] text-[oklch(0.82_0.13_25)]",
  },
  {
    key: "concluido",
    label: "Concluído",
    icon: CircleCheck,
    color: "text-[oklch(0.78_0.13_158)]",
    bg: "bg-[oklch(0.78_0.13_158)]",
    lightBg: "bg-[oklch(0.22_0.030_158)]",
    lightText: "text-[oklch(0.82_0.13_158)]",
    lightBorder: "border-[oklch(0.35_0.06_158)]",
    gradient: "from-[oklch(0.65_0.15_158)] to-[oklch(0.55_0.17_158)]",
    dotBg: "bg-[oklch(0.65_0.15_158)]",
    dot: "bg-[oklch(0.65_0.15_158)]",
    tagBg: "bg-[oklch(0.22_0.030_158)] text-[oklch(0.82_0.13_158)]",
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
                ? `${step.bg} text-[oklch(0.10_0.012_158)]`
                : i < idx
                ? "bg-[oklch(0.45_0.14_158)] text-[oklch(0.10_0.012_158)]"
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
                i < idx ? "bg-[oklch(0.45_0.14_158)]" : "bg-muted"
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
