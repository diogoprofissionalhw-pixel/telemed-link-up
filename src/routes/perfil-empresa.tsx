import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, BadgeCheck, ShieldCheck, Building2, Save, Linkedin, Globe } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isMasterUser } from "@/lib/master-access";
import { isValidCNPJ, maskCNPJ, onlyDigits } from "@/lib/validators";


export const Route = createFileRoute("/perfil-empresa")({
  head: () => ({
    meta: [
      { title: "Perfil da rede — Connect-Med" },
      { name: "description", content: "Gerencie o perfil da sua rede e valide o CNPJ para liberar perfis completos de médicos." },
    ],
  }),
  component: NetworkProfilePage,
});

function NetworkProfilePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [networkName, setNetworkName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [cnpjActivity, setCnpjActivity] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [qualificationStatus, setQualificationStatus] = useState<string | null>(null);
  const [qualifiedAt, setQualifiedAt] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");


  useEffect(() => {
    if (!authLoading && profile && profile.account_type !== "network") {
      navigate({ to: "/perfil" });
    }
  }, [authLoading, profile, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("networks").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setNetworkName(data.network_name ?? "");
        setCnpj(data.cnpj ? maskCNPJ(data.cnpj) : "");
        setIsVerified(!!(data as any).is_verified);
        setCnpjActivity((data as any).cnpj_activity ?? null);
        setVerifiedAt((data as any).cnpj_verified_at ?? null);
        setQualificationStatus((data as any).qualification_status ?? null);
        setQualifiedAt((data as any).qualified_at ?? null);
        setLinkedinUrl((data as any).linkedin_url ?? "");
        setWebsiteUrl((data as any).website_url ?? "");
        setDescription((data as any).description ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (networkName.trim().length < 2) return toast.error("Informe o nome da rede.");
    if (!isValidCNPJ(cnpj)) return toast.error("CNPJ inválido.");

    const linkedinTrim = linkedinUrl.trim();
    if (linkedinTrim && !/^https:\/\/(www\.)?linkedin\.com\//i.test(linkedinTrim)) {
      return toast.error("URL do LinkedIn inválida. Use https://www.linkedin.com/...");
    }
    const websiteTrim = websiteUrl.trim();
    if (websiteTrim && !/^https?:\/\//i.test(websiteTrim)) {
      return toast.error("URL do site inválida. Comece com https://");
    }
    if (description.length > 500) {
      return toast.error("A descrição deve ter no máximo 500 caracteres.");
    }

    setSaving(true);
    const { error } = await supabase.from("networks").update({
      network_name: networkName.trim(),
      cnpj: onlyDigits(cnpj),
      linkedin_url: linkedinTrim || null,
      website_url: websiteTrim || null,
      description: description.trim() || null,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Dados salvos.");
  };



  const handleVerifyCnpj = async () => {
    if (!user) return;
    if (!isValidCNPJ(cnpj)) return toast.error("CNPJ inválido. Salve antes de verificar.");
    setVerifying(true);
    // Simulação de consulta à Receita Federal
    await new Promise((r) => setTimeout(r, 1500));
    const activity = "Atividades de atendimento hospitalar (CNAE 86.10-1-01)";
    const verifiedAtIso = new Date().toISOString();
    const { error } = await supabase.from("networks").update({
      is_verified: true,
      cnpj_verified_at: verifiedAtIso,
      cnpj_activity: activity,
    } as any).eq("id", user.id);
    setVerifying(false);
    if (error) return toast.error(error.message);
    setIsVerified(true);
    setCnpjActivity(activity);
    setVerifiedAt(verifiedAtIso);
    toast.success("Rede verificada com sucesso!");
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-6 w-6 text-primary" /> Perfil da Rede
          </h1>
          <BackButton to="/dashboard" label="Voltar ao dashboard" />
        </div>

        {/* Qualification status (validação automática pós-cadastro) */}
        <section className="mb-6 rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <BadgeCheck className="h-5 w-5 text-primary" /> Qualificação da Rede
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Resultado da validação automática feita logo após o cadastro, com base na Receita Federal (BrasilAPI) e no CNAE.
              </p>
            </div>
            {qualificationStatus === "qualified" ? (
              <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <BadgeCheck className="h-4 w-4" /> Rede Qualificada
              </Badge>
            ) : qualificationStatus === "unqualified" ? (
              <Badge variant="secondary" className="bg-destructive/10 text-destructive hover:bg-destructive/10">
                Informações Não Qualificadas
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                Validação pendente
              </Badge>
            )}
          </div>
          {qualifiedAt && (
            <p className="mt-3 text-xs text-muted-foreground">
              Validado em {new Date(qualifiedAt).toLocaleString("pt-BR")}
            </p>
          )}
        </section>

        {/* Verification status */}
        <section className="mb-6 rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5 text-primary" /> Verificação de CNPJ
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A verificação simula a consulta à Receita Federal para confirmar atividade econômica em saúde.
                Apenas redes verificadas acessam perfis completos de médicos e iniciam conversas.
              </p>
            </div>
            {isVerified ? (
              <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                <BadgeCheck className="h-4 w-4" /> Rede Verificada
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                Não verificada
              </Badge>
            )}
          </div>

          {isVerified && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-medium text-emerald-900">{cnpjActivity}</p>
              {verifiedAt && (
                <p className="mt-0.5 text-xs text-emerald-700">
                  Verificada em {new Date(verifiedAt).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          )}

          {!isVerified && (
            <Button onClick={handleVerifyCnpj} disabled={verifying || !isValidCNPJ(cnpj)} className="mt-4 gap-1.5">
              {verifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</> : <><ShieldCheck className="h-4 w-4" /> Verificar agora</>}
            </Button>
          )}
        </section>

        {/* Editable data */}
        <section className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="mb-4 text-lg font-semibold">Dados da rede</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="network_name">Nome da rede</Label>
              <Input id="network_name" value={networkName} onChange={(e) => setNetworkName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00"
                value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} />
              {cnpj && !isValidCNPJ(cnpj) && <p className="mt-1 text-xs text-destructive">CNPJ inválido</p>}
            </div>
            <div>
              <Label htmlFor="linkedin_url" className="flex items-center gap-1.5">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn da empresa
              </Label>
              <Input
                id="linkedin_url"
                type="url"
                placeholder="https://www.linkedin.com/company/sua-empresa"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                maxLength={300}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Visível para médicos e visitantes — ajuda a comprovar a existência da empresa.
              </p>
            </div>
            <div>
              <Label htmlFor="website_url" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Site institucional
              </Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://suaempresa.com.br"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                maxLength={300}
              />
            </div>
            <div>
              <Label htmlFor="description">Sobre a rede (público)</Label>
              <Textarea
                id="description"
                placeholder="Conte brevemente o que a sua rede faz, especialidades atendidas, diferenciais..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="mt-1 text-xs text-muted-foreground">{description.length}/500 caracteres</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4" /> Salvar</>}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
