"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/escalas">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-heading text-2xl">Nova Escala</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Crie uma escala mensal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border rounded-lg bg-card">
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Título</Label>
                <Input placeholder="Escala Abril" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Mês</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required className="h-9" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Semanas</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setWeeks([...weeks, { theme: "", deadline: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16">#</th>
                    <th className="pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tema</th>
                    <th className="pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-36">Entrega</th>
                    <th className="pb-2 w-9"></th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-2 text-muted-foreground font-medium">S{i + 1}</td>
                      <td className="py-2 pr-2">
                        <Input placeholder="Tema da semana" value={week.theme} onChange={(e) => updateWeek(i, "theme", e.target.value)} required className="h-8 text-sm" />
                      </td>
                      <td className="py-2 pr-2">
                        <Input type="date" value={week.deadline} onChange={(e) => updateWeek(i, "deadline", e.target.value)} required className="h-8 text-sm" />
                      </td>
                      <td className="py-2">
                        {weeks.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setWeeks(weeks.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t bg-muted/20">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Escala"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
