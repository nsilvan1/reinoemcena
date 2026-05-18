"use client";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Upload, Type, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button, Card, Badge, Avatar, PageHeader, EmptyState, Stat } from "@/components/v2/primitives";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────

interface Person {
  _id: string;
  name: string;
}

interface Roteiro {
  _id: string;
  title: string;
  fileUrl?: string;
  content?: string;
  weekNumber?: number;
  createdBy?: { name?: string };
  createdAt: string;
  assignedNarrators?: Person[];
  assignedEditors?: Person[];
}

type FilterKey = "todos" | "com-texto" | "com-arquivo" | "sem-conteudo";

interface FilterOption {
  key: FilterKey;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { key: "todos",        label: "Todos"         },
  { key: "com-texto",    label: "Com texto"     },
  { key: "com-arquivo",  label: "Com arquivo"   },
  { key: "sem-conteudo", label: "Sem conteúdo"  },
];

// ─── Avatar cluster (max 3 + overflow) ──────────────────────────────

function AvatarCluster({ people }: { people: Person[] }) {
  if (people.length === 0) {
    return <span className="text-[11px] text-muted-foreground/30 select-none">—</span>;
  }

  const visible  = people.slice(0, 3);
  const overflow = people.length - 3;
  const allNames = people.map((p) => p.name).join(", ");

  return (
    <span className="inline-flex items-center -space-x-1.5" title={allNames}>
      {visible.map((p, i) => (
        <span key={p._id || i} className="ring-[1.5px] ring-card rounded-full">
          <Avatar name={p.name} size="xs" />
        </span>
      ))}
      {overflow > 0 && (
        <span className="h-6 w-6 rounded-full bg-[oklch(0.255_0.016_170)] ring-[1.5px] ring-card flex items-center justify-center text-[9px] font-mono font-bold text-muted-foreground/75 select-none">
          +{overflow}
        </span>
      )}
    </span>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function RoteirosPage() {
  const { data: session } = useSession();
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<FilterKey>("todos");
  const router = useRouter();
  const role      = (session?.user as { role?: string })?.role;
  const canCreate = ["admin", "coordenador", "roteirista"].includes(role ?? "");

  useEffect(() => {
    fetch("/api/roteiros")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRoteiros)
      .catch(() => toast.error("Erro ao carregar roteiros"))
      .finally(() => setLoading(false));
  }, []);

  const withFile = roteiros.filter((r) => r.fileUrl).length;
  const withText = roteiros.filter((r) => r.content).length;

  const filtered = useMemo(() => {
    switch (filter) {
      case "com-texto":    return roteiros.filter((r) => r.content);
      case "com-arquivo":  return roteiros.filter((r) => r.fileUrl);
      case "sem-conteudo": return roteiros.filter((r) => !r.content && !r.fileUrl);
      default:             return roteiros;
    }
  }, [roteiros, filter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 w-64 skeleton" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
        <div className="h-8 w-full skeleton rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 skeleton rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentos"
        title="Roteiros"
        description="Roteiros e materiais escritos de cada semana."
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
      />

      {/* ── Stat strip ── */}
      {roteiros.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Stat
            icon={FileText}
            label="Total"
            value={roteiros.length}
            accent="primary"
            animated
            className="animate-in-view stagger-1"
          />
          <Stat
            icon={Type}
            label="Com texto"
            value={withText}
            accent="info"
            animated
            className="animate-in-view stagger-2"
          />
          <Stat
            icon={Paperclip}
            label="Com arquivo"
            value={withFile}
            accent="violet"
            animated
            className="animate-in-view stagger-3"
          />
        </div>
      )}

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
        <>
          {/* ── Filter chips ── */}
          <div className="flex items-center gap-1.5 flex-wrap animate-in-view stagger-4">
            {FILTER_OPTIONS.map((opt) => {
              const count =
                opt.key === "todos"
                  ? roteiros.length
                  : opt.key === "com-texto"
                  ? withText
                  : opt.key === "com-arquivo"
                  ? withFile
                  : roteiros.filter((r) => !r.content && !r.fileUrl).length;

              const active = filter === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium",
                    "border transition-all duration-150 min-h-[36px]",
                    active
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "border-border/60 text-muted-foreground bg-[oklch(0.215_0.014_172)] hover:text-foreground hover:border-border hover:bg-[oklch(0.235_0.015_172)]"
                  )}
                >
                  {opt.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] tabular-nums px-1 py-0.5 rounded min-w-[18px] text-center",
                        active
                          ? "bg-primary/15 text-primary"
                          : "bg-[oklch(0.255_0.016_172)] text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Table ── */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum roteiro neste filtro"
              description="Tente outro filtro para ver mais roteiros."
            />
          ) : (
            <Card elevated className="overflow-hidden animate-in-view stagger-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border/40 bg-[oklch(0.205_0.014_172)]">
                      <th className="pl-4 pr-2 py-2.5 w-8" aria-hidden />
                      <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45">
                        Título
                      </th>
                      <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45 hidden sm:table-cell">
                        Autor
                      </th>
                      <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45 hidden md:table-cell">
                        Data
                      </th>
                      <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45">
                        Tipo
                      </th>
                      <th className="px-3 pr-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/45 text-right">
                        Equipe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const people: Person[] = [
                        ...(r.assignedNarrators ?? []),
                        ...(r.assignedEditors ?? []),
                      ];

                      return (
                        <tr
                          key={r._id}
                          onClick={() => router.push(`/roteiros/${r._id}`)}
                          className="border-t border-border/40 hover:bg-[oklch(0.225_0.018_172)] transition-colors group cursor-pointer"
                        >
                          {/* Type icon */}
                          <td className="pl-4 pr-2 py-3.5 align-middle">
                            <span className="h-7 w-7 rounded-md bg-[oklch(0.20_0.016_158)] ring-1 ring-[oklch(0.30_0.030_158)/0.35] flex items-center justify-center">
                              {r.fileUrl ? (
                                <Upload className="h-3.5 w-3.5 text-[oklch(0.78_0.13_158)]" strokeWidth={1.8} />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-[oklch(0.78_0.13_158)]" strokeWidth={1.8} />
                              )}
                            </span>
                          </td>

                          {/* Title + week number */}
                          <td className="px-3 py-3.5 align-middle">
                            <p className="font-medium text-[13px] leading-tight group-hover:text-[oklch(0.90_0.06_158)] transition-colors truncate max-w-[200px] sm:max-w-[280px]">
                              {r.title}
                            </p>
                            {r.weekNumber != null && (
                              <p className="text-[10px] font-mono text-muted-foreground/45 mt-0.5 tracking-[0.06em]">
                                Semana {r.weekNumber}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground/40 font-mono mt-0.5 sm:hidden">
                              {r.createdBy?.name}
                              {r.createdBy?.name ? " · " : ""}
                              {format(new Date(r.createdAt), "dd/MM/yy", { locale: ptBR })}
                            </p>
                          </td>

                          {/* Author */}
                          <td className="px-3 py-3.5 align-middle hidden sm:table-cell">
                            <span className="text-[12.5px] text-muted-foreground/75 font-sans">
                              {r.createdBy?.name ?? "—"}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-3 py-3.5 align-middle hidden md:table-cell">
                            <span className="text-[12px] text-muted-foreground/60 tabular-nums font-mono">
                              {format(new Date(r.createdAt), "dd MMM yyyy", { locale: ptBR })}
                            </span>
                          </td>

                          {/* Type badges */}
                          <td className="px-3 py-3.5 align-middle">
                            <div className={cn("flex items-center gap-1", !r.fileUrl && !r.content && "opacity-0")}>
                              {r.fileUrl && <Badge tone="violet">Arquivo</Badge>}
                              {r.content && <Badge tone="info">Texto</Badge>}
                            </div>
                          </td>

                          {/* Team avatars */}
                          <td className="px-3 pr-5 py-3.5 align-middle text-right">
                            <AvatarCluster people={people} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
