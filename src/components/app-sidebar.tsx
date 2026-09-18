import { useEffect, useState, type ComponentType } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, Inbox, User, Settings, MessageCircle,
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
  { label: "Mensagens", icon: MessageCircle, to: "/mensagens" },
];

const NETWORK_MENU: MenuItem[] = [
  { label: "Dashboard",         icon: Home,       to: "/dashboard" },
  { label: "Médicos",           icon: Users,      to: "/medicos" },
  { label: "Solicitações",      icon: Inbox,      to: "/solicitacoes" },
  { label: "Contratações",      icon: Briefcase,  to: "/contratacoes" },
  { label: "Relatórios",        icon: BarChart3,  to: "/relatorios" },
  { label: "Perfil da empresa", icon: Building2,  to: "/perfil-empresa" },
  { label: "Mensagens",         icon: MessageCircle, to: "/mensagens" },
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

  // Sidebar lateral foi removido para ambos os tipos de usuário (médico e rede).
  // Mantemos apenas a barra superior com perfil, notificações, configurações e sair.
  void userType;
  const hideSidebar = true;

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <div className="flex items-center gap-1">
          {userType === "doctor" ? (
            <Link to="/" aria-label="Página inicial">
              <Button variant="ghost" size="icon">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
          ) : hideSidebar ? (
            <div className="w-9" />
          ) : (
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 hover:bg-muted"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
        <Link to="/" className="flex items-center" aria-label="Connect-Med">
          <img src={logo} alt="Connect-Med" className="h-11 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-1">
          <HeaderProfile />
          {user && <NotificationsBell userId={user.id} />}
          {user && <MessagesButton />}
          {hideSidebar && <HeaderActions onSignOut={signOut} />}
        </div>
      </div>

      {/* Desktop fixed sidebar */}
      {!hideSidebar && (
        <aside
          className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card shadow-[2px_0_10px_-4px_rgba(0,0,0,0.08)] md:flex"
          style={{ background: "#F8FAFC" }}
        >
          {SidebarContent}
        </aside>
      )}

      {/* Mobile drawer */}
      {!hideSidebar && mobileOpen && (
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

function HeaderProfile() {
  const { user, profile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) { setAvatarUrl(null); return; }
    const table = profile.account_type === "doctor" ? "doctors" : "networks";
    supabase.from(table).select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      setAvatarUrl((data as { avatar_url?: string | null } | null)?.avatar_url ?? null);
    });
  }, [user, profile]);

  if (!user || !profile) return null;
  const to = profile.account_type === "doctor" ? "/perfil" : "/perfil-empresa";

  return (
    <Link to={to} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent" aria-label="Meu perfil">
      <Avatar className="h-8 w-8">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.full_name} />}
        <AvatarFallback className="bg-accent text-xs">
          {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : <UserCircle2 className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">{profile.full_name}</span>
    </Link>
  );
}

/* Layout wrapper: aplica margin-left para o conteúdo no desktop e mostra
   bell de notificações no topo desktop. */
function MessagesButton() {
  return (
    <Link to="/mensagens" aria-label="Mensagens">
      <Button variant="ghost" size="icon">
        <MessageCircle className="h-5 w-5" />
      </Button>
    </Link>
  );
}

function HeaderActions({ onSignOut }: { onSignOut: () => void }) {
  return (
    <>
      <Link to="/configuracoes" aria-label="Configurações">
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </Link>
      <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Sair">
        <LogOut className="h-5 w-5" />
      </Button>
    </>
  );
}

export function AppShell({ userType, children }: { userType: UserType; children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  void userType;
  const hideSidebar = true;
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <AppSidebar userType={userType} />
      <div className={hideSidebar ? "" : "md:ml-60"}>
        {/* Desktop top bar with home + profile + bell */}
        <div className="sticky top-0 z-20 hidden h-14 items-center justify-between gap-1 border-b bg-background/80 px-6 backdrop-blur-md md:flex">
          <div className="flex items-center">
            {userType === "doctor" && (
              <Link to="/" aria-label="Página inicial">
                <Button variant="ghost" size="icon">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1">
            {userType === "network" && <AcademyTeamButton />}
            <HeaderProfile />
            {user && <NotificationsBell userId={user.id} />}
            {user && <MessagesButton />}
            {hideSidebar && <HeaderActions onSignOut={signOut} />}
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
