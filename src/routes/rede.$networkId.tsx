import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, MapPin, BadgeCheck, Linkedin, Globe, Briefcase, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type PublicNetwork = {
  id: string;
  network_name: string;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  cnpj_activity: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  description: string | null;
};

export const Route = createFileRoute("/rede/$networkId")({
  head: () => ({
    meta: [
      { title: "Rede parceira — Connect-Med" },
      { name: "description", content: "Informações públicas da rede parceira na Connect-Med." },
    ],
  }),
  component: NetworkDetailPage,
});

function isSafeExternalUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function NetworkDetailPage() {
  const { networkId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [network, setNetwork] = useState<PublicNetwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    supabase
      .from("networks_public")
      .select("id, network_name, city, state, avatar_url, is_verified, cnpj_activity, linkedin_url, website_url, description")
      .eq("id", networkId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) setNotFound(true);
        else setNetwork(data as PublicNetwork);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [networkId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="grid place-items-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (notFound || !network) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Rede não encontrada</h1>
          <p className="mt-2 text-muted-foreground">A rede que você tentou acessar não existe ou foi removida.</p>
          <div className="mt-6">
            <Link to="/"><Button>Voltar ao início</Button></Link>
          </div>
        </main>
      </div>
    );
  }

  const location = [network.city, network.state].filter(Boolean).join(", ");
  const linkedinValid = isSafeExternalUrl(network.linkedin_url);
  const websiteValid = isSafeExternalUrl(network.website_url);
  const backTo = user ? "/dashboard" : "/";
  const backLabel = user ? "Voltar ao dashboard" : "Voltar ao início";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Perfil da Rede</h1>
          <BackButton to={backTo} label={backLabel} />
        </div>

        <section className="rounded-2xl border bg-card p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-accent bg-foreground">
              {network.avatar_url ? (
                <img src={network.avatar_url} alt={`Logo ${network.network_name}`} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-2xl font-bold">{network.network_name}</h2>
                {network.is_verified ? (
                  <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <BadgeCheck className="h-3.5 w-3.5" /> Rede Verificada
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    Verificação pendente
                  </Badge>
                )}
              </div>
              {location && (
                <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                  <MapPin className="h-4 w-4" /> {location}
                </div>
              )}
              {network.cnpj_activity && (
                <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                  <Briefcase className="h-4 w-4" /> {network.cnpj_activity}
                </div>
              )}
            </div>
          </div>

          {network.description && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground">Sobre a rede</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{network.description}</p>
            </div>
          )}

          {(linkedinValid || websiteValid) && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground">Presença online</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {linkedinValid && (
                  <a href={network.linkedin_url!} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2">
                      <Linkedin className="h-4 w-4" /> Ver no LinkedIn
                    </Button>
                  </a>
                )}
                {websiteValid && (
                  <a href={network.website_url!} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2">
                      <Globe className="h-4 w-4" /> Site institucional
                    </Button>
                  </a>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Links externos abrem em uma nova aba. Verifique a autenticidade no destino.
              </p>
            </div>
          )}

          {!user && (
            <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-medium">Quer entrar em contato com esta rede?</p>
              <p className="mt-1 text-muted-foreground">
                Cadastre-se gratuitamente como médico para conversar diretamente com as redes parceiras.
              </p>
              <div className="mt-3">
                <Button size="sm" onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}>
                  Cadastrar como médico
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
