import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Stethoscope, Building2, Calendar, CheckCircle2, ArrowRight, ShieldCheck, Clock,
  Mail, MapPin, Linkedin, Instagram, Facebook, Search, Star, Users, Filter, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SiteHeader } from "@/components/site-header";
import logo from "@/assets/connect-med-logo.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connect-Med — Plantões de Telemedicina para Médicos e Redes" },
      { name: "description", content: "Conectamos médicos a redes de telemedicina. Solicite plantões, encontre profissionais qualificados e gerencie sua agenda em um só lugar." },
      { property: "og:title", content: "Connect-Med — Plantões de Telemedicina" },
      { property: "og:description", content: "Plantões simplificados, oportunidades ampliadas para médicos e redes de telemedicina." },
    ],
  }),
  component: LandingPage,
});

/* ====================== Mock data ====================== */
const DOCTORS = [
  { id: 1, name: "Dr. Carlos Silva", specialty: "Médico Clínico Geral", location: "São Paulo, SP", rating: 4.9, reviews: 127, responseTime: "Responde em minutos", hourlyRate: 150, specialties: ["Clínica Geral", "Telemedicina", "Diagnóstico Clínico"], avatar: "👨‍⚕️" },
  { id: 2, name: "Dra. Marina Costa", specialty: "Cardiologista", location: "Rio de Janeiro, RJ", rating: 4.8, reviews: 95, responseTime: "Responde em 2 horas", hourlyRate: 200, specialties: ["Cardiologia", "Telemedicina", "Prevenção"], avatar: "👩‍⚕️" },
  { id: 3, name: "Dr. Rafael Mendes", specialty: "Pediatra", location: "Belo Horizonte, MG", rating: 4.7, reviews: 64, responseTime: "Responde em 1 hora", hourlyRate: 180, specialties: ["Pediatria", "Telemedicina", "Neonatologia"], avatar: "👨‍⚕️" },
  { id: 4, name: "Dra. Juliana Alves", specialty: "Psiquiatra", location: "São Paulo, SP", rating: 5.0, reviews: 152, responseTime: "Responde em minutos", hourlyRate: 250, specialties: ["Psiquiatria", "Telemedicina", "Saúde Mental"], avatar: "👩‍⚕️" },
  { id: 5, name: "Dr. Pedro Rocha", specialty: "Médico de Família", location: "Curitiba, PR", rating: 4.6, reviews: 41, responseTime: "Responde em 3 horas", hourlyRate: 130, specialties: ["Medicina de Família", "Clínica Geral"], avatar: "👨‍⚕️" },
  { id: 6, name: "Dra. Beatriz Lima", specialty: "Endocrinologista", location: "Porto Alegre, RS", rating: 4.9, reviews: 88, responseTime: "Responde em 1 hora", hourlyRate: 220, specialties: ["Endocrinologia", "Telemedicina"], avatar: "👩‍⚕️" },
];

const ALL_SPECIALTIES = ["Clínica Geral", "Cardiologia", "Pediatria", "Psiquiatria", "Medicina de Família", "Endocrinologia", "Telemedicina"];
const ALL_LOCATIONS = ["São Paulo, SP", "Rio de Janeiro, RJ", "Belo Horizonte, MG", "Curitiba, PR", "Porto Alegre, RS"];

/* ====================== Page ====================== */
function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <HowItWorksNetworks />
      <HowItWorksDoctors />
      <Benefits />
      <ExploreDoctors />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ====================== Hero ====================== */
