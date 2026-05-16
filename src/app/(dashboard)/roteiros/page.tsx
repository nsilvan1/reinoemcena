"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button, Card, Badge, Avatar, PageHeader, EmptyState } from "@/components/v2/primitives";
import { cn } from "@/lib/utils";

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
        <div className="h-8 w-40 skeleton rounded-md" />
        <div className="h-64 skeleton rounded-lg" />
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
              <Button>
                <Plus className="h-3.5 w-3.5" /> Novo roteiro
              </Button>
            </Link>
          )
        }
        meta={
          roteiros.length > 0 && (
            <div className="flex items-center gap-6 text-[12px]">
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold tabular-nums">{roteiros.length}</span>
                <span className="text-muted-foreground/65 font-mono uppercase tracking-[0.18em] text-[10px]">no total</span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold tabular-nums text-[oklch(0.80_0.14_220)]">{withText}</span>
                <span className="text-muted-foreground/65 font-mono uppercase tracking-[0.18em] text-[10px]">com texto</span>
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-semibold tabular-nums text-[oklch(0.80_0.14_300)]">{withFile}</span>
                <span className="text-muted-foreground/65 font-mono uppercase tracking-[0.18em] text-[10px]">com arquivo</span>
              </span>
            </div>
          )
        }
      />

      {roteiros.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum roteiro ainda"
          description="Comece criando o primeiro roteiro ou faça upload de um documento existente."
          action={
            canCreate && (
              <Link href="/roteiros/novo">
                <Button>
                  <Plus className="h-3.5 w-3.5" /> Criar primeiro roteiro
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden animate-in-view">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left bg-[oklch(0.205_0.016_172)] border-b border-border">
                <th className="pl-6 pr-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">Título</th>
                <th className="px-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 hidden sm:table-cell">Autor</th>
                <th className="px-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 hidden md:table-cell">Data</th>
                <th className="px-3 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55">Tipo</th>
                <th className="px-3 pr-6 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/55 text-right">Equipe</th>
              </tr>
            </thead>
            <tbody>
              {roteiros.map((r: { _id: string; title: string; fileUrl?: string; content?: string; weekNumber?: number; createdBy?: { name?: string }; createdAt: string; assignedNarrators?: Array<{ _id: string; name: string }>; assignedEditors?: Array<{ _id: string; name: string }> }) => (
                <tr
                  key={r._id}
                  onClick={() => router.push(`/roteiros/${r._id}`)}
                  className="border-t border-border/60 hover:bg-[oklch(0.225_0.016_172)] transition-colors group cursor-pointer"
                >
                  <td className="pl-6 pr-3 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-9 w-9 rounded-lg bg-[oklch(0.18_0.014_158)] ring-1 ring-[oklch(0.28_0.030_158)]/40 flex items-center justify-center shrink-0">
                        {r.fileUrl ? (
                          <Upload className="h-4 w-4 text-[oklch(0.80_0.14_158)]" strokeWidth={1.8} />
                        ) : (
                          <FileText className="h-4 w-4 text-[oklch(0.80_0.14_158)]" strokeWidth={1.8} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate leading-tight group-hover:text-[oklch(0.92_0.05_158)] transition-colors">
                          {r.title}
                        </p>
                        {r.weekNumber && (
                          <p className="text-[10px] text-muted-foreground/55 mt-0.5 uppercase tracking-[0.18em] font-mono">
                            Semana {r.weekNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-muted-foreground hidden sm:table-cell font-mono text-xs">{r.createdBy?.name}</td>
                  <td className="px-3 py-3.5 text-muted-foreground tabular-nums text-xs hidden md:table-cell font-mono">
                    {format(new Date(r.createdAt), "dd MMM yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {r.fileUrl && <Badge tone="violet">Arquivo</Badge>}
                      {r.content && <Badge tone="info">Texto</Badge>}
                    </div>
                  </td>
                  <td className="px-3 pr-6 py-3.5">
                    <div className="flex items-center justify-end -space-x-1.5">
                      {(() => {
                        const people = [
                          ...(r.assignedNarrators || []),
                          ...(r.assignedEditors || []),
                        ];
                        if (people.length === 0)
                          return <span className="text-xs text-muted-foreground/30">—</span>;
                        return (
                          <>
                            {people.slice(0, 4).map((p, i: number) => (
                              <span key={p._id || i} title={p.name} className={cn("ring-2 ring-card", i > 0 && "")}>
                                <Avatar name={p.name} size="sm" />
                              </span>
                            ))}
                            {people.length > 4 && (
                              <span className="h-8 w-8 rounded-full bg-[oklch(0.255_0.016_170)] border-2 border-card flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground">
                                +{people.length - 4}
                              </span>
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
        </Card>
      )}
    </div>
  );
}
