import { Link, useLocation } from "@tanstack/react-router";
import { LogOut, MessageCircle, UserCircle2 } from "lucide-react";
import logoMedHorizontal from "@/assets/connect-med-horizontal-logo.png.asset.json";
import logoAcademyHorizontal from "@/assets/connect-academy-horizontal-logo.png.asset.json";
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

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-1 rounded-2xl border bg-slate-100/80 px-2 py-1.5 shadow-sm">
          <Link
            to="/"
            className="flex h-12 w-40 items-center justify-center rounded-lg px-2 transition-colors hover:bg-accent/40"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-accent/40" }}
            aria-label="Connect-Med"
          >
            <img
              src={logoMedHorizontal.url}
              alt="Connect-Med"
              className="max-h-full max-w-full object-contain"
            />
          </Link>
          <div className="h-8 w-px bg-border/60" aria-hidden="true" />
          <Link
            to="/academy"
            className="flex h-12 w-40 items-center justify-center rounded-lg px-2 transition-colors hover:bg-accent/40"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-accent/40" }}
            aria-label="Connect-Academy"
          >
            <img
              src={logoAcademyHorizontal.url}
              alt="Connect-Academy"
              className="max-h-full max-w-full object-contain"
            />
          </Link>
        </div>
        <nav className="flex items-center gap-2">
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
        </nav>
      </div>
    </header>
  );
}
