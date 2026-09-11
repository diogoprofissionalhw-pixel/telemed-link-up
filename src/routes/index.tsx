import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Stethoscope, Building2, CheckCircle2, ArrowRight, ShieldCheck, Clock,
  Mail, MapPin, Users, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import logo from "@/assets/connect-med-logo.webp";
import doctorPortrait from "@/assets/doctor-portrait.png";
import networkBuilding from "@/assets/network-building.avif";
import academyLogo from "@/assets/connect-academy-logo-hq.png.asset.json";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connect-Med — Plantões de Telemedicina para Médicos e Redes" },
      { name: "description", content: "Conectamos médicos a redes de telemedicina. Solicite plantões, encontre profissionais qualificados e gerencie sua agenda em um só lugar." },
      { property: "og:title", content: "Connect-Med — Plantões de Telemedicina" },
      { property: "og:description", content: "Plantões simplificados, oportunidades ampliadas para médicos e redes de telemedicina." },
      { property: "og:url", content: "https://telemed-link-up.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://telemed-link-up.lovable.app/" },
    ],
  }),
  component: LandingPage,
});


/* ====================== Page ====================== */
function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorksDoctors />
        <HowItWorksNetworks />
        <Benefits />
        <ExploreAcademy />
        <ExploreDoctors />
        <ExploreNetworks />
        <FinalCTA />

      </main>
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
            <div className="mb-6 flex items-center gap-4">
              <img src={logo} alt="Connect-Med" width="160" height="160" fetchPriority="high" decoding="async" className="h-28 w-auto sm:h-36 lg:h-44 drop-shadow-sm" />
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary tracking-tight">Connect-Med</span>
            </div>
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
              <div className="mt-5 flex gap-2" aria-hidden="true">
                <Button type="button" disabled tabIndex={-1} className="flex-1 bg-success text-success-foreground hover:bg-success/90 disabled:opacity-100 disabled:cursor-default">Aceitar</Button>
                <Button type="button" disabled tabIndex={-1} variant="outline" className="flex-1 disabled:opacity-100 disabled:cursor-default">Recusar</Button>
              </div>
              <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">Exemplo ilustrativo</p>
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

