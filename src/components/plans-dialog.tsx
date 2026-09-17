import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { features } from "@/lib/features";


type Plan = {
  id: "free" | "pro" | "premium";
  name: string;
  monthly: number;
  annual: number;
  description: string;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
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

export function PlansDialog({
  open,
  onOpenChange,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const goSignup = () => {
    onOpenChange(false);
    navigate({ to: "/auth", search: { mode: "signup" } });
  };

  // Planos ocultos temporariamente (features.showPricing): mostramos apenas o
  // aviso de liberação de conteúdo, sem preços.
  if (!features.showPricing) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Este conteúdo é liberado pela sua empresa parceira ou pelo administrador da Academy.
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full" onClick={goSignup}>
            Criar minha conta
          </Button>
        </DialogContent>
      </Dialog>
    );
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mx-auto inline-flex rounded-full border bg-muted p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-4 py-1.5 transition ${billing === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-full px-4 py-1.5 transition ${billing === "annual" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
          >
            Anual <span className="ml-1 text-[10px] text-primary">−20%</span>
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const value = billing === "monthly" ? plan.monthly : plan.annual;
            const period = billing === "monthly" ? "/mês" : "/ano";
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-5 ${plan.highlighted ? "border-primary shadow-lg" : "bg-card"}`}
              >
                {plan.highlighted && (
                  <span className="mb-2 self-start rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    MAIS POPULAR
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{formatBRL(value)}</span>
                  <span className="text-xs text-muted-foreground">{plan.id === "free" ? "" : period}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={goSignup}
                >
                  {plan.id === "free" ? "Cadastrar grátis" : "Assinar e cadastrar"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Para acessar perfis completos é necessário criar uma conta.
        </p>
      </DialogContent>
    </Dialog>
  );
}
