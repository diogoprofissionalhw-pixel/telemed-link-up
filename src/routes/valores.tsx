import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

const PLANS = [
  {
    id: "free",
    name: "Gratuito",
    monthly: 0,
    annual: 0,
    description: "Para começar a explorar a plataforma.",
    features: ["Cadastro gratuito", "Visualizar redes e médicos", "Perfil básico"],
  },
  {
    id: "pro",
    name: "Profissional",
    monthly: 49,
    annual: 470,
    description: "Mais visibilidade e contato direto.",
    features: ["Tudo do Gratuito", "Contato direto", "Destaque no perfil", "Suporte prioritário"],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 129,
    annual: 1238,
    description: "Recursos avançados para redes e médicos.",
    features: ["Tudo do Profissional", "Analytics avançado", "Chat ilimitado", "Suporte dedicado 24/7"],
  },
];

function formatBRL(v: number) {
  return v === 0 ? "R$ 0" : `R$ ${v.toLocaleString("pt-BR")}`;
}

export const Route = createFileRoute("/valores")({
  head: () => ({
    meta: [
      { title: "Planos e Preços — Connect-Med" },
      { name: "description", content: "Escolha o plano ideal para médicos e redes de telemedicina na Connect-Med." },
      { property: "og:title", content: "Planos e Preços — Connect-Med" },
      { property: "og:description", content: "Planos Gratuito, Profissional e Premium para quem quer crescer na telemedicina." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://telemed-link-up.lovable.app/valores" },
    ],
  }),
  component: ValoresPage,
});

function ValoresPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Planos e Preços</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Escolha o plano que faz sentido para você. Todos os planos incluem acesso à plataforma e aos perfis públicos.
        </p>

        <div className="mx-auto mt-8 inline-flex rounded-full border bg-muted p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 transition ${billing === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-full px-5 py-2 transition ${billing === "annual" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            Anual <span className="ml-1 text-xs text-primary">−20%</span>
          </button>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 text-left ${plan.highlighted ? "bg-card shadow-lg ring-1 ring-primary" : "bg-card"}`}
            >
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">{formatBRL(billing === "monthly" ? plan.monthly : plan.annual)}</span>
                <span className="text-sm text-muted-foreground">/{billing === "monthly" ? "mês" : "ano"}</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth" search={{ mode: "signup" }} className="mt-6 block">
                <Button className="w-full gap-2" variant={plan.highlighted ? "default" : "outline"}>
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
