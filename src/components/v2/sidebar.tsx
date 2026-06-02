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
  Search,
  HelpCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/useNotifications";
import { ROLE_HIERARCHY, ROLE_LABELS, type Role } from "@/types";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, Kbd } from "./primitives";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, shortcut: "G D", tour: "dashboard" },
  { href: "/escalas", label: "Escalas", icon: Calendar, shortcut: "G E", tour: "escalas" },
  { href: "/roteiros", label: "Roteiros", icon: FileText, shortcut: "G R", tour: "roteiros" },
  { href: "/acervo", label: "Acervo", icon: Images, shortcut: "G A", tour: "acervo" },
  { href: "/membros", label: "Membros", icon: Users, minRole: "coordenador", shortcut: "G M", tour: "membros" },
  { href: "/notificacoes", label: "Notificações", icon: Bell, shortcut: "G N", tour: "notificacoes" },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle, shortcut: "G ?", tour: "ajuda" },
];

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { unreadCount } = useNotifications();
  const userRole = ((session?.user as { role?: string })?.role || "membro") as Role;
  const userLevel = ROLE_HIERARCHY[userRole] ?? 1;
  const userName = session?.user?.name || "Usuário";

  return (
    <div
      className="relative flex flex-col h-full text-sidebar-foreground border-r border-sidebar-border"
      style={{
        backgroundImage:
          "linear-gradient(180deg, oklch(0.165 0.020 168) 0%, oklch(0.135 0.016 168) 55%, oklch(0.115 0.014 168) 100%)",
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-4 pb-3">
        <Link href="/" onClick={onClose} className="inline-flex items-center gap-2.5 group">
          <span className="relative h-8 w-8 rounded-lg bg-[oklch(0.18_0.020_158)] border border-[oklch(0.28_0.040_158)] flex items-center justify-center">
            <Clapperboard className="h-4 w-4 text-[oklch(0.78_0.16_158)]" strokeWidth={2} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-sidebar status-pulse" />
          </span>
          <span>
            <span className="block text-[13px] font-semibold text-sidebar-foreground leading-none tracking-tight">
              Reino em Cena
            </span>
            <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-sidebar-foreground/40 mt-1 block">
              v1.0
            </span>
          </span>
        </Link>
      </div>

      {/* Quick search (fake — pode virar ⌘K depois) */}
      <div className="px-3 mb-2">
        <button
          type="button"
          className="w-full h-8 rounded-lg bg-[oklch(0.165_0.014_172)] border border-sidebar-border flex items-center px-2.5 gap-2 text-[11px] text-sidebar-foreground/45 hover:text-sidebar-foreground/70 hover:border-[oklch(0.295_0.016_170)] transition-colors"
        >
          <Search className="h-3 w-3" />
          <span className="flex-1 text-left">Buscar</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-sidebar-foreground/30 px-2.5 py-2">
          Navegação
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
                  data-tour={`nav-${item.tour}`}
                  className={cn(
                    "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg",
                    "text-[13px] transition-all duration-150",
                    isActive
                      ? "bg-[oklch(0.16_0.012_158)] text-[oklch(0.92_0.05_158)]"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 w-0.5 h-5 rounded-full bg-[oklch(0.74_0.16_158)] shadow-[0_0_8px_oklch(0.74_0.16_158)]" />
                  )}
                  <item.icon
                    className={cn(
                      "h-[15px] w-[15px] shrink-0",
                      isActive ? "text-[oklch(0.78_0.16_158)]" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                    )}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {isNotif && unreadCount > 0 && (
                    <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-[oklch(0.30_0.20_25)] text-white font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      </nav>

      {/* User */}
      <div className="px-2 pb-3 pt-2 border-t border-sidebar-border">
        <Link
          href="/perfil"
          onClick={onClose}
          data-tour="perfil"
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors group"
        >
          <Avatar name={userName} size="sm" status="online" />
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] font-semibold text-sidebar-foreground leading-tight truncate">
              {userName.split(" ")[0]}
            </span>
            <span className="block text-[9px] font-mono uppercase tracking-[0.18em] text-sidebar-foreground/40 mt-0.5">
              {ROLE_LABELS[userRole]}
            </span>
          </span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-1 flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-[0.18em] text-sidebar-foreground/30 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Sair
        </button>
      </div>
    </div>
  );
}

export function SidebarV2() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 z-30 bg-sidebar/85 backdrop-blur-xl border-b border-sidebar-border flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-lg h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-60 border-0 bg-sidebar" showCloseButton={false}>
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <NavContent onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 ml-3">
          <Clapperboard className="h-4 w-4 text-[oklch(0.78_0.16_158)]" strokeWidth={2} />
          <span className="text-[13px] font-semibold tracking-tight">Reino em Cena</span>
        </div>
      </header>
    </>
  );
}
