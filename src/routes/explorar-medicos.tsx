import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Lock, MapPin, Stethoscope } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlansDialog } from "@/components/plans-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type PublicDoctor = {
  id: string;
  full_name: string | null;
  specialty: string | null;
  specialties: string[] | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  years_experience: number | null;
};

export const Route = createFileRoute("/explorar-medicos")({
  head: () => ({
    meta: [
      { title: "Conheça nossos médicos — Connect-Med" },
      {
        name: "description",
        content:
          "Explore médicos cadastrados na Connect-Med. Filtre por especialidade e localização. Cadastre-se para ver o perfil completo.",
      },
    ],
  }),
  component: ExplorarMedicosPage,
});

function ExplorarMedicosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [state, setState] = useState("all");
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("doctors_public")
      .select("id, full_name, specialty, specialties, city, state, avatar_url, years_experience")
      .order("created_at", { ascending: false })
      .limit(120)
      .then(({ data }) => {
        setDoctors((data as PublicDoctor[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  const specialties = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      if (d.specialty) set.add(d.specialty);
      d.specialties?.forEach((s) => s && set.add(s));
    });
    return Array.from(set).sort();
  }, [doctors]);

  const states = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => d.state && set.add(d.state));
    return Array.from(set).sort();
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      if (q && !(d.full_name ?? "").toLowerCase().includes(q)) return false;
      if (specialty !== "all") {
        const all = [d.specialty, ...(d.specialties ?? [])].filter(Boolean) as string[];
        if (!all.includes(specialty)) return false;
      }
      if (state !== "all" && d.state !== state) return false;
      return true;
    });
  }, [doctors, query, specialty, state]);

  const handleSeeMore = (id: string) => {
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
              Use os filtros para encontrar profissionais. Para ver o perfil completo, é necessário ter conta.
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
              placeholder="Buscar por nome"
              className="pl-9"
            />
          </div>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger>
              <SelectValue placeholder="Especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as especialidades</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>

        {loading ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Carregando médicos…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum médico encontrado com esses filtros.</p>
            <div className="mt-4">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button className="gap-2">Cadastrar como médico <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => {
              const local = [d.city, d.state].filter(Boolean).join(", ");
              return (
                <article
                  key={d.id}
                  className="flex h-full flex-col rounded-2xl border bg-card p-5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-accent">
                      {d.avatar_url ? (
                        <img src={d.avatar_url} alt={`Foto ${d.full_name ?? "médico"}`} className="h-full w-full object-cover" />
                      ) : (
                        <Stethoscope className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{d.full_name ?? "Médico"}</h3>
                      {d.specialty && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.specialty}</p>
                      )}
                      {local && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {local}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex min-h-[1.5rem] flex-wrap gap-1.5">
                    {d.specialties?.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>

                  <div className="mt-3 space-y-2 rounded-lg border border-dashed bg-muted/40 p-3 text-xs">
                    <p className="flex items-center gap-1.5 font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" /> Informações confidenciais
                    </p>
                    <p className="select-none blur-sm">CRM •••••-•• · Valor da consulta R$ •••</p>
                    <p className="select-none blur-sm">Contato direto e currículo completo</p>
                  </div>

                  <div className="mt-auto pt-4">
                    <Button className="w-full gap-2" onClick={() => handleSeeMore(d.id)}>
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
        title="Para ver o perfil completo do médico"
        description="Escolha um plano e crie sua conta para acessar CRM, contato direto e currículo completo."
      />
    </div>
  );
}
