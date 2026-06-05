import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, ChevronsUpDown, Lock, Stethoscope, X } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlansDialog } from "@/components/plans-dialog";
import { useAuth } from "@/lib/auth-context";
import { listPublicDoctors } from "@/lib/public-discovery.functions";
import { SPECIALTIES, AREAS_OF_ACTUATION } from "@/lib/specialties";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type PublicDoctor = {
  id: string;
  specialty: string | null;
  specialties: string[];
};

const searchSchema = z.object({
  page: fallback(z.coerce.number().int().min(1), 1).default(1),
  limit: fallback(z.coerce.number().int().min(1).max(100), 12).default(12),
  specialty: fallback(z.coerce.string().trim().max(120), "").default(""),
  activity: fallback(z.coerce.string().trim().max(120), "").default(""),
});

type SearchParams = z.infer<typeof searchSchema>;
type LoaderData = {
  items: PublicDoctor[];
  total: number;
  page: number;
  limit: number;
};

export const Route = createFileRoute("/explorar-medicos")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search: { page, limit, specialty, activity } }) => ({ page, limit, specialty, activity }),
  loader: async ({ deps: { page, limit, specialty, activity } }) => {
    const res = await listPublicDoctors({ data: { page, limit, specialty: specialty || undefined, activity: activity || undefined } });
    if (res.error) throw new Error(res.error);
    return {
      items: res.items as PublicDoctor[],
      total: res.total,
      page,
      limit,
    };
  },
  head: () => ({
    meta: [
      { title: "Conheça nossos médicos — Connect-Med" },
      {
        name: "description",
        content:
          "Explore especialidades disponíveis na Connect-Med. Cadastre-se para ver o perfil completo do médico.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 text-center">
        <p className="text-destructive">
          Erro ao carregar médicos: {error.message}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
          <Link to="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 text-center">
        <p className="text-muted-foreground">Nenhum médico encontrado.</p>
        <div className="mt-4">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button className="gap-2">
              Cadastrar como médico <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  ),
  component: ExplorarMedicosPage,
});

function FilterCombobox({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between sm:w-[280px]"
        >
          {value || label}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 sm:w-[280px]">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option === value ? "" : option);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ExplorarMedicosPage() {
  const { user } = useAuth();
  const navigate = useNavigate({ from: "/explorar-medicos" });
  const { items: doctors, total, page: currentPage, limit: currentLimit } =
    Route.useLoaderData() as LoaderData;
  const search = Route.useSearch() as SearchParams;
  const [plansOpen, setPlansOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / currentLimit));

  const handlePageChange = (newPage: number) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, page: newPage }) });
  };

  const handleLimitChange = (value: string) => {
    const newLimit = Number(value);
    navigate({ search: (prev: SearchParams) => ({ ...prev, page: 1, limit: newLimit }) });
  };

  const handleFilterChange = (key: "specialty" | "activity", val: string) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, [key]: val, page: 1 }) });
  };

  const clearFilters = () => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, specialty: "", activity: "", page: 1 }) });
  };

  const handleSeeMore = () => {
    if (user) navigate({ to: "/medicos" });
    else setPlansOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Conheça nossos <span className="text-primary">médicos</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Por privacidade, exibimos publicamente apenas a especialidade.
              Cadastre-se para ver o perfil completo.
            </p>
          </div>
          <BackButton to="/" label="Voltar ao início" />
        </div>

        {/* Controles de paginação */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {doctors.length} de {total} médicos
          </p>
          <div className="flex items-center gap-3">
            <Select
              value={String(currentLimit)}
              onValueChange={handleLimitChange}
            >
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

        {doctors.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum médico encontrado.
            </p>
            <div className="mt-4">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button className="gap-2">
                  Cadastrar como médico{" "}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <article
                  key={d.id}
                  className="flex h-full flex-col rounded-2xl border bg-card p-5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-accent">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">
                        Profissional verificado
                      </h3>
                      {d.specialty && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {d.specialty}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex min-h-[1.5rem] flex-wrap gap-1.5">
                    {d.specialties?.slice(0, 3).map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-3 space-y-2 rounded-lg border border-dashed bg-muted/40 p-3 text-xs">
                    <p className="flex items-center gap-1.5 font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" /> Informações confidenciais
                    </p>
                    <p className="select-none blur-sm">
                      Nome • CRM •••••-•• · Cidade/UF
                    </p>
                    <p className="select-none blur-sm">
                      Valor da consulta · Contato · Currículo
                    </p>
                  </div>

                  <div className="mt-auto pt-4">
                    <Button
                      className="w-full gap-2"
                      onClick={handleSeeMore}
                    >
                      Ver mais <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
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
        title="Para ver o perfil completo do médico"
        description="Escolha um plano e crie sua conta para acessar nome, CRM, contato direto e currículo completo."
      />
    </div>
  );
}
