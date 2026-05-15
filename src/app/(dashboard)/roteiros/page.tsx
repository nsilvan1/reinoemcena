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
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

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

  const withFile = roteiros.filter((r) => r.fileUrl).length;
  const withText = roteiros.filter((r) => r.content).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentos"
        title="Roteiros"
        description="Roteiros e materiais escritos de cada semana"
        icon={FileText}
        actions={
          canCreate && (
            <Link href="/roteiros/novo">
              <Button size="sm" className="h-9 shadow-sm shadow-primary/15">
                <Plus className="h-4 w-4 mr-1.5" /> Novo roteiro
              </Button>
            </Link>
          )
        }
        meta={
          roteiros.length > 0 && (
            <div className="flex items-center gap-5 text-xs">
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-lg font-semibold tabular-nums">{roteiros.length}</span>
                <span className="text-muted-foreground">no total</span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-lg font-semibold tabular-nums text-blue-600">{withText}</span>
                <span className="text-muted-foreground">com texto</span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-lg font-semibold tabular-nums text-violet-600">{withFile}</span>
                <span className="text-muted-foreground">com arquivo</span>
              </span>
            </div>
          )
        }
      />

      {roteiros.length === 0 ? (
        <EmptyState
          icon={FileText}
          tone="primary"
          title="Nenhum roteiro ainda"
          description="Comece criando o primeiro roteiro ou faça upload de um documento existente."
          action={
            canCreate && (
              <Link href="/roteiros/novo">
                <Button size="sm" className="h-9 shadow-sm shadow-primary/15">
                  <Plus className="h-4 w-4 mr-1.5" /> Criar primeiro roteiro
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="card-glass rounded-2xl overflow-hidden animate-in-view">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-muted/30 border-b border-border/60">
                <th className="pl-5 sm:pl-6 pr-3 py-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em]">Título</th>
                <th className="px-3 py-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] hidden sm:table-cell">Autor</th>
                <th className="px-3 py-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] hidden md:table-cell">Data</th>
                <th className="px-3 py-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em]">Tipo</th>
                <th className="px-3 sm:pr-6 py-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] text-right">Equipe</th>
              </tr>
            </thead>
            <tbody>
              {roteiros.map((r: any) => (
                <tr
                  key={r._id}
                  onClick={() => router.push(`/roteiros/${r._id}`)}
                  className="border-t border-border/60 hover:bg-primary/[0.025] transition-colors group cursor-pointer"
                >
                  <td className="pl-5 sm:pl-6 pr-3 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
                        {r.fileUrl ? <Upload className="h-4 w-4 text-primary" strokeWidth={1.8} /> : <FileText className="h-4 w-4 text-primary" strokeWidth={1.8} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground/90 group-hover:text-primary transition-colors truncate leading-tight">
                          {r.title}
                        </p>
                        {r.weekNumber && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 uppercase tracking-wider font-semibold">
                            Semana {r.weekNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-muted-foreground hidden sm:table-cell">{r.createdBy?.name}</td>
                  <td className="px-3 py-3.5 text-muted-foreground tabular-nums text-xs hidden md:table-cell">
                    {format(new Date(r.createdAt), "dd MMM yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {r.fileUrl && (
                        <Badge variant="secondary" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200/60 font-semibold">
                          Arquivo
                        </Badge>
                      )}
                      {r.content && (
                        <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200/60 font-semibold">
                          Texto
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:pr-6 py-3.5">
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
                                className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary shadow-sm"
                              >
                                {p.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                            ))}
                            {people.length > 4 && (
                              <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
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
