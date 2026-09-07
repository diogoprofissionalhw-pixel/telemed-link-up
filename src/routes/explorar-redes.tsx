import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Lock,
  MapPin,
  SearchX,
} from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlansDialog } from "@/components/plans-dialog";
import { useAuth } from "@/lib/auth-context";
import { listPublicNetworkCards } from "@/lib/public-discovery.functions";

type PublicNetwork = {
  id: string;
  network_name: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
};

const searchSchema = z.object({
  page: fallback(z.coerce.number().int().min(1), 1).default(1),
  limit: fallback(z.coerce.number().int().min(1).max(100), 12).default(12),
});

type SearchParams = z.infer<typeof searchSchema>;
type LoaderData = {
  items: PublicNetwork[];
  total: number;
  page: number;
  limit: number;
};

export const Route = createFileRoute("/explorar-redes")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  loader: async ({ deps: { page, limit } }) => {
    const res = await listPublicNetworkCards({ data: { page, limit } });
    if (res.error) throw new Error(res.error);
    return {
      items: res.items as PublicNetwork[],
      total: res.total,
      page,
      limit,
    };
  },
  head: () => ({
    meta: [
      { title: "Conheça nossas empresas — Connect-Med" },
      {
        name: "description",
        content:
          "Explore as empresas parceiras da Connect-Med. Cadastre-se para ver os detalhes completos.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 text-center">
        <p className="text-destructive">
          Erro ao carregar empresas: {error.message}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </main>
    </div>
  ),
  component: ExplorarRedesPage,
});

function ExplorarRedesPage() {
  const { user } = useAuth();
  const navigate = useNavigate({ from: "/explorar-redes" });
  const { items: networks, total, page: currentPage, limit: currentLimit } =
    Route.useLoaderData() as LoaderData;
  const [plansOpen, setPlansOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / currentLimit));

  const handlePageChange = (newPage: number) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, page: newPage }) });
  };

  const handleLimitChange = (value: string) => {
    navigate({
      search: (prev: SearchParams) => ({ ...prev, page: 1, limit: Number(value) }),
    });
  };

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
              Conheça nossas <span className="text-primary">empresas</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Por privacidade, exibimos publicamente apenas nome e localização.
              Cadastre-se para ver os detalhes completos.
            </p>
          </div>
          <BackButton to="/" label="Voltar ao início" />
        </div>

        {/* Controles de paginação */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {networks.length} de {total} empresas
          </p>
          <div className="flex items-center gap-3">
            <Select value={String(currentLimit)} onValueChange={handleLimitChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Itens por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 por página</SelectItem>
                <SelectItem value="24">24 por página</SelectItem>
                <SelectItem value="48">48 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {networks.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <SearchX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Nenhuma empresa encontrada</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ainda não há empresas cadastradas. Cadastre a sua para ampliar a rede.
            </p>
            <div className="mt-6">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button className="gap-2">
                  Cadastrar minha empresa <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {networks.map((n) => {
                const local = [n.city, n.state].filter(Boolean).join(", ");
                return (
                  <article
                    key={n.id}
                    className="flex h-full flex-col rounded-2xl border bg-card p-5"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-accent">
                        {n.avatar_url ? (
                          <img
                            src={n.avatar_url}
                            alt={`Logo ${n.network_name ?? "empresa"}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="flex items-center gap-1 text-sm font-semibold">
                          <span className="truncate">{n.network_name ?? "Empresa"}</span>
                          {n.is_verified && (
                            <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {local || "Localização não informada"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 rounded-lg border border-dashed bg-muted/40 p-3 text-xs">
                      <p className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        <Lock className="h-3 w-3" /> Informações confidenciais
                      </p>
                      <p className="select-none blur-sm">
                        CNPJ ••.•••.•••/••••-•• · Atividade
                      </p>
                      <p className="select-none blur-sm">
                        Site · LinkedIn · Descrição completa
                      </p>
                    </div>

                    <div className="mt-auto pt-4">
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleSeeMore(n.id)}
                      >
                        Ver mais <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Paginação */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="gap-1"
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </main>

      <PlansDialog
        open={plansOpen}
        onOpenChange={setPlansOpen}
        title="Para ver os detalhes da empresa"
        description="Escolha um plano e crie sua conta para acessar CNPJ, contato e descrição completa."
      />
    </div>
  );
}
