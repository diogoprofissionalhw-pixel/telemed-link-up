import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Building2, Lock, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlansDialog } from "@/components/plans-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type PublicNetwork = {
  id: string;
  network_name: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  cnpj_activity: string | null;
};

export const Route = createFileRoute("/explorar-redes")({
  head: () => ({
    meta: [
      { title: "Conheça nossas redes — Connect-Med" },
      {
        name: "description",
        content:
          "Explore redes de telemedicina parceiras da Connect-Med. Filtre por localização e veja detalhes ao se cadastrar.",
      },
    ],
  }),
  component: ExplorarRedesPage,
});

function ExplorarRedesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [networks, setNetworks] = useState<PublicNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("networks_public")
      .select("id, network_name, city, state, avatar_url, is_verified, cnpj_activity")
      .order("is_verified", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(120)
      .then(({ data }) => {
        setNetworks((data as PublicNetwork[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  const states = useMemo(() => {
    const set = new Set<string>();
    networks.forEach((n) => n.state && set.add(n.state));
    return Array.from(set).sort();
  }, [networks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return networks.filter((n) => {
      if (q && !(n.network_name ?? "").toLowerCase().includes(q)) return false;
      if (state !== "all" && n.state !== state) return false;
      if (verified === "yes" && !n.is_verified) return false;
      if (verified === "no" && n.is_verified) return false;
      return true;
    });
  }, [networks, query, state, verified]);

  const handleSeeMore = (id: string) => {
    if (user) navigate({ to: "/rede/$networkId", params: { networkId: id } });
    else setPlansOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Conheça nossas <span className="text-primary">redes</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use os filtros para encontrar redes de telemedicina. Para ver detalhes completos, é necessário ter conta.
            </p>
          </div>
          <BackButton to="/" label="Voltar ao início" />
        </div>

        <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="relative sm:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome da rede"
              className="pl-9"
            />
          </div>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {states.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={verified} onValueChange={(v) => setVerified(v as "all" | "yes" | "no")}>
            <SelectTrigger>
              <SelectValue placeholder="Verificação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as redes</SelectItem>
              <SelectItem value="yes">Somente verificadas</SelectItem>
              <SelectItem value="no">Verificação pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Carregando redes…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma rede encontrada com esses filtros.</p>
            <div className="mt-4">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button className="gap-2">Cadastrar minha rede <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n) => {
              const local = [n.city, n.state].filter(Boolean).join(", ");
              return (
                <article
                  key={n.id}
                  className="flex overflow-hidden rounded-2xl border bg-card"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {/* Logo area — sempre visível */}
                  <div className="flex w-32 shrink-0 flex-col items-center justify-center gap-2 border-r bg-muted/40 p-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-foreground">
                      {n.avatar_url ? (
                        <img src={n.avatar_url} alt={`Logo ${n.network_name ?? "rede"}`} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-8 w-8 text-primary-foreground" />
                      )}
                    </div>
                    <p className="text-center text-[10px] font-medium text-muted-foreground">
                      Logo da empresa
                    </p>
                  </div>

                  {/* Info area */}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="flex items-center gap-1 text-sm font-semibold">
                      {n.network_name ?? "Rede"}
                      {n.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                    </h3>
                    {local && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {local}
                      </div>
                    )}
                    {n.cnpj_activity && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-[10px]">{n.cnpj_activity}</Badge>
                      </div>
                    )}

                    {user ? (
                      <div className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                        <p>Acesse o perfil completo para ver CNPJ, contato e descrição.</p>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-1 items-center gap-2 rounded-lg border border-dashed bg-muted/40 p-3 text-xs">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <p className="font-medium text-muted-foreground">Necessário se cadastrar</p>
                      </div>
                    )}

                    <Button className="mt-3 w-full gap-2" size="sm" onClick={() => handleSeeMore(n.id)}>
                      Ver mais <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <PlansDialog
        open={plansOpen}
        onOpenChange={setPlansOpen}
        title="Para ver os detalhes da rede"
        description="Escolha um plano e crie sua conta para acessar CNPJ, contato e descrição completa."
      />
    </div>
  );
}
