"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Calendar, FileText, Users, Bell, LogOut,
  Menu, Clapperboard, ChevronRight, Images,
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
  const userRole = ((session?.user as any)?.role || "membro") as Role;
  const userLevel = ROLE_HIERARCHY[userRole] ?? 1;
  const userName = session?.user?.name || "Usuário";

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="group flex items-center gap-3" onClick={onClose}>
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sidebar-primary/30 to-sidebar-primary/10 border border-sidebar-primary/25 flex items-center justify-center group-hover:border-sidebar-primary/40 transition-all">
              <Clapperboard className="h-5 w-5 text-sidebar-primary drop-shadow-sm" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-sidebar" />
          </div>
          <div>
            <h1 className="font-heading text-base font-medium tracking-tight leading-none">
              Reino em Cena
            </h1>
            <p className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/30 mt-1">
              Produção de Vídeos
            </p>
          </div>
        </Link>
      </div>

      {/* Divider with gradient */}
      <div className="px-5 mb-2">
        <div className="h-px bg-gradient-to-r from-sidebar-border/60 via-sidebar-border/30 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2 pb-3 overflow-y-auto">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/20 px-3 pb-2">
          Menu
        </p>
        <div className="space-y-0.5">
          {navItems
            .filter((item) => !item.minRole || userLevel >= (ROLE_HIERARCHY[item.minRole as Role] ?? 0))
            .map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const isNotif = item.href === "/notificacoes";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg",
                    "text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm shadow-sidebar-primary/5"
                      : "text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-sidebar-primary shadow-sm shadow-sidebar-primary/50" />
                  )}
                  <item.icon className={cn(
                    "h-[18px] w-[18px] transition-colors",
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/30"
                  )} />
                  <span className="flex-1">{item.label}</span>
                  {isNotif && unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold shadow-sm shadow-sidebar-primary/30">
                      {unreadCount}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="h-3 w-3 text-sidebar-primary/50" />
                  )}
                </Link>
              );
            })}
        </div>
      </nav>

      {/* User */}
      <div className="mt-auto px-3 pb-4">
        <div className="px-2 mb-3">
          <div className="h-px bg-gradient-to-r from-sidebar-border/50 via-sidebar-border/20 to-transparent" />
        </div>
        <Link
          href="/perfil"
          onClick={onClose}
          className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/60 transition-all"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sidebar-primary/25 to-sidebar-primary/10 border border-sidebar-primary/20 flex items-center justify-center text-[11px] font-bold text-sidebar-primary group-hover:border-sidebar-primary/40 transition-all">
            {userName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{userName}</p>
            <p className="text-[10px] text-sidebar-foreground/25">{ROLE_LABELS[userRole]}</p>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-medium text-sidebar-foreground/20 hover:text-sidebar-foreground/50 hover:bg-sidebar-accent/30 transition-all mt-0.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 border-r border-sidebar-border/25">
        <NavContent />
      </aside>

      {/* Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 bg-sidebar border-b border-sidebar-border/25 flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-lg h-9 w-9 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-0 bg-sidebar" showCloseButton={false}>
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <NavContent onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 ml-3">
          <Clapperboard className="h-4 w-4 text-sidebar-primary" />
          <span className="font-heading text-sm font-medium tracking-tight text-sidebar-foreground">
            Reino em Cena
          </span>
        </div>
      </header>
    </>
  );
}
