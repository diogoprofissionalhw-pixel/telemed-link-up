import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Building2, Camera, FileText, Stethoscope, Upload, Trash2, ExternalLink, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DoctorPortfolio } from "@/components/doctor-portfolio";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { user, profile, refreshProfile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";

  return (
    <DashboardLayout
      title={isDoctor ? "Perfil do médico" : "Perfil da rede"}
      subtitle="Mantenha suas informações atualizadas para ser encontrado mais facilmente."
      breadcrumbs={[{ label: "Perfil" }]}
    >
      {user && profile && (
        isDoctor ? (
          <DoctorProfileForm userId={user.id} fullName={profile.full_name} onSaved={refreshProfile} />
        ) : (
          <NetworkProfileForm userId={user.id} fullName={profile.full_name} onSaved={refreshProfile} />
        )
      )}
    </DashboardLayout>
  );
}

/* ----------------- AVATAR UPLOADER ----------------- */
function AvatarUploader({
  userId, url, fallback, icon: Icon, onChange,
}: {
  userId: string;
  url: string | null;
  fallback: string;
  icon: React.ComponentType<{ className?: string }>;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > 3 * 1024 * 1024) return toast.error("Imagem muito grande (máx 3MB)");
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { setBusy(false); return toast.error(error.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(pub.publicUrl);
    setBusy(false);
    toast.success("Foto atualizada!");
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 border-2 border-border">
        {url && <AvatarImage src={url} alt="Foto de perfil" />}
        <AvatarFallback className="bg-accent">
          {fallback ? fallback.charAt(0).toUpperCase() : <Icon className="h-8 w-8 text-primary" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy} className="gap-2">
          <Camera className="h-4 w-4" /> {busy ? "Enviando..." : url ? "Trocar foto" : "Adicionar foto"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}

/* ----------------- CV UPLOADER ----------------- */
function CvUploader({
  userId, url, onChange,
}: { userId: string; url: string | null; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (file.type !== "application/pdf") return toast.error("Envie um arquivo PDF");
    if (file.size > 10 * 1024 * 1024) return toast.error("PDF muito grande (máx 10MB)");
    setBusy(true);
    const path = `${userId}/cv-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (error) { setBusy(false); return toast.error(error.message); }
    const { data: pub } = supabase.storage.from("cvs").getPublicUrl(path);
    onChange(pub.publicUrl);
    setBusy(false);
    toast.success("Currículo PDF enviado!");
  };

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">Currículo em PDF (opcional)</p>
          <p className="text-xs text-muted-foreground">Anexe seu CV completo para que as redes possam visualizar.</p>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <ExternalLink className="h-3 w-3" /> Ver PDF atual
            </a>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy} className="gap-2">
          <Upload className="h-4 w-4" /> {busy ? "Enviando..." : url ? "Trocar PDF" : "Enviar PDF"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}

/* ----------------- DOCTOR PROFILE FORM ----------------- */
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function validateCrmFormat(crm: string, uf: string): boolean {
  return /^[0-9]{4,7}$/.test(crm.trim()) && /^[A-Z]{2}$/.test(uf.trim().toUpperCase());
}

function CrmStatusBadge({ status }: { status: "verified" | "pending" | "invalid" }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium" style={{ color: "oklch(0.40 0.14 150)" }}>
        <ShieldCheck className="h-3.5 w-3.5" /> CRM verificado
      </span>
    );
  }
  if (status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium" style={{ color: "oklch(0.50 0.20 25)" }}>
        <ShieldAlert className="h-3.5 w-3.5" /> CRM inválido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium" style={{ color: "oklch(0.45 0.12 60)" }}>
      <ShieldQuestion className="h-3.5 w-3.5" /> Em análise
    </span>
  );
}

function DoctorProfileForm({ userId, fullName, onSaved }: { userId: string; fullName: string; onSaved: () => void }) {
  const [name, setName] = useState(fullName);
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [education, setEducation] = useState("");
  const [certs, setCerts] = useState("");
  const [langs, setLangs] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cv, setCv] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Brasil");
  const [crm, setCrm] = useState("");
  const [crmUf, setCrmUf] = useState("");
  const [crmStatus, setCrmStatus] = useState<"verified" | "pending" | "invalid">("pending");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("doctors")
        .select("specialty, crm, crm_uf, crm_status, bio, years_experience, education, certifications, languages, avatar_url, cv_pdf_url, cpf, email, city, state, country")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setSpecialty(data.specialty ?? "");
        setCrm(data.crm ?? "");
        setCrmUf(data.crm_uf ?? "");
        setCrmStatus(((data as any).crm_status ?? "pending") as "verified" | "pending" | "invalid");
        setBio(data.bio ?? "");
        setYears(data.years_experience?.toString() ?? "");
        setEducation(data.education ?? "");
        setCerts(data.certifications ?? "");
        setLangs(data.languages ?? "");
        setAvatar(data.avatar_url ?? null);
        setCv(data.cv_pdf_url ?? null);
        setCpf(data.cpf ?? "");
        setEmail(data.email ?? "");
        setCity(data.city ?? "");
        setState(data.state ?? "");
        setCountry(data.country ?? "Brasil");
      }
      setLoading(false);
    })();
  }, [userId]);

  const crmFormatOk = validateCrmFormat(crm, crmUf);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe seu nome");
    if (!specialty.trim()) return toast.error("Informe sua especialidade");
    if (!crmFormatOk) return toast.error("CRM inválido — use 4 a 7 dígitos e UF com 2 letras");
    setSaving(true);
    const yearsNum = years.trim() ? parseInt(years, 10) : null;

    const [{ error: pErr }, { error: dErr }] = await Promise.all([
      supabase.from("profiles").update({ full_name: name.trim() }).eq("id", userId),
      supabase.from("doctors").update({
        specialty: specialty.trim(),
        crm: crm.trim(),
        crm_uf: crmUf.trim().toUpperCase(),
        bio: bio.trim() || null,
        years_experience: yearsNum && !isNaN(yearsNum) ? yearsNum : null,
        education: education.trim() || null,
        certifications: certs.trim() || null,
        languages: langs.trim() || null,
        avatar_url: avatar,
        cv_pdf_url: cv,
        cpf: cpf.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        state: state.trim().toUpperCase() || null,
        country: country.trim() || null,
      }).eq("id", userId),
    ]);
    if (pErr || dErr) { setSaving(false); return toast.error((pErr ?? dErr)!.message); }

    // Reler status atualizado pelo trigger
    const { data: updated } = await supabase.from("doctors").select("crm_status").eq("id", userId).maybeSingle();
    if (updated) setCrmStatus(((updated as any).crm_status ?? "pending") as "verified" | "pending" | "invalid");
    setSaving(false);
    toast.success("Perfil atualizado!");
    onSaved();
  };

  if (loading) return <p className="text-muted-foreground">Carregando perfil...</p>;

  return (
    <form onSubmit={save} className="space-y-6 rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <AvatarUploader userId={userId} url={avatar} fallback={name} icon={Stethoscope} onChange={setAvatar} />
        <CrmStatusBadge status={crmStatus} />
      </div>

      <div>
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label htmlFor="spec">Especialidade *</Label>
          <Input id="spec" value={specialty} maxLength={80} onChange={e => setSpecialty(e.target.value)} placeholder="Ex: Cardiologia" required />
        </div>
        <div>
          <Label htmlFor="crm">CRM *</Label>
          <Input
            id="crm"
            value={crm}
            maxLength={7}
            onChange={(e) => setCrm(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
            aria-invalid={crm.length > 0 && !/^[0-9]{4,7}$/.test(crm)}
          />
        </div>
        <div>
          <Label htmlFor="crmuf">UF do CRM *</Label>
          <select
            id="crmuf"
            value={crmUf}
            onChange={(e) => setCrmUf(e.target.value)}
            required
            className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">UF</option>
            {UFS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      {!crmFormatOk && (crm || crmUf) && (
        <p className="text-xs text-destructive -mt-3">
          Formato inválido. CRM deve conter 4 a 7 dígitos e UF deve ser uma sigla de 2 letras.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input id="cpf" value={cpf} maxLength={14} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
        </div>
        <div>
          <Label htmlFor="emailp">E-mail</Label>
          <Input id="emailp" type="email" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="state">Estado (UF)</Label>
          <Input id="state" value={state} maxLength={2} onChange={(e) => setState(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <Label htmlFor="country">País</Label>
          <Input id="country" value={country} maxLength={60} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="years">Anos de experiência</Label>
          <Input id="years" type="number" min={0} max={70} value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lang">Idiomas</Label>
          <Input id="lang" value={langs} maxLength={200} onChange={(e) => setLangs(e.target.value)} placeholder="Português, Inglês..." />
        </div>
      </div>

      <div>
        <Label htmlFor="edu">Formação</Label>
        <Textarea id="edu" value={education} maxLength={500} onChange={(e) => setEducation(e.target.value)} placeholder="Faculdade, residência..." />
      </div>

      <div>
        <Label htmlFor="cert">Certificações</Label>
        <Textarea id="cert" value={certs} maxLength={500} onChange={(e) => setCerts(e.target.value)} placeholder="Cursos e títulos relevantes" />
      </div>

      <div>
        <Label htmlFor="bio">Sobre mim</Label>
        <Textarea id="bio" value={bio} maxLength={1000} onChange={(e) => setBio(e.target.value)} placeholder="Breve resumo profissional" />
      </div>

      <CvUploader userId={userId} url={cv} onChange={setCv} />

      {crmStatus === "invalid" && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          Seu CRM está marcado como inválido. Enquanto isso, você não aparece nas buscas nem recebe convites.
          Corrija os dados acima para reativar seu perfil.
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Salvando..." : "Salvar perfil"}
      </Button>

      <div className="border-t pt-6">
        <h2 className="mb-4 text-lg font-semibold">Portfólio profissional</h2>
        <p className="mb-4 text-sm text-muted-foreground">Certificações, cursos, publicações e histórico de plantões na plataforma.</p>
        <DoctorPortfolio doctorId={userId} editable />
      </div>
    </form>
  );
}

/* ----------------- NETWORK PROFILE FORM ----------------- */
function NetworkProfileForm({ userId, fullName, onSaved }: { userId: string; fullName: string; onSaved: () => void }) {
  const [name, setName] = useState(fullName);
  const [networkName, setNetworkName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("networks")
        .select("network_name, cnpj, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setNetworkName(data.network_name ?? "");
        setCnpj(data.cnpj ?? "");
        setAvatar(data.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, [userId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !networkName.trim()) return toast.error("Preencha os campos obrigatórios");
    setSaving(true);
    const [{ error: pErr }, { error: nErr }] = await Promise.all([
      supabase.from("profiles").update({ full_name: name.trim() }).eq("id", userId),
      supabase.from("networks").update({
        network_name: networkName.trim(),
        cnpj: cnpj.trim(),
        avatar_url: avatar,
      }).eq("id", userId),
    ]);
    setSaving(false);
    if (pErr || nErr) return toast.error((pErr ?? nErr)!.message);
    toast.success("Perfil atualizado!");
    onSaved();
  };

  if (loading) return <p className="text-muted-foreground">Carregando perfil...</p>;

  return (
    <form onSubmit={save} className="space-y-6 rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <AvatarUploader userId={userId} url={avatar} fallback={networkName || name} icon={Building2} onChange={setAvatar} />

      <div>
        <Label htmlFor="name">Nome do responsável</Label>
        <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <Label htmlFor="net">Nome da rede</Label>
        <Input id="net" value={networkName} maxLength={120} onChange={(e) => setNetworkName(e.target.value)} required />
      </div>

      <div>
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input id="cnpj" value={cnpj} maxLength={20} onChange={(e) => setCnpj(e.target.value)} />
      </div>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  );
}
