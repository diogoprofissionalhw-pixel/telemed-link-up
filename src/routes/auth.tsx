import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, Building2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site-header";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "signup" ? "signup" : "signin") as Mode,
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [accountType, setAccountType] = useState<"doctor" | "network">("doctor");
  const [tab, setTab] = useState<Mode>(mode);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setTab(mode); }, [mode]);
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
      full_name: fd.get("full_name"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.full_name,
          account_type: accountType,
        },
      },
    });
    if (error || !data.user) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Erro ao cadastrar");
    }

    // Inserir dados específicos
    const userId = data.user.id;
    if (accountType === "doctor") {
      const crm = String(fd.get("crm") ?? "").trim();
      const crm_uf = String(fd.get("crm_uf") ?? "").trim().toUpperCase();
      const specialty = String(fd.get("specialty") ?? "").trim();
      const cpf = String(fd.get("cpf") ?? "").trim();
      const city = String(fd.get("city") ?? "").trim();
      const state = String(fd.get("state") ?? "").trim().toUpperCase();
      const country = String(fd.get("country") ?? "").trim() || "Brasil";
      if (!crm || !crm_uf || !specialty || !cpf || !city || !state) {
        setSubmitting(false);
        return toast.error("Preencha todos os campos obrigatórios.");
      }
      const { error: docErr } = await supabase.from("doctors").insert({
        id: userId, crm, crm_uf, specialty, cpf, city, state, country,
        email: parsed.data.email,
      });
      if (docErr) { setSubmitting(false); return toast.error(docErr.message); }
    } else {
      const network_name = String(fd.get("network_name") ?? "").trim();
      const cnpj = String(fd.get("cnpj") ?? "").trim();
      if (!network_name || !cnpj) {
        setSubmitting(false);
        return toast.error("Preencha o nome da rede e CNPJ.");
      }
      const { error: netErr } = await supabase.from("networks").insert({
        id: userId, network_name, cnpj,
      });
      if (netErr) { setSubmitting(false); return toast.error(netErr.message); }
    }

    setSubmitting(false);
    toast.success("Conta criada!");
    navigate({ to: "/dashboard" });
  };

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
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email-in">Email</Label>
                  <Input id="email-in" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="pass-in">Senha</Label>
                  <Input id="pass-in" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <div className="mb-4 grid grid-cols-2 gap-2">
                {([
                  { v: "doctor", label: "Sou médico", icon: Stethoscope },
                  { v: "network", label: "Sou rede", icon: Building2 },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setAccountType(opt.v)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors ${
                      accountType === opt.v
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <opt.icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="name-up">Nome completo</Label>
                  <Input id="name-up" name="full_name" required maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="pass-up">Senha</Label>
                  <Input id="pass-up" name="password" type="password" required minLength={6} />
                </div>

                {accountType === "doctor" ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="crm">CRM</Label>
                      <Input id="crm" name="crm" required maxLength={20} />
                    </div>
                    <div>
                      <Label htmlFor="crm_uf">UF</Label>
                      <Input id="crm_uf" name="crm_uf" required maxLength={2} placeholder="SP" />
                    </div>
                    <div className="col-span-3">
                      <Label htmlFor="specialty">Especialidade</Label>
                      <Input id="specialty" name="specialty" required maxLength={80} placeholder="Clínica geral" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="network_name">Nome da rede</Label>
                      <Input id="network_name" name="network_name" required maxLength={120} />
                    </div>
                    <div>
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" name="cnpj" required maxLength={20} placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
