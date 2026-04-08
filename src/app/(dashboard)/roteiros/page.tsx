"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Upload } from "lucide-react";
import { format } from "date-fns";

export default function RoteirosPage() {
  const { data: session } = useSession();
  const [roteiros, setRoteiros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const canCreate = ["admin", "coordenador", "roteirista"].includes(role);

  useEffect(() => {
    fetch("/api/roteiros").then((r) => r.json()).then(setRoteiros).finally(() => setLoading(false));
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
                <th className="px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Titulo</th>
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
                      <span className="font-medium group-hover:text-primary transition-colors truncate">
                        {r.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.createdBy?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums hidden md:table-cell">
                    {format(new Date(r.createdAt), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.fileUrl && <Badge variant="secondary" className="text-[10px]">Arquivo</Badge>}
                      {r.content && <Badge variant="secondary" className="text-[10px]">Texto</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-muted-foreground">
                      {r.assignedNarrators?.length || 0}N · {r.assignedEditors?.length || 0}E
                    </span>
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
