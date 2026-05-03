import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, Building2, Calendar, CheckCircle2, ArrowRight, ShieldCheck, Clock, Mail, MapPin, Linkedin, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import logo from "@/assets/connect-med-logo.webp";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <img src={logo} alt="Connect-Med" className="mb-6 h-32 w-auto sm:h-40 lg:h-48 drop-shadow-sm" />
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" />
              Plataforma para telemedicina
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Conectamos <span className="text-primary">médicos</span> a redes de telemedicina.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Redes solicitam plantões com data e duração. Médicos aceitam ou recusam em segundos.
              Simples, rápido e organizado.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="gap-2">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signin" }}>
                <Button size="lg" variant="outline">Já tenho conta</Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Seguro</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Resposta em minutos</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem burocracia</span>
            </div>
          </div>

          {/* Mock card visual */}
          <div className="relative">
            <div
              className="rounded-3xl border bg-card p-6 shadow-xl"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">TeleSaúde Brasil</p>
                    <p className="text-xs text-muted-foreground">Solicitou um plantão</p>
                  </div>
                </div>
                <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning-foreground" style={{ color: "oklch(0.45 0.12 60)" }}>
                  Pendente
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-semibold">Sex, 02/05</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horário</p>
                  <p className="font-semibold">19:00 → 07:00</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="font-semibold">12 horas</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plantão</p>
                  <p className="font-semibold">Clínica geral</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button className="flex-1 bg-success text-success-foreground hover:bg-success/90">Aceitar</Button>
                <Button variant="outline" className="flex-1">Recusar</Button>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border bg-card p-4 shadow-lg sm:block">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">Aceito por Dr. Silva</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-t bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Como funciona</h2>
            <p className="mt-3 text-muted-foreground">Três passos para gerenciar plantões.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Building2, title: "1. Rede solicita", desc: "Escolha o médico, defina dia e horário do plantão." },
              { icon: Stethoscope, title: "2. Médico responde", desc: "Recebe a solicitação e aceita ou recusa rapidamente." },
              { icon: Calendar, title: "3. Plantão agendado", desc: "Confirmação registrada para ambas as partes." },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: "var(--gradient-hero)" }}>
                  <s.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Pronto para começar?</h2>
        <p className="mt-3 text-muted-foreground">Crie sua conta gratuita como médico ou rede.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="gap-2">Criar conta <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Connect-Med · Plataforma de plantões de telemedicina
      </footer>
    </div>
  );
}
