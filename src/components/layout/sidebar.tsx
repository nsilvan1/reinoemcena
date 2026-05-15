"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  Bell,
  LogOut,
  Menu,
  Clapperboard,
  Images,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/useNotifications";
import { ROLE_HIERARCHY, ROLE_LABELS, type Role } from "@/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/escalas", label: "Escalas", icon: Calendar },
  { href: "/roteiros", label: "Roteiros", icon: FileText },
  { href: "/acervo", label: "Acervo", icon: Images },
  { href: "/membros", label: "Membros", icon: Users, minRole: "coordenador" },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
];

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { unreadCount } = useNotifications();
  const userRole = ((session?.user as { role?: string })?.role || "membro") as Role;
  const userLevel = ROLE_HIERARCHY[userRole] ?? 1;
  const userName = session?.user?.name || "Usuário";
  const firstName = userName.split(" ")[0];

  return (
    <div className="relative flex flex-col h-full bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* Decorative radial glow */}
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-sidebar-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-20 h-72 w-72 rounded-full bg-sidebar-primary/10 blur-3xl pointer-events-none" />

      {/* Brand */}
      <div className="relative px-4 pt-5 pb-4">
        <Link
          href="/"
          className="group flex items-center gap-3"
          onClick={onClose}
        >
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sidebar-primary/30 via-sidebar-primary/15 to-sidebar-primary/5 ring-1 ring-sidebar-primary/25 flex items-center justify-center group-hover:ring-sidebar-primary/45 transition-all shadow-lg shadow-sidebar-primary/10">
              <Clapperboard className="h-4 w-4 text-sidebar-primary" strokeWidth={2} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-sidebar status-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-[15px] font-semibold tracking-tight leading-none truncate">
              Reino em Cena
            </h1>
            <p className="text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/30 mt-1.5 font-mono">
              Produção
            </p>
          </div>
        </Link>
      </div>

      <div className="relative px-4 mb-2">
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-2.5 pt-1 overflow-y-auto">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/25 px-3 pb-1.5 pt-2">
          Menu
        </p>
        <div className="space-y-0.5">
          {navItems
            .filter(
              (item) =>
                !item.minRole ||
                userLevel >= (ROLE_HIERARCHY[item.minRole as Role] ?? 0)
            )
            .map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const isNotif = item.href === "/notificacoes";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl",
                    "text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-sidebar-primary/15 via-sidebar-primary/8 to-transparent text-sidebar-primary"
                      : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  {/* Active rail */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-1 h-6 rounded-r-full bg-sidebar-primary shadow-[0_0_12px_var(--sidebar-primary)]" />
                  )}
                  {/* Icon wrapper */}
                  <span
                    className={cn(
                      "relative flex items-center justify-center h-7 w-7 rounded-lg transition-all",
                      isActive
                        ? "bg-sidebar-primary/20 ring-1 ring-sidebar-primary/30"
                        : "bg-sidebar-accent/30 group-hover:bg-sidebar-accent/60"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[15px] w-[15px] transition-colors",
                        isActive
                          ? "text-sidebar-primary"
                          : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/80"
                      )}
                      strokeWidth={1.9}
                    />
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {isNotif && unreadCount > 0 && (
                    <span className="relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 bg-rose-500 text-white text-[10px] font-bold tabular-nums shadow-md shadow-rose-500/30">
                      <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
                      <span className="relative">{unreadCount}</span>
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      </nav>

      {/* User card */}
      <div className="relative px-3 pb-4 pt-3">
        <div className="px-2 mb-3">
          <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />
        </div>
        <div className="rounded-2xl bg-sidebar-accent/40 ring-1 ring-sidebar-border/30 p-2.5 backdrop-blur-sm">
          <Link
            href="/perfil"
            onClick={onClose}
            className="group flex items-center gap-2.5 rounded-lg p-1 hover:bg-sidebar-accent/60 transition-all"
          >
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sidebar-primary/35 to-sidebar-primary/10 ring-1 ring-sidebar-primary/25 flex items-center justify-center text-[12px] font-bold text-sidebar-primary group-hover:ring-sidebar-primary/45 transition-all">
                {userName[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar status-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate leading-tight">
                {firstName}
              </p>
              <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-[0.15em] mt-0.5 font-mono">
                {ROLE_LABELS[userRole]}
              </p>
            </div>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1.5 flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/35 hover:text-rose-300 hover:bg-rose-500/[0.08] transition-all"
          >
            <LogOut className="h-3 w-3" strokeWidth={2.2} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 border-r border-sidebar-border/30">
        <NavContent />
      </aside>

      {/* Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 bg-sidebar/95 backdrop-blur-xl border-b border-sidebar-border/30 flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-xl h-9 w-9 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-72 border-0 bg-sidebar"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <NavContent onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 ml-3">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sidebar-primary/30 to-sidebar-primary/10 ring-1 ring-sidebar-primary/25 flex items-center justify-center">
            <Clapperboard className="h-3.5 w-3.5 text-sidebar-primary" strokeWidth={2} />
          </div>
          <span className="font-heading text-sm font-semibold tracking-tight text-sidebar-foreground">
            Reino em Cena
          </span>
        </div>
      </header>
    </>
  );
}