function HowItWorksDoctors() {
  return (
    <section style={{ background: "color-mix(in oklab, var(--primary) 8%, var(--background))" }}>
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Como funciona para <span className="text-primary">Médicos</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Crie seu perfil e seja encontrado pelas melhores redes de telemedicina.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard n={1} title="Cadastre-se" desc="Crie sua conta gratuita em poucos minutos informando seus dados básicos e CRM." />
          <StepCard n={2} title="Monte seu perfil" desc="Adicione especialidades, experiência, formação, certificações, valor da consulta e disponibilidade. Seu perfil fica visível para todas as redes da plataforma." />
          <StepCard n={3} title="Receba solicitações" desc="As redes encontram seu perfil pelos filtros e enviam solicitações de plantão. Você aceita ou recusa com um clique." />
          <StepCard n={4} title="Trabalhe e receba" desc="Realize seus plantões, converse pelo chat integrado e receba avaliações que reforçam sua reputação." />
        </div>
      </div>
    </section>
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
          <p className="mt-3 text-muted-foreground">Encontre o médico certo, filtre, contate e agende — tudo em um só lugar.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard n={1} title="Cadastre sua rede" desc="Crie a conta da sua rede de telemedicina com CNPJ e dados de contato." />
          <StepCard n={2} title="Explore médicos" desc="Navegue pela rede de profissionais com filtros de especialidade, localização, valor da consulta e avaliações. Veja o perfil completo de cada médico." />
          <StepCard n={3} title="Solicite o plantão" desc="Envie a solicitação direto para o médico escolhido informando data, horário, duração e valor combinado." />
          <StepCard n={4} title="Acompanhe e avalie" desc="Converse pelo chat, receba lembretes automáticos do plantão e avalie o profissional após a finalização." />
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
              <Stethoscope className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">Para Médicos</h3>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              A plataforma oferece novas oportunidades de atendimento, flexibilidade profissional e acesso facilitado a empresas e pacientes, com suporte tecnológico confiável e estrutura digital completa.
            </p>
          </div>
          <div className="rounded-2xl p-8" style={{ background: "color-mix(in oklab, var(--primary) 8%, var(--background))", boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">Para Empresas</h3>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              A Connect-Med simplifica o acesso a profissionais qualificados, reduz custos operacionais e agiliza atendimentos médicos ocupacionais e clínicos, promovendo mais cuidado, produtividade e bem-estar aos colaboradores.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}




/* ====================== Explore Doctors ====================== */
function ExploreDoctors() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="rounded-3xl border bg-card p-8 sm:p-12" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex justify-center lg:justify-start">
              <div
                className="relative aspect-square w-64 sm:w-80 lg:w-full lg:max-w-md overflow-hidden rounded-full border-4 border-accent"
                style={{ boxShadow: "var(--shadow-elegant)" }}
              >
                <img
                  src={doctorPortrait}
                  alt="Médico profissional da rede Connect-Med"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold sm:text-4xl">
                Conheça Nossos <span className="text-primary">Médicos</span>
              </h2>
              <p className="mt-3 text-muted-foreground lg:max-w-md">
                Explore nossa rede de profissionais qualificados. Filtre por especialidade, localização e taxa horária.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link to="/explorar-medicos">
                  <Button size="lg" className="gap-2">
                    Conhecer médicos <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================== Explore Networks ====================== */
function ExploreNetworks() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="rounded-3xl border bg-card p-8 sm:p-12" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex justify-center lg:justify-start">
              <div
                className="relative aspect-square w-64 sm:w-80 lg:w-full lg:max-w-md overflow-hidden rounded-full border-4 border-accent bg-foreground"
                style={{ boxShadow: "var(--shadow-elegant)" }}
              >
                <img
                  src={networkBuilding}
                  alt="Redes parceiras Connect-Med"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-xs font-semibold text-primary">
                <Building2 className="h-3.5 w-3.5" /> Redes parceiras
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Conheça Nossas <span className="text-primary">Redes</span>
              </h2>
              <p className="mt-3 text-muted-foreground lg:max-w-md">
                Descubra as empresas de telemedicina que contratam profissionais através do Connect-Med e encontre oportunidades alinhadas à sua especialidade.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link to="/explorar-redes">
                  <Button size="lg" className="gap-2">
                    Conhecer redes <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================== Explore Academy ====================== */
function ExploreAcademy() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--primary) 8%, var(--background)) 100%)" }}
    >
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6">
                <img
                  src={academyLogo.url}
                  alt="Connect-Academy"
                  width="200"
                  height="200"
                  fetchPriority="high"
                  decoding="async"
                  className="h-36 w-auto sm:h-44 lg:h-52 drop-shadow-sm"
                />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5 text-primary" /> Educação continuada em saúde
            </div>

            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Capacitação para quem cuida da <span className="text-primary underline decoration-primary/40 underline-offset-4">saúde</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              A Connect-Academy oferece trilhas de formação práticas e direcionadas para médicos, enfermeiros e gestores de saúde.
              Da base técnica à especialização, você estuda no seu ritmo e aplica o conhecimento no dia a dia profissional.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Trilhas organizadas por especialidade e nível",
                "Videoaulas com experts da área da saúde",
                "Certificados e conteúdos atualizados",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/academy">
                <Button size="lg" className="gap-2">
                  Conhecer trilhas <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
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
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Trilha: Urgência e Emergência</p>
                    <p className="text-xs text-muted-foreground">12 aulas · 4h 30min</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Disponível
                </span>
              </div>
              <div className="mt-5 aspect-video rounded-xl bg-muted/50 flex items-center justify-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <div className="mt-5 flex gap-2" aria-hidden="true">
                <Button type="button" disabled tabIndex={-1} className="flex-1 disabled:opacity-100 disabled:cursor-default">Assistir aula 1</Button>
              </div>
              <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">Exemplo ilustrativo</p>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
              <Users className="h-4 w-4 text-primary" /> Aprenda com especialistas
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
            <Button size="lg" variant="outline" className="gap-2 border-2 border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Cadastrar Rede de Telemedicina <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" variant="outline" className="gap-2 border-2 border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">
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
          <img src={logo} alt="Connect-Med" width="40" height="40" loading="lazy" decoding="async" className="h-10 w-auto brightness-0 invert" />
          <p className="mt-3 text-sm text-background/70">
            Plataforma para conectar médicos e redes de telemedicina com agilidade e segurança.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Plataforma</h3>
          <ul className="mt-3 space-y-2 text-sm text-background/70">
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-background">Para Redes</Link></li>
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-background">Para Médicos</Link></li>
            
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-background/70">
            <li><Link to="/termos" className="hover:text-background">Termos de Uso</Link></li>
            <li><Link to="/privacidade" className="hover:text-background">Política de Privacidade</Link></li>
            <li><Link to="/lgpd" className="hover:text-background">LGPD</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Contato</h3>
          <ul className="mt-3 space-y-2 text-sm text-background/70">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>connectmed10@gmail.com</span></li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>João Pessoa, PB — Brasil</span></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Suporte</h3>
          <a
            href="https://bot-atendimento.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-background/10 px-4 py-2 text-sm font-medium text-background hover:bg-background/20 transition-colors"
          >
            Central de ajuda
          </a>
        </div>
      </div>
      <div className="border-t border-background/10 py-5 text-center text-xs text-background/60">
        © {new Date().getFullYear()} Connect-Med · Todos os direitos reservados
      </div>
    </footer>
  );
}
