"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function RoteirosPage() {
  const { data: session } = useSession();
  const [roteiros, setRoteiros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const canCreate = ["admin", "coordenador", "roteirista"].includes(role);

  useEffect(() => {
    fetch("/api/roteiros")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRoteiros)
      .catch(() => toast.error("Erro ao carregar roteiros"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-muted animate-pulse rounded-md" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Roteiros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Roteiros das semanas</p>
        </div>
        {canCreate && (
          <Link href="/roteiros/novo">
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Novo Roteiro</Button>
          </Link>
        )}
      </div>

      {roteiros.length === 0 ? (
        <div className="border rounded-lg p-16 text-center bg-card">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum roteiro criado</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left bg-muted/30">
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Autor</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Data</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Equipe</th>
              </tr>
            </thead>
            <tbody>
              {roteiros.map((r: any) => (
                <tr key={r._id} onClick={() => router.push(`/roteiros/${r._id}`)} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                        {r.fileUrl ? <Upload className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-blue-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium group-hover:text-primary transition-colors truncate">{r.title}</p>
                        {r.weekNumber && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">Semana {r.weekNumber}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.createdBy?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums hidden md:table-cell">
                    {format(new Date(r.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.fileUrl && <Badge variant="secondary" className="text-[10px]">Arquivo</Badge>}
                      {r.content && <Badge variant="secondary" className="text-[10px]">Texto</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end -space-x-1.5">
                      {(() => {
                        const people = [
                          ...(r.assignedNarrators || []),
                          ...(r.assignedEditors || []),
                        ];
                        if (people.length === 0)
                          return <span className="text-xs text-muted-foreground/40">—</span>;
                        return (
                          <>
                            {people.slice(0, 4).map((p: any, i: number) => (
                              <div
                                key={p._id || i}
                                title={p.name}
                                className="h-6 w-6 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[9px] font-bold text-primary"
                              >
                                {p.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                            ))}
                            {people.length > 4 && (
                              <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                                +{people.length - 4}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
