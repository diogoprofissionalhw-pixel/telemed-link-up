import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Lock, Stethoscope } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlansDialog } from "@/components/plans-dialog";
import { useAuth } from "@/lib/auth-context";
import { listPublicDoctors } from "@/lib/public-discovery.functions";

type PublicDoctor = {
  id: string;
  specialty: string | null;
  specialties: string[];
};

export const Route = createFileRoute("/explorar-medicos")({
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
  component: ExplorarMedicosPage,
});

function ExplorarMedicosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    listPublicDoctors({ data: { limit: 120 } })
      .then((res) => {
        setDoctors(res.items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
              Por privacidade, exibimos publicamente apenas a especialidade. Cadastre-se para ver o perfil completo.
            </p>
          </div>
          <BackButton to="/" label="Voltar ao início" />
        </div>

        {loading ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Carregando médicos…</p>
        ) : doctors.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum médico encontrado.</p>
            <div className="mt-4">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button className="gap-2">Cadastrar como médico <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        ) : (
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
                    <h3 className="truncate text-sm font-semibold">Profissional verificado</h3>
                    {d.specialty && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.specialty}</p>
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
                  <p className="select-none blur-sm">Nome • CRM •••••-•• · Cidade/UF</p>
                  <p className="select-none blur-sm">Valor da consulta · Contato · Currículo</p>
                </div>

                <div className="mt-auto pt-4">
                  <Button className="w-full gap-2" onClick={handleSeeMore}>
                    Ver mais <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
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
