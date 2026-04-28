import { Link } from "@tanstack/react-router";
import { Stethoscope, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function SiteHeader() {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--gradient-hero)" }}>
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </span>
          <span>Connect<span className="text-primary">-Med</span></span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Painel</Button>
              </Link>
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {profile?.full_name}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
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