function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--primary) 8%, var(--background)) 100%)" }}
    >
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <img src={logo} alt="Connect-Med" className="mb-6 h-24 w-auto sm:h-32 lg:h-40 drop-shadow-sm" />
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" /> Plataforma de telemedicina
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Conectamos <span className="text-primary underline decoration-primary/40 underline-offset-4">médicos</span> a{" "}
              <span className="text-primary underline decoration-primary/40 underline-offset-4">redes</span> de telemedicina
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Plantões simplificados, oportunidades ampliadas. Para redes: encontre rapidamente médicos qualificados.
              Para médicos: acesse plantões flexíveis e bem remunerados.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Conexões seguras e verificadas",
                "Processo rápido e eficiente",
                "Sem burocracia, sem complicações",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="gap-2">
                  Para Redes de Telemedicina <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" variant="outline" className="gap-2">
                  Para Médicos <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Seguro</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Resposta em minutos</span>
            </div>
          </div>

          <div className="relative group">
            <div
              className="rounded-3xl border bg-card p-6 shadow-xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent transition-transform group-hover:scale-110">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">TeleSaúde Brasil</p>
                    <p className="text-xs text-muted-foreground">Solicitou um plantão</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium" style={{ color: "oklch(0.45 0.12 60)" }}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" /> Pendente
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4">
                <div><p className="text-xs text-muted-foreground">Data</p><p className="font-semibold">Sex, 02/05</p></div>
                <div><p className="text-xs text-muted-foreground">Horário</p><p className="font-semibold">19:00 → 07:00</p></div>
                <div><p className="text-xs text-muted-foreground">Duração</p><p className="font-semibold">12 horas</p></div>
                <div><p className="text-xs text-muted-foreground">Plantão</p><p className="font-semibold">Clínica geral</p></div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button className="flex-1 bg-success text-success-foreground hover:bg-success/90 transition-transform hover:scale-[1.02]">Aceitar</Button>
                <Button variant="outline" className="flex-1 transition-transform hover:scale-[1.02]">Recusar</Button>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
              <Users className="h-4 w-4 text-primary" /> Conectando profissionais
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================== How it works (networks) ====================== */
function StepCard({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-2xl font-bold text-primary">{n}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function HowItWorksNetworks() {
  return (
    <section className="bg-card">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Como funciona para <span className="text-primary">Redes de Telemedicina</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Três passos simples para gerenciar seus plantões.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <StepCard n={1} title="Solicite" desc="Crie e publique plantões com facilidade, definindo especialidade, data e horário. Seu plantão fica visível para médicos qualificados." />
          <StepCard n={2} title="Conecte" desc="Receba propostas de médicos qualificados e verifique perfis. Escolha o melhor profissional para seu plantão." />
          <StepCard n={3} title="Agende" desc="Confirme o plantão e gerencie sua equipe médica com eficiência. Tudo organizado em um único lugar." />
        </div>
      </div>
    </section>
  );
}

function HowItWorksDoctors() {
  return (
    <section style={{ background: "color-mix(in oklab, var(--primary) 8%, var(--background))" }}>
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Como funciona para <span className="text-primary">Médicos</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Encontre plantões que se encaixam na sua agenda.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <StepCard n={1} title="Encontre" desc="Navegue por plantões disponíveis que se alinham à sua especialidade e disponibilidade. Filtros inteligentes facilitam a busca." />
          <StepCard n={2} title="Responda" desc="Responda rapidamente às solicitações de plantão com um clique. Aceite ou recuse conforme sua disponibilidade." />
          <StepCard n={3} title="Trabalhe" desc="Realize seus plantões de telemedicina e receba pagamentos de forma segura. Sem complicações, sem atrasos." />
        </div>
      </div>
    </section>
  );
}

/* ====================== Benefits ====================== */
function BenefitItem({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

function Benefits() {
  return (
    <section className="bg-card">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Por que escolher o <span className="text-primary">Connect-Med</span>?
          </h2>
          <p className="mt-3 text-muted-foreground">Benefícios para ambos os lados da plataforma.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl p-8" style={{ background: "color-mix(in oklab, var(--primary) 8%, var(--background))", boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">Para Redes</h3>
            </div>
            <ul className="mt-6 space-y-4">
              <BenefitItem title="Acesso a Talentos" desc="Ampla rede de médicos especializados e verificados." />
              <BenefitItem title="Otimização de Tempo" desc="Redução do tempo de preenchimento de vagas." />
              <BenefitItem title="Controle Total" desc="Gerenciamento simplificado de plantões e equipes." />
            </ul>
          </div>
          <div className="rounded-2xl p-8" style={{ background: "color-mix(in oklab, var(--primary) 8%, var(--background))", boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-3">
              <Stethoscope className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">Para Médicos</h3>
            </div>
            <ul className="mt-6 space-y-4">
              <BenefitItem title="Renda Extra" desc="Oportunidades de plantões complementares bem remunerados." />
              <BenefitItem title="Autonomia" desc="Escolha quando e onde trabalhar, com total flexibilidade." />
              <BenefitItem title="Suporte Dedicado" desc="Plataforma intuitiva com suporte sempre disponível." />
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================== Explore Doctors ====================== */
function FilterPanel({
  query, setQuery, specs, toggleSpec, locs, toggleLoc,
  minRate, setMinRate, maxRate, setMaxRate, clear,
}: {
  query: string; setQuery: (v: string) => void;
  specs: string[]; toggleSpec: (s: string) => void;
  locs: string[]; toggleLoc: (l: string) => void;
  minRate: number; setMinRate: (n: number) => void;
  maxRate: number; setMaxRate: (n: number) => void;
  clear: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">Busca</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome ou especialidade..." className="pl-9" />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Especialidades</p>
        <div className="space-y-2 max-h-48 overflow-auto pr-1">
          {ALL_SPECIALTIES.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={specs.includes(s)} onCheckedChange={() => toggleSpec(s)} />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Localização</p>
        <div className="space-y-2 max-h-40 overflow-auto pr-1">
          {ALL_LOCATIONS.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={locs.includes(l)} onCheckedChange={() => toggleLoc(l)} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Taxa horária (R$)</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Mínimo</span><span>R$ {minRate}</span></div>
            <input type="range" min={0} max={500} step={10} value={minRate} onChange={(e) => setMinRate(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Máximo</span><span>R$ {maxRate}</span></div>
            <input type="range" min={0} max={500} step={10} value={maxRate} onChange={(e) => setMaxRate(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>
      </div>
      <button type="button" onClick={clear} className="text-sm font-medium text-primary hover:underline">
        Limpar filtros
      </button>
    </div>
  );
}

function DoctorCard({ d }: { d: typeof DOCTORS[number] }) {
  return (
    <div className="rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent text-3xl">{d.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold">{d.name}</h3>
              <p className="text-sm text-muted-foreground">{d.specialty}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">R$ {d.hourlyRate}<span className="text-xs font-normal text-muted-foreground">/hora</span></p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> <span className="font-medium text-foreground">{d.rating}</span> ({d.reviews})</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {d.location}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {d.responseTime}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.specialties.map((s) => <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>)}
          </div>
          <div className="mt-4 flex justify-end">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm">Ver perfil</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExploreDoctors() {
  const [query, setQuery] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [locs, setLocs] = useState<string[]>([]);
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(500);
  const [open, setOpen] = useState(false);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DOCTORS.filter((d) => {
      if (q && !(d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || d.specialties.some(s => s.toLowerCase().includes(q)))) return false;
      if (specs.length > 0 && !d.specialties.some(s => specs.includes(s))) return false;
      if (locs.length > 0 && !locs.includes(d.location)) return false;
      if (d.hourlyRate < minRate || d.hourlyRate > maxRate) return false;
      return true;
    });
  }, [query, specs, locs, minRate, maxRate]);

  const clear = () => { setQuery(""); setSpecs([]); setLocs([]); setMinRate(0); setMaxRate(500); };

  const panelProps = {
    query, setQuery,
    specs, toggleSpec: (s: string) => setSpecs(toggle(specs, s)),
    locs, toggleLoc: (l: string) => setLocs(toggle(locs, l)),
    minRate, setMinRate, maxRate, setMaxRate, clear,
  };

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Conheça Nossos <span className="text-primary">Médicos</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Explore uma rede de profissionais qualificados.</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
              <h3 className="mb-4 flex items-center gap-2 font-semibold"><Filter className="h-4 w-4 text-primary" /> Filtros</h3>
              <FilterPanel {...panelProps} />
            </div>
          </aside>

          {/* Main */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "médico encontrado" : "médicos encontrados"}</p>
              {/* Mobile filters */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                    <Filter className="h-4 w-4" /> Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] sm:w-[380px] overflow-y-auto">
                  <SheetTitle className="sr-only">Filtros</SheetTitle>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold"><Filter className="h-4 w-4 text-primary" /> Filtros</h3>
                    <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                  <FilterPanel {...panelProps} />
                  <Button onClick={() => setOpen(false)} className="mt-6 w-full">Aplicar filtros</Button>
                </SheetContent>
              </Sheet>
            </div>

            <div className="space-y-4">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
                  Nenhum médico encontrado com esses filtros.
                </div>
              ) : (
                filtered.map((d) => <DoctorCard key={d.id} d={d} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================== Final CTA ====================== */
function FinalCTA() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Pronto para Transformar sua Experiência em Telemedicina?</h2>
        <p className="mt-4 text-primary-foreground/90">
          Junte-se a centenas de redes de telemedicina e médicos que já confiam no Connect-Med.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" variant="secondary" className="gap-2 bg-card text-foreground hover:bg-card/90">
              Cadastrar Rede de Telemedicina <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" variant="outline" className="gap-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Cadastrar como Médico <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ====================== Footer ====================== */
function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logo} alt="Connect-Med" className="h-10 w-auto brightness-0 invert" />
          <p className="mt-3 text-sm text-background/70">
            Plataforma para conectar médicos e redes de telemedicina com agilidade e segurança.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Plataforma</h3>
          <ul className="mt-3 space-y-2 text-sm text-background/70">
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-background">Para Redes</Link></li>
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-background">Para Médicos</Link></li>
            <li><Link to="/dashboard" className="hover:text-background">Painel</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-background/70">
            <li><a href="#" className="hover:text-background">Termos de Uso</a></li>
            <li><a href="#" className="hover:text-background">Política de Privacidade</a></li>
            <li><a href="#" className="hover:text-background">LGPD</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Contato</h3>
          <ul className="mt-3 space-y-2 text-sm text-background/70">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> contato@connect-med.com.br</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> São Paulo, SP — Brasil</li>
          </ul>
          <div className="mt-4 flex gap-3">
            <a href="#" aria-label="LinkedIn" className="rounded-md border border-background/20 p-2 text-background/70 transition-colors hover:bg-background/10 hover:text-background"><Linkedin className="h-4 w-4" /></a>
            <a href="#" aria-label="Instagram" className="rounded-md border border-background/20 p-2 text-background/70 transition-colors hover:bg-background/10 hover:text-background"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="Facebook" className="rounded-md border border-background/20 p-2 text-background/70 transition-colors hover:bg-background/10 hover:text-background"><Facebook className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-background/10 py-5 text-center text-xs text-background/60">
        © {new Date().getFullYear()} Connect-Med · Todos os direitos reservados
      </div>
    </footer>
  );
}
