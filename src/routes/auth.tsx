import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Stethoscope, Building2, Check, ArrowRight, Loader2, ShieldCheck, Search, AlertTriangle } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteHeader } from "@/components/site-header";
import { MunicipioSelect } from "@/components/municipio-select";
import {
  UF_LIST, isValidCPF, isValidCNPJ, isValidCRM, isValidEmail, isValidPhone,
  maskCPF, maskCNPJ, maskCRM, maskPhone, onlyDigits,
} from "@/lib/validators";
import { SPECIALTIES } from "@/lib/specialties";
import { lookupCNPJ, formatAddress, type CNPJData } from "@/lib/brasilapi";

// Validação de CRM: não existe API pública gratuita do CFM, então simulamos
// uma checagem consistente baseada no formato + UF. Em produção, plugar aqui
// uma chamada server-side para CFM/Conselho Regional.
type CRMData = { crm: string; uf: string; situacao: "ATIVO"; verifiedAt: string };
async function lookupCRM(crm: string, uf: string): Promise<CRMData> {
  await new Promise((r) => setTimeout(r, 900));
  const d = onlyDigits(crm);
  if (!isValidCRM(d)) throw new Error("CRM inválido.");
  if (!UF_LIST.includes(uf.toUpperCase() as any)) throw new Error("UF inválida.");
  return { crm: d, uf: uf.toUpperCase(), situacao: "ATIVO", verifiedAt: new Date().toISOString() };
}

type Mode = "signin" | "signup" | "forgot";
type AccountType = "doctor" | "network";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "signup" ? "signup" : s.mode === "forgot" ? "forgot" : "signin") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "Entrar ou cadastrar — Connect-Med" },
      { name: "description", content: "Acesse sua conta Connect-Med ou cadastre-se como médico ou rede de telemedicina e comece a usar a plataforma em minutos." },
      { property: "og:title", content: "Entrar ou cadastrar — Connect-Med" },
      { property: "og:description", content: "Acesse sua conta ou cadastre-se como médico ou rede de telemedicina." },
      { property: "og:url", content: "https://telemed-link-up.lovable.app/auth" },
    ],
    links: [
      { rel: "canonical", href: "https://telemed-link-up.lovable.app/auth" },
    ],
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
      <main className="mx-auto flex max-w-md flex-col px-4 py-12">
        <div className="mb-4">
          <BackButton to="/" label="Voltar ao início" />
        </div>
        <div className="rounded-2xl border bg-card p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <h1 className="text-2xl font-bold">
            {tab === "forgot" ? "Recuperar senha" : "Acessar Connect-Med"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "forgot"
              ? "Informe seu e-mail e enviaremos um link para você redefinir a senha."
              : "Entre ou crie sua conta para continuar."}
          </p>

          {tab === "forgot" ? (
            <div className="mt-6">
              <ForgotPasswordForm onBack={() => setTab("signin")} />
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as Mode)} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <SignInForm onForgot={() => setTab("forgot")} />
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <SignUpWizard />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
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
        <div className="flex items-center justify-between">
          <Label htmlFor="pass-in">Senha</Label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs font-medium text-primary hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>
        <Input id="pass-in" name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full transition-all" disabled={submitting}>
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : "Entrar"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const parsed = z.string().email("Email inválido").max(255).safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Enviamos um link de recuperação para seu e-mail.");
  };

  if (sent) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Se o e-mail estiver cadastrado, em instantes você receberá um link para redefinir sua senha.
          Verifique também a caixa de spam.
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={onBack}>
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email-forgot">Email</Label>
        <Input id="email-forgot" name="email" type="email" required autoComplete="email" />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : "Enviar link de recuperação"}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Voltar para o login
      </button>
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

async function runAutoQualification(userId: string, cnpj: string, preloaded: CNPJData | null) {
  try {
    const data = preloaded ?? (await lookupCNPJ(cnpj));
    const isQualified = data.situacao === "ATIVA" && data.is_health;
    await supabase.from("networks").update({
      legal_name: data.razao_social,
      address: formatAddress(data),
      city: data.municipio,
      state: data.uf,
      cnae_code: data.cnae_codigo,
      cnpj_activity: data.cnae_descricao,
      is_verified: data.situacao === "ATIVA",
      cnpj_verified_at: new Date().toISOString(),
      qualification_status: isQualified ? "qualified" : "unqualified",
      qualified_at: new Date().toISOString(),
    } as any).eq("id", userId);
  } catch {
    await supabase.from("networks").update({
      qualification_status: "unqualified",
      qualified_at: new Date().toISOString(),
    } as any).eq("id", userId);
  }
}

