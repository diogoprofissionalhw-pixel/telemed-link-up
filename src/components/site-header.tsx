import { Link, useLocation } from "@tanstack/react-router";
import { LogOut, MessageCircle, UserCircle2 } from "lucide-react";
import logoMedHorizontal from "@/assets/connect-med-horizontal-logo-v3.png.asset.json";
import logoAcademyHorizontal from "@/assets/connect-academy-horizontal-logo-v3.png.asset.json";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "@/components/notifications-bell";

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const location = useLocation();
  const onAuthPage = location.pathname.startsWith("/auth");

  useEffect(() => {
    if (!user || !profile) { setAvatarUrl(null); return; }
    const table = profile.account_type === "doctor" ? "doctors" : "networks";
    supabase.from(table).select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      setAvatarUrl((data as any)?.avatar_url ?? null);
    });
  }, [user, profile]);

  const isActive = (path: string) => location.pathname === path;
  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${isActive(path) ? "text-primary" : "text-muted-foreground"}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/explorar-medicos" className={linkClass("/explorar-medicos")}>Médicos</Link>
            <Link to="/explorar-redes" className={linkClass("/explorar-redes")}>Empresas</Link>
            <Link to="/academy" className={linkClass("/academy")}>Academy</Link>
            <Link to="/valores" className={linkClass("/valores")}>Valores</Link>
            <a
              href="https://bot-atendimento.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Central de ajuda
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user && <NotificationsBell userId={user.id} />}
              <Link to="/mensagens" aria-label="Mensagens">
                <Button variant="ghost" size="icon">
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Painel</Button>
              </Link>
              <Link to="/profile" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
                <Avatar className="h-8 w-8">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.full_name ?? ""} />}
                  <AvatarFallback className="bg-accent text-xs">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <UserCircle2 className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">{profile?.full_name}</span>
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </>
          ) : onAuthPage ? null : (
            <>
              <Link to="/auth" search={{ mode: "signin" }}><Button variant="ghost" size="sm">Entrar</Button></Link>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="sm">Cadastrar</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
