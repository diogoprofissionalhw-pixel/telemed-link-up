import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Stethoscope, Building2, Check, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import {
  UF_LIST, isValidCPF, isValidCNPJ, isValidCRM, isValidEmail, isValidPhone,
  maskCPF, maskCNPJ, maskCRM, maskPhone, onlyDigits,
} from "@/lib/validators";

type Mode = "signin" | "signup";
type AccountType = "doctor" | "network";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "signup" ? "signup" : "signin") as Mode,
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Mode>(mode);

  useEffect(() => { setTab(mode); }, [mode]);
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col px-4 py-12">
        <div className="rounded-2xl border bg-card p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <h1 className="text-2xl font-bold">Acessar Connect-Med</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre ou crie sua conta para continuar.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as Mode)} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <SignInForm />
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <SignUpWizard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div>
        <Label htmlFor="email-in">Email</Label>
        <Input id="email-in" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="pass-in">Senha</Label>
        <Input id="pass-in" name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full transition-all" disabled={submitting}>
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : "Entrar"}
      </Button>
    </form>
  );
}

// ---------------- Signup wizard ----------------

type SignupState = {
  accountType: AccountType;
  full_name: string;
  email: string;
  password: string;
  phone: string;
  // doctor
  crm: string;
  crm_uf: string;
  specialty: string;
  cpf: string;
  city: string;
  state: string;
  country: string;
  // network
  network_name: string;
  cnpj: string;
};

const initialState: SignupState = {
  accountType: "doctor",
  full_name: "", email: "", password: "", phone: "",
  crm: "", crm_uf: "", specialty: "", cpf: "", city: "", state: "", country: "Brasil",
  network_name: "", cnpj: "",
};

function SignUpWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SignupState>(initialState);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = 3;
  const set = <K extends keyof SignupState>(k: K, v: SignupState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const stepValidation = useMemo(() => {
    if (step === 0) return null;
    if (step === 1) {
      if (state.full_name.trim().length < 2) return "Informe seu nome completo.";
      if (!isValidEmail(state.email)) return "Email inválido.";
      if (state.password.length < 6) return "Senha precisa ter ao menos 6 caracteres.";
      if (state.phone && !isValidPhone(state.phone)) return "Telefone inválido.";
      return null;
    }
    if (step === 2) {
      if (state.accountType === "doctor") {
        if (!isValidCRM(state.crm)) return "CRM inválido (4 a 7 dígitos).";
        if (!UF_LIST.includes(state.crm_uf as any)) return "Selecione a UF do CRM.";
        if (state.specialty.trim().length < 2) return "Informe a especialidade.";
        if (!isValidCPF(state.cpf)) return "CPF inválido.";
        if (state.city.trim().length < 2) return "Informe a cidade.";
        if (!UF_LIST.includes(state.state as any)) return "Selecione o estado.";
      } else {
        if (state.network_name.trim().length < 2) return "Informe o nome da rede.";
        if (!isValidCNPJ(state.cnpj)) return "CNPJ inválido.";
      }
      return null;
    }
    return null;
  }, [step, state]);

  const next = () => {
    if (stepValidation) return toast.error(stepValidation);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (stepValidation) return toast.error(stepValidation);
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: state.email,
      password: state.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: state.full_name, account_type: state.accountType },
      },
    });
    if (error || !data.user) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Erro ao cadastrar");
    }
    const userId = data.user.id;
    if (state.accountType === "doctor") {
      const { error: docErr } = await supabase.from("doctors").insert({
        id: userId,
        crm: onlyDigits(state.crm),
        crm_uf: state.crm_uf.toUpperCase(),
        specialty: state.specialty.trim(),
        cpf: onlyDigits(state.cpf),
        city: state.city.trim(),
        state: state.state.toUpperCase(),
        country: state.country.trim() || "Brasil",
        email: state.email,
      });
      if (docErr) { setSubmitting(false); return toast.error(docErr.message); }
    } else {
      const { error: netErr } = await supabase.from("networks").insert({
        id: userId,
        network_name: state.network_name.trim(),
        cnpj: onlyDigits(state.cnpj),
      });
      if (netErr) { setSubmitting(false); return toast.error(netErr.message); }
    }
    setSubmitting(false);
    toast.success("Conta criada com sucesso!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="space-y-6">
      <StepIndicator current={step} total={totalSteps} labels={["Tipo", "Acesso", "Dados"]} />

      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
          {([
            { v: "doctor" as const, label: "Sou médico", icon: Stethoscope, desc: "Aceite plantões de telemedicina" },
            { v: "network" as const, label: "Sou rede", icon: Building2, desc: "Solicite plantões para sua rede" },
          ]).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => set("accountType", opt.v)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all hover:scale-[1.02] hover:border-primary/50 ${
                state.accountType === opt.v
                  ? "border-primary bg-accent text-accent-foreground shadow-sm"
                  : "border-border hover:bg-muted"
              }`}
            >
              <opt.icon className="h-6 w-6" />
              <span>{opt.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Nome completo" htmlFor="full_name">
            <Input id="full_name" value={state.full_name} maxLength={120}
              onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email" error={state.email && !isValidEmail(state.email) ? "Email inválido" : undefined}>
            <Input id="email" type="email" value={state.email}
              onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Senha" htmlFor="password" hint="Mínimo 6 caracteres">
            <Input id="password" type="password" value={state.password} minLength={6}
              onChange={(e) => set("password", e.target.value)} />
          </Field>
          <Field label="Telefone (opcional)" htmlFor="phone"
            error={state.phone && !isValidPhone(state.phone) ? "Telefone inválido" : undefined}>
            <Input id="phone" inputMode="tel" placeholder="(11) 99999-9999"
              value={state.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} />
          </Field>
        </div>
      )}

      {step === 2 && state.accountType === "doctor" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="CRM" htmlFor="crm" error={state.crm && !isValidCRM(state.crm) ? "Inválido" : undefined}>
              <Input id="crm" value={state.crm}
                onChange={(e) => set("crm", maskCRM(e.target.value))} />
            </Field>
          </div>
          <div>
            <Label>UF</Label>
            <UFSelect value={state.crm_uf} onChange={(v) => set("crm_uf", v)} />
          </div>
          <div className="col-span-3">
            <Field label="Especialidade" htmlFor="specialty">
              <Input id="specialty" value={state.specialty} placeholder="Clínica geral"
                onChange={(e) => set("specialty", e.target.value)} />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="CPF" htmlFor="cpf"
              error={state.cpf && !isValidCPF(state.cpf) ? "CPF inválido" : undefined}>
              <Input id="cpf" inputMode="numeric" placeholder="000.000.000-00"
                value={state.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Cidade" htmlFor="city">
              <Input id="city" value={state.city}
                onChange={(e) => set("city", e.target.value)} />
            </Field>
          </div>
          <div>
            <Label>Estado</Label>
            <UFSelect value={state.state} onChange={(v) => set("state", v)} />
          </div>
          <div className="col-span-3">
            <Field label="País" htmlFor="country">
              <Input id="country" value={state.country}
                onChange={(e) => set("country", e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {step === 2 && state.accountType === "network" && (
        <div className="space-y-4">
          <Field label="Nome da rede" htmlFor="network_name">
            <Input id="network_name" value={state.network_name}
              onChange={(e) => set("network_name", e.target.value)} />
          </Field>
          <Field label="CNPJ" htmlFor="cnpj"
            error={state.cnpj && !isValidCNPJ(state.cnpj) ? "CNPJ inválido" : undefined}>
            <Input id="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00"
              value={state.cnpj} onChange={(e) => set("cnpj", maskCNPJ(e.target.value))} />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={prev} disabled={step === 0 || submitting}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        {step < totalSteps - 1 ? (
          <Button type="button" onClick={next} className="gap-1">
            Continuar <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={submitting} className="gap-1">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</> : <><Check className="h-4 w-4" /> Criar conta</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              done ? "bg-primary text-primary-foreground" :
              active ? "bg-primary/15 text-primary border border-primary" :
              "bg-muted text-muted-foreground"
            }`}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {labels[i]}
            </span>
            {i < total - 1 && <div className={`h-px flex-1 ${done ? "bg-primary" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label, htmlFor, hint, error, children,
}: { label: string; htmlFor?: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function UFSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
      <SelectContent>
        {UF_LIST.map((uf) => (
          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