function SignUpWizard() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SignupState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJData | null>(null);
  const [cnpjLookup, setCnpjLookup] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [crmData, setCrmData] = useState<CRMData | null>(null);
  const [crmLookup, setCrmLookup] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [signupComplete, setSignupComplete] = useState<string | null>(null);

  const totalSteps = 3;
  const set = <K extends keyof SignupState>(k: K, v: SignupState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  // Reset validação se trocou o CNPJ
  useEffect(() => {
    if (cnpjData && onlyDigits(state.cnpj) !== cnpjData.cnpj) {
      setCnpjData(null);
      setCnpjError(null);
    }
  }, [state.cnpj, cnpjData]);

  // Reset validação se trocou CRM ou UF
  useEffect(() => {
    if (crmData && (onlyDigits(state.crm) !== crmData.crm || state.crm_uf.toUpperCase() !== crmData.uf)) {
      setCrmData(null);
      setCrmError(null);
    }
  }, [state.crm, state.crm_uf, crmData]);

  const handleLookupCnpj = async () => {
    setCnpjError(null);
    if (!isValidCNPJ(state.cnpj)) {
      setCnpjError("CNPJ inválido. Confira os dígitos.");
      return;
    }
    setCnpjLookup(true);
    try {
      const data = await lookupCNPJ(state.cnpj);
      if (data.situacao !== "ATIVA") {
        setCnpjError(`Situação cadastral: ${data.situacao || "desconhecida"}. Só CNPJs ATIVOS são aceitos.`);
        setCnpjData(null);
        return;
      }
      setCnpjData(data);
      if (!state.network_name.trim()) {
        set("network_name", data.nome_fantasia || data.razao_social);
      }
      toast.success("CNPJ validado!");
    } catch (e: any) {
      setCnpjError(e?.message ?? "Falha ao consultar CNPJ.");
      setCnpjData(null);
    } finally {
      setCnpjLookup(false);
    }
  };

  const handleLookupCrm = async () => {
    setCrmError(null);
    if (!isValidCRM(state.crm) || !UF_LIST.includes(state.crm_uf as any)) {
      setCrmError("Informe CRM e UF válidos.");
      return;
    }
    setCrmLookup(true);
    try {
      const data = await lookupCRM(state.crm, state.crm_uf);
      setCrmData(data);
      toast.success("CRM validado!");
    } catch (e: any) {
      setCrmError(e?.message ?? "Não foi possível validar seu registro profissional. Verifique os dados e tente novamente.");
      setCrmData(null);
    } finally {
      setCrmLookup(false);
    }
  };

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
        if (!isValidCNPJ(state.cnpj)) return "CNPJ inválido.";
        if (state.network_name.trim().length < 2) return "Informe o nome da rede.";
      }
      return null;
    }
    return null;
  }, [step, state, cnpjData]);

  const validationDone = state.accountType === "doctor" ? !!crmData : !!cnpjData;
  const canSubmit = !stepValidation && validationDone && consent && !submitting;

  const next = () => {
    if (stepValidation) return toast.error(stepValidation);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));


  const submit = async () => {
    if (stepValidation) return toast.error(stepValidation);
    setSubmitting(true);

    // Build user_metadata with everything the DB trigger needs to create the
    // doctor/network row. Confirmação de e-mail está ativa, então não temos
    // sessão para fazer inserts client-side — o trigger handle_new_user cuida disso.
    const meta: Record<string, unknown> = {
      full_name: state.full_name,
      account_type: state.accountType,
    };
    if (state.accountType === "doctor") {
      Object.assign(meta, {
        crm: onlyDigits(state.crm),
        crm_uf: state.crm_uf.toUpperCase(),
        specialty: state.specialty.trim(),
        cpf: onlyDigits(state.cpf),
        city: state.city.trim(),
        state: state.state.toUpperCase(),
        country: state.country.trim() || "Brasil",
      });
    } else {
      Object.assign(meta, {
        network_name: state.network_name.trim(),
        cnpj: onlyDigits(state.cnpj),
        legal_name: cnpjData?.razao_social ?? null,
        address: cnpjData ? formatAddress(cnpjData) : null,
        city: cnpjData?.municipio ?? null,
        state: cnpjData?.uf ?? null,
        cnae_code: cnpjData?.cnae_codigo ?? null,
        cnpj_activity: cnpjData?.cnae_descricao ?? null,
        is_verified: !!cnpjData,
        cnpj_verified_at: cnpjData ? new Date().toISOString() : null,
        qualification_status: "pending",
      });
    }

    const { error } = await supabase.auth.signUp({
      email: state.email,
      password: state.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: meta,
      },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);

    setSignupComplete(state.email);
    toast.success("Cadastro realizado! Verifique seu e-mail.");
  };

  if (signupComplete) {
    return (
      <div className="space-y-4 rounded-xl border bg-accent/30 p-5 text-sm">
        <h2 className="text-base font-semibold">Confirme seu e-mail</h2>
        <p className="text-muted-foreground">
          Enviamos um link de confirmação para <strong>{signupComplete}</strong>.
          Clique no link para ativar sua conta e poder acessar o painel.
        </p>
        <p className="text-xs text-muted-foreground">
          Não recebeu? Verifique a caixa de spam ou aguarde alguns minutos.
        </p>
      </div>
    );
  }

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
              <Select value={state.specialty} onValueChange={(v) => set("specialty", v)}>
                <SelectTrigger id="specialty"><SelectValue placeholder="Selecione sua especialidade" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="CPF" htmlFor="cpf"
              error={state.cpf && !isValidCPF(state.cpf) ? "CPF inválido" : undefined}>
              <Input id="cpf" inputMode="numeric" placeholder="000.000.000-00"
                value={state.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} />
            </Field>
          </div>
          <div>
            <Label>Estado</Label>
            <UFSelect value={state.state} onChange={(v) => { set("state", v); set("city", ""); }} />
          </div>
          <div className="col-span-2">
            <Field label="Município" htmlFor="city">
              <MunicipioSelect id="city" uf={state.state} value={state.city}
                onChange={(v) => set("city", v)} />
            </Field>
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
          <Field label="CNPJ" htmlFor="cnpj"
            error={state.cnpj && !isValidCNPJ(state.cnpj) ? "CNPJ inválido" : undefined}>
            <div className="flex gap-2">
              <Input id="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00"
                value={state.cnpj} onChange={(e) => set("cnpj", maskCNPJ(e.target.value))} />
              <Button type="button" variant="outline" className="gap-1.5 shrink-0"
                onClick={handleLookupCnpj}
                disabled={cnpjLookup || !isValidCNPJ(state.cnpj) || !!cnpjData}>
                {cnpjLookup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {cnpjData ? "Validado" : "Validar"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sua rede será validada automaticamente na Receita Federal (BrasilAPI) logo após criar a conta. Você pode pré-visualizar agora se quiser.
            </p>
          </Field>

          {cnpjError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              <span className="text-destructive">{cnpjError}</span>
            </div>
          )}

          {cnpjData && (
            <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" /> CNPJ ATIVO na Receita Federal
              </div>
              <div className="grid gap-1 text-foreground/90">
                <div><span className="text-muted-foreground">Razão social: </span>{cnpjData.razao_social}</div>
                {cnpjData.nome_fantasia && (
                  <div><span className="text-muted-foreground">Nome fantasia: </span>{cnpjData.nome_fantasia}</div>
                )}
                <div><span className="text-muted-foreground">Atividade ({cnpjData.cnae_codigo}): </span>{cnpjData.cnae_descricao}</div>
                <div><span className="text-muted-foreground">Endereço: </span>{formatAddress(cnpjData)}</div>
              </div>
              {!cnpjData.is_health && (
                <p className="text-xs text-amber-700">
                  ⚠ O CNAE principal não é da área da saúde. O cadastro pode continuar, mas sua rede pode passar por análise extra.
                </p>
              )}
            </div>
          )}

          <Field label="Nome da rede (como aparece na plataforma)" htmlFor="network_name">
            <Input id="network_name" value={state.network_name}
              onChange={(e) => set("network_name", e.target.value)}
              placeholder="Ex.: Rede Saúde São Paulo" />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
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
