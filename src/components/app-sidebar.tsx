import { useEffect, useState, type ComponentType } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, Inbox, User, Settings,
  Users, Briefcase, BarChart3, Building2, Menu, X, LogOut, UserCircle2,
} from "lucide-react";
import logo from "@/assets/connect-med-logo.webp";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "@/components/notifications-bell";
import { cn } from "@/lib/utils";

export type UserType = "doctor" | "network";

interface MenuItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
  hash?: string;
}

const DOCTOR_MENU: MenuItem[] = [
  { label: "Dashboard", icon: Home, to: "/dashboard" },
  { label: "Perfil",    icon: User, to: "/perfil" },
];

const NETWORK_MENU: MenuItem[] = [
  { label: "Dashboard",         icon: Home,       to: "/dashboard" },
  { label: "Médicos",           icon: Users,      to: "/medicos" },
  { label: "Solicitações",      icon: Inbox,      to: "/solicitacoes" },
  { label: "Contratações",      icon: Briefcase,  to: "/contratacoes" },
  { label: "Relatórios",        icon: BarChart3,  to: "/relatorios" },
  { label: "Perfil da empresa", icon: Building2,  to: "/perfil-empresa" },
];

interface SidebarItemProps {
  item: MenuItem;
  active: boolean;
  onNavigate?: () => void;
}

function SidebarItem({ item, active, onNavigate }: SidebarItemProps) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      hash={item.hash}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        "border-l-[3px]",
        active
          ? "bg-primary/10 border-primary text-primary"
          : "border-transparent text-foreground/70 hover:bg-muted hover:text-foreground hover:border-primary/30",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function SidebarDoctorMenu({ activeKey, onNavigate }: { activeKey: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {DOCTOR_MENU.map((item) => (
        <SidebarItem key={item.label} item={item} active={activeKey === item.to} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function SidebarNetworkMenu({ activeKey, onNavigate }: { activeKey: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NETWORK_MENU.map((item) => (
        <SidebarItem key={item.label} item={item} active={activeKey === item.to} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function AppSidebar({ userType }: { userType: UserType }) {
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useRouterState({ select: (s) => s.location });
  const activeKey = pathname;

  const close = () => setMobileOpen(false);

  const SidebarContent = (
    <>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <Link to="/" onClick={close} className="flex min-w-0 flex-1 items-center" aria-label="Connect-Med">
          <img src={logo} alt="Connect-Med" className="h-14 w-auto max-w-full object-contain" />
        </Link>
        <button
          className="rounded-md p-1 text-muted-foreground hover:bg-muted md:hidden"
          onClick={close}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {userType === "doctor"
          ? <SidebarDoctorMenu activeKey={activeKey} onNavigate={close} />
          : <SidebarNetworkMenu activeKey={activeKey} onNavigate={close} />}
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="truncate px-2 text-xs text-muted-foreground">
          {profile?.full_name}
        </div>
        <Link to="/configuracoes" onClick={close}>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" /> Configurações
          </Button>
        </Link>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center" aria-label="Connect-Med">
          <img src={logo} alt="Connect-Med" className="h-11 w-auto object-contain" />
        </Link>
        <div>{user && <NotificationsBell userId={user.id} />}</div>
      </div>

      {/* Desktop fixed sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card shadow-[2px_0_10px_-4px_rgba(0,0,0,0.08)] md:flex"
        style={{ background: "#F8FAFC" }}
      >
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 animate-fade-in"
            onClick={close}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl animate-slide-in-right"
            style={{ animationDuration: "0.2s", background: "#F8FAFC" }}
          >
            {SidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

/* Layout wrapper: aplica margin-left para o conteúdo no desktop e mostra
   bell de notificações no topo desktop. */
export function AppShell({ userType, children }: { userType: UserType; children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <AppSidebar userType={userType} />
      <div className="md:ml-60">
        {/* Desktop top bar with bell */}
        <div className="sticky top-0 z-20 hidden h-14 items-center justify-end border-b bg-background/80 px-6 backdrop-blur-md md:flex">
          {user && <NotificationsBell userId={user.id} />}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
