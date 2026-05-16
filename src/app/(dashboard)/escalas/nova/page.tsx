"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Input, Field, PageHeader } from "@/components/v2/primitives";

interface WeekInput {
  theme: string;
  deadline: string;
}

export default function NovaEscalaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState("");
  const [weeks, setWeeks] = useState<WeekInput[]>([
    { theme: "", deadline: "" },
    { theme: "", deadline: "" },
    { theme: "", deadline: "" },
    { theme: "", deadline: "" },
  ]);
  const [loading, setLoading] = useState(false);

  function updateWeek(index: number, field: keyof WeekInput, value: string) {
    const updated = [...weeks];
    updated[index][field] = value;
    setWeeks(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/scales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, month, weeks: weeks.filter((w) => w.theme && w.deadline) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Escala criada!");
      router.push(`/escalas/${data._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Produção"
        title="Nova escala"
        description="Defina o mês e as semanas que compõem essa escala."
        icon={Calendar}
        back={{ href: "/escalas", label: "Escalas" }}
      />

      <form onSubmit={handleSubmit}>
        <Card className="overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Título">
                <Input
                  placeholder="Escala Abril"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Field>
              <Field label="Mês" hint="Formato AAAA-MM">
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/85">
                  Semanas
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setWeeks([...weeks, { theme: "", deadline: "" }])}
                >
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {weeks.map((week, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[3rem_1fr_10rem_2rem] gap-2 items-center"
                  >
                    <span className="text-[11px] font-mono font-bold text-muted-foreground bg-[oklch(0.20_0.010_240)] rounded-md px-2 py-2 text-center tabular-nums border border-border">
                      S{i + 1}
                    </span>
                    <Input
                      placeholder="Tema da semana"
                      value={week.theme}
                      onChange={(e) => updateWeek(i, "theme", e.target.value)}
                      required
                    />
                    <Input
                      type="date"
                      value={week.deadline}
                      onChange={(e) => updateWeek(i, "deadline", e.target.value)}
                      required
                    />
                    {weeks.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setWeeks(weeks.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-[oklch(0.16_0.010_240)]">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? "Criando..." : "Criar escala"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
