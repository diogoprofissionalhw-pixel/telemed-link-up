import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Building2, Camera, FileText, Stethoscope, Upload, Trash2, ExternalLink,
  ShieldCheck, ShieldAlert, ShieldQuestion, CheckCircle2, AlertCircle,
  DollarSign, Clock, Award, User, Phone, Briefcase, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DoctorPortfolio } from "@/components/doctor-portfolio";
import { DoctorExperiences } from "@/components/doctor-experiences";
import {
  isValidCPF, isValidEmail, isValidPhone, maskCPF, maskPhone, onlyDigits,
} from "@/lib/validators";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { user, profile, refreshProfile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";

  return (
    <DashboardLayout
      title={isDoctor ? "Criar Meu Perfil Profissional" : "Perfil da rede"}
      subtitle={isDoctor
        ? "Preencha suas informações para ser encontrado pelas redes de telemedicina."
        : "Mantenha suas informações atualizadas."}
      breadcrumbs={[{ label: "Perfil" }]}
      actions={
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao dashboard
          </Button>
        </Link>
      }
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

/* ============== AVATAR UPLOADER ============== */
function AvatarUploader({
  userId, url, fallback, icon: Icon, onChange,
}: {
  userId: string; url: string | null; fallback: string;
  icon: React.ComponentType<{ className?: string }>; onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máx 5MB)");
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
      <Avatar className="h-20 w-20 border-2 border-primary">
        {url && <AvatarImage src={url} alt="Foto de perfil" />}
        <AvatarFallback className="bg-accent">
          {fallback ? fallback.charAt(0).toUpperCase() : <Icon className="h-8 w-8 text-primary" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
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

/* ============== PDF/DOC UPLOADER (private bucket) ============== */
function PdfUploader({
  userId, bucket, url, label, hint, onChange,
}: {
  userId: string; bucket: "cvs" | "documents"; url: string | null;
  label: string; hint: string; onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isPrivate = bucket === "documents";

  const upload = async (file: File) => {
    const ok = ["application/pdf", "image/jpeg", "image/png"].includes(file.type);
    if (!ok) return toast.error("Formato inválido. Use PDF, JPG ou PNG");
    if (file.size > 5 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 5MB)");
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${userId}/${bucket}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (isPrivate) {
      onChange(path);
    } else {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(pub.publicUrl);
    }
    setBusy(false);
    toast.success("Documento enviado!");
  };

  const openPrivate = async () => {
    if (!url) return;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(url, 60);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="rounded-lg border-2 border-border bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
          {url && (
            isPrivate ? (
              <button type="button" onClick={openPrivate} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Abrir arquivo
              </button>
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver atual
              </a>
            )
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy} className="gap-2">
          <Upload className="h-3.5 w-3.5" /> {busy ? "Enviando..." : url ? "Trocar" : "Enviar"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="gap-1 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}

/* ============== DOCTOR FORM ============== */
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const SPECIALTY_OPTIONS = [
  "Alergia e Imunologia",
  "Anestesiologia",
  "Angiologia",
  "Cardiologia",
  "Cirurgia Bariátrica",
  "Cirurgia Cardiovascular",
  "Cirurgia da Mão",
  "Cirurgia de Cabeça e Pescoço",
  "Cirurgia do Aparelho Digestivo",
  "Cirurgia Geral",
  "Cirurgia Oncológica",
  "Cirurgia Pediátrica",
  "Cirurgia Plástica",
  "Cirurgia Torácica",
  "Cirurgia Vascular",
  "Clínica Médica (Medicina Interna)",
  "Coloproctologia",
  "Dermatologia",
  "Endocrinologia e Metabologia",
  "Endoscopia Digestiva",
  "Gastroenterologia",
  "Geriatria",
  "Ginecologia e Obstetrícia",
  "Hematologia e Hemoterapia",
  "Homeopatia",
  "Infectologia",
  "Mastologia",
  "Medicina de Família e Comunidade",
  "Medicina do Trabalho",
  "Medicina do Tráfego",
  "Medicina Esportiva",
  "Medicina Física e Reabilitação",
  "Medicina Intensiva",
  "Medicina Legal e Perícia Médica",
  "Medicina Nuclear",
  "Nefrologia",
  "Neurocirurgia",
  "Neurologia",
  "Nutrologia",
  "Oftalmologia",
  "Oncologia Clínica",
  "Ortopedia e Traumatologia",
  "Otorrinolaringologia",
  "Patologia",
  "Patologia Clínica/Medicina Laboratorial",
  "Pediatria",
  "Pneumologia",
  "Psiquiatria",
  "Radiologia e Diagnóstico por Imagem",
  "Radioterapia",
  "Reumatologia",
  "Tocoginecologia",
  "Urologia",
];

const WEEKDAYS = [
  { v: 1, label: "Seg" }, { v: 2, label: "Ter" }, { v: 3, label: "Qua" },
  { v: 4, label: "Qui" }, { v: 5, label: "Sex" }, { v: 6, label: "Sáb" }, { v: 0, label: "Dom" },
];

const TIMEZONES = [
  "America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Fortaleza",
  "America/Recife", "America/Bahia", "America/Campo_Grande", "America/Cuiaba",
  "America/Boa_Vista", "America/Porto_Velho", "America/Rio_Branco",
];

function validateCrmFormat(crm: string, uf: string): boolean {
  return /^[0-9]{4,7}$/.test(crm.trim()) && /^[A-Z]{2}$/.test(uf.trim().toUpperCase());
}

function CrmStatusBadge({ status }: { status: "verified" | "pending" | "invalid" }) {
  if (status === "verified") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success-foreground" style={{ color: "oklch(0.40 0.14 150)" }}>
      <ShieldCheck className="h-3.5 w-3.5" /> CRM verificado
    </span>;
  }
  if (status === "invalid") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium" style={{ color: "oklch(0.50 0.20 25)" }}>
      <ShieldAlert className="h-3.5 w-3.5" /> CRM inválido
    </span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium" style={{ color: "oklch(0.45 0.12 60)" }}>
    <ShieldQuestion className="h-3.5 w-3.5" /> Em análise
  </span>;
}

/** Card com borda destacada (verde escuro / primary) */
function SectionCard({ title, icon: Icon, children }: {
  title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-primary/70 bg-card p-5 sm:p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function DoctorProfileForm({ userId, fullName, onSaved }: { userId: string; fullName: string; onSaved: () => void }) {
  // Básicos
  const [name, setName] = useState(fullName);
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [education, setEducation] = useState("");
  const [langs, setLangs] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cv, setCv] = useState<string | null>(null);
  const [diploma, setDiploma] = useState<string | null>(null);
  const [crmDoc, setCrmDoc] = useState<string | null>(null);
  // Identidade
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  // Contato
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  // Localização
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Brasil");
  // CRM e especialidade
  const [crm, setCrm] = useState("");
  const [crmUf, setCrmUf] = useState("");
  const [crmStatus, setCrmStatus] = useState<"verified" | "pending" | "invalid">("pending");
  const [specialty, setSpecialty] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  // Pagamento
  const [fee, setFee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  // Disponibilidade
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: doc }, { data: avail }] = await Promise.all([
        supabase.from("doctors").select("*").eq("id", userId).maybeSingle(),
        supabase.from("doctor_weekly_availability").select("*").eq("doctor_id", userId).maybeSingle(),
      ]);
      if (doc) {
        const d = doc as any;
        setSpecialty(d.specialty ?? "");
        setSpecialties(Array.isArray(d.specialties) ? d.specialties : []);
        setCrm(d.crm ?? ""); setCrmUf(d.crm_uf ?? "");
        setCrmStatus((d.crm_status ?? "pending") as any);
        setBio(d.bio ?? "");
        setYears(d.years_experience?.toString() ?? "");
        setEducation(d.education ?? "");
        setLangs(d.languages ?? "");
        setAvatar(d.avatar_url ?? null);
        setCv(d.cv_pdf_url ?? null);
        setDiploma(d.diploma_url ?? null);
        setCrmDoc(d.crm_document_url ?? null);
        setCpf(d.cpf ? maskCPF(d.cpf) : "");
        setEmail(d.email ?? "");
        setPhone(d.phone ? maskPhone(d.phone) : "");
        setWhatsapp(d.whatsapp ? maskPhone(d.whatsapp) : "");
        setCity(d.city ?? ""); setState(d.state ?? ""); setCountry(d.country ?? "Brasil");
        setFee(d.consultation_fee?.toString() ?? "");
        setPaymentMethod(d.payment_method ?? "");
        setPixKey(d.pix_key ?? "");
        setBankName(d.bank_name ?? ""); setBankAgency(d.bank_agency ?? ""); setBankAccount(d.bank_account ?? "");
      }
      if (avail) {
        const a = avail as any;
        setWeekdays(Array.isArray(a.weekdays) ? a.weekdays : []);
        setStartTime((a.start_time ?? "08:00").slice(0, 5));
        setEndTime((a.end_time ?? "18:00").slice(0, 5));
        setTimezone(a.timezone ?? "America/Sao_Paulo");
      }
      setLoading(false);
    })();
  }, [userId]);

  const crmFormatOk = validateCrmFormat(crm, crmUf);

  // ---- Validações para card de checklist ----
  const checklist = useMemo(() => ([
    { label: "Foto de perfil", ok: !!avatar },
    { label: "Nome completo", ok: name.trim().length >= 2 },
    { label: "Pelo menos 1 especialidade", ok: specialties.length >= 1 },
    { label: "E-mail válido", ok: isValidEmail(email) },
    { label: "Telefone válido", ok: isValidPhone(phone) },
    { label: "CRM válido", ok: crmFormatOk },
    { label: "Descrição (mín. 50)", ok: bio.trim().length >= 50 },
    { label: "Taxa de consulta", ok: !!fee && parseFloat(fee) > 0 },
  ]), [avatar, name, specialties, email, phone, crmFormatOk, bio, fee]);
  const completion = Math.round((checklist.filter(c => c.ok).length / checklist.length) * 100);

  const toggleSpecialty = (s: string) => {
    setSpecialties((cur) => {
      if (cur.includes(s)) return cur.filter(x => x !== s);
      if (cur.length >= 10) { toast.error("Máximo 10 especialidades"); return cur; }
      return [...cur, s];
    });
  };

  const toggleWeekday = (d: number) => {
    setWeekdays((cur) => cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe seu nome");
    if (specialties.length === 0) return toast.error("Selecione pelo menos uma especialidade");
    if (!crmFormatOk) return toast.error("CRM inválido — use 4 a 7 dígitos e UF de 2 letras");
    if (email && !isValidEmail(email)) return toast.error("E-mail inválido");
    if (phone && !isValidPhone(phone)) return toast.error("Telefone inválido");
    if (whatsapp && !isValidPhone(whatsapp)) return toast.error("WhatsApp inválido");
    if (cpf && !isValidCPF(cpf)) return toast.error("CPF inválido");
    if (fee && parseFloat(fee) <= 0) return toast.error("Taxa de consulta deve ser maior que 0");

    setSaving(true);
    const yearsNum = years.trim() ? parseInt(years, 10) : null;
    const feeNum = fee.trim() ? parseFloat(fee) : null;

    const { error: pErr } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", userId);
    if (pErr) { setSaving(false); return toast.error(pErr.message); }

    const { error: dErr } = await supabase.from("doctors").update({
      specialty: specialties[0] ?? null,
      specialties,
      crm: crm.trim(),
      crm_uf: crmUf.trim().toUpperCase(),
      bio: bio.trim() || null,
      years_experience: yearsNum && !isNaN(yearsNum) ? yearsNum : null,
      education: education.trim() || null,
      languages: langs.trim() || null,
      avatar_url: avatar,
      cv_pdf_url: cv,
      diploma_url: diploma,
      crm_document_url: crmDoc,
      cpf: cpf ? onlyDigits(cpf) : null,
      email: email.trim() || null,
      phone: phone ? onlyDigits(phone) : null,
      whatsapp: whatsapp ? onlyDigits(whatsapp) : null,
      city: city.trim() || null,
      state: state.trim().toUpperCase() || null,
      country: country.trim() || null,
      consultation_fee: feeNum,
      payment_method: paymentMethod || null,
      pix_key: pixKey.trim() || null,
      bank_name: bankName.trim() || null,
      bank_agency: bankAgency.trim() || null,
      bank_account: bankAccount.trim() || null,
      timezone,
    }).eq("id", userId);
    if (dErr) { setSaving(false); return toast.error(dErr.message); }

    const { error: aErr } = await supabase.from("doctor_weekly_availability").upsert({
      doctor_id: userId,
      weekdays,
      start_time: startTime,
      end_time: endTime,
      timezone,
      updated_at: new Date().toISOString(),
    }, { onConflict: "doctor_id" });
    if (aErr) { setSaving(false); return toast.error(aErr.message); }

    const { data: updated } = await supabase.from("doctors").select("crm_status").eq("id", userId).maybeSingle();
    if (updated) setCrmStatus(((updated as any).crm_status ?? "pending") as any);
    setSaving(false);
    toast.success("Perfil salvo com sucesso!");
    onSaved();
  };

  if (loading) return <p className="text-muted-foreground">Carregando perfil...</p>;

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
      {/* ====== Coluna esquerda ====== */}
      <div className="lg:col-span-2 space-y-6">

        <SectionCard title="Informações Básicas" icon={User}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <AvatarUploader userId={userId} url={avatar} fallback={name} icon={Stethoscope} onChange={setAvatar} />
            <CrmStatusBadge status={crmStatus} />
          </div>
          <div>
            <Label htmlFor="name">Nome completo *</Label>
            <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Ex: Dr. Carlos Silva" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="crm">CRM *</Label>
              <Input id="crm" value={crm} maxLength={7} onChange={(e) => setCrm(e.target.value.replace(/\D/g, ""))} placeholder="123456" required />
            </div>
            <div>
              <Label htmlFor="crmuf">UF do CRM *</Label>
              <select id="crmuf" value={crmUf} onChange={(e) => setCrmUf(e.target.value)} required
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm">
                <option value="">UF</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          {!crmFormatOk && (crm || crmUf) && (
            <p className="text-xs text-destructive">Formato inválido. CRM com 4 a 7 dígitos e UF de 2 letras.</p>
          )}
          <div>
            <Label htmlFor="bio">Descrição profissional * <span className="text-xs text-muted-foreground">(mín. 50, máx. 1000)</span></Label>
            <Textarea id="bio" value={bio} maxLength={1000} rows={4}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre sua experiência e abordagem profissional..." />
            <p className="mt-1 text-xs text-muted-foreground">{bio.length}/1000</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="city">Localização (cidade)</Label>
              <Input id="city" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" />
            </div>
            <div>
              <Label htmlFor="state">UF</Label>
              <select id="state" value={state} onChange={(e) => setState(e.target.value)}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm">
                <option value="">UF</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" value={cpf} maxLength={14} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
              {cpf && !isValidCPF(cpf) && <p className="mt-1 text-xs text-destructive">CPF inválido</p>}
            </div>
            <div>
              <Label htmlFor="years">Anos de experiência</Label>
              <Input id="years" type="number" min={0} max={70} value={years} onChange={(e) => setYears(e.target.value)} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Contato" icon={Phone}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" value={email} maxLength={120}
                onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
              {email && !isValidEmail(email) && <p className="mt-1 text-xs text-destructive">E-mail inválido</p>}
            </div>
            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input id="phone" inputMode="tel" value={phone} placeholder="(11) 99999-9999"
                onChange={(e) => setPhone(maskPhone(e.target.value))} />
              {phone && !isValidPhone(phone) && <p className="mt-1 text-xs text-destructive">Telefone inválido</p>}
            </div>
            <div>
              <Label htmlFor="wpp">WhatsApp (opcional)</Label>
              <Input id="wpp" inputMode="tel" value={whatsapp} placeholder="(11) 99999-9999"
                onChange={(e) => setWhatsapp(maskPhone(e.target.value))} />
              {whatsapp && !isValidPhone(whatsapp) && <p className="mt-1 text-xs text-destructive">WhatsApp inválido</p>}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Especialidades" icon={Stethoscope}>
          <p className="text-sm text-muted-foreground">Selecione suas especialidades de atuação (até 10).</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((s) => {
              const active = specialties.includes(s);
              return (
                <button type="button" key={s} onClick={() => toggleSpecialty(s)}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "border-primary bg-primary text-primary-foreground"
                           : "border-border bg-background hover:bg-accent"
                  }`}>
                  {s}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">{specialties.length} selecionada(s)</div>
        </SectionCard>

        <SectionCard title="Experiência Profissional" icon={Briefcase}>
          <DoctorExperiences doctorId={userId} editable />
        </SectionCard>

        <SectionCard title="Certificações & Formação" icon={Award}>
          <div>
            <Label htmlFor="edu">Formação acadêmica</Label>
            <Textarea id="edu" value={education} maxLength={500} rows={2}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="Faculdade, residência, pós-graduação..." />
          </div>
          <div>
            <Label htmlFor="lang">Idiomas</Label>
            <Input id="lang" value={langs} maxLength={200} onChange={(e) => setLangs(e.target.value)} placeholder="Português, Inglês, Espanhol..." />
          </div>
          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium">Portfólio (certificações, cursos e publicações)</p>
            <DoctorPortfolio doctorId={userId} editable />
          </div>
        </SectionCard>

        <SectionCard title="Disponibilidade" icon={Clock}>
          <div>
            <Label>Dias da semana</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const active = weekdays.includes(d.v);
                return (
                  <button type="button" key={d.v} onClick={() => toggleWeekday(d.v)}
                    className={`h-10 w-12 rounded-md border-2 text-sm font-semibold transition-colors ${
                      active ? "border-primary bg-primary text-primary-foreground"
                             : "border-border bg-background hover:bg-accent"
                    }`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="st">Horário início</Label>
              <Input id="st" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="et">Horário fim</Label>
              <Input id="et" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tz">Fuso horário</Label>
              <select id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Informações de Pagamento" icon={DollarSign}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fee">Taxa de consulta (R$) *</Label>
              <Input id="fee" type="number" min={0} step="0.01" value={fee}
                onChange={(e) => setFee(e.target.value)} placeholder="150.00" />
            </div>
            <div>
              <Label htmlFor="pm">Método de pagamento</Label>
              <select id="pm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione</option>
                <option value="pix">PIX</option>
                <option value="bank_transfer">Transferência Bancária</option>
                <option value="card">Cartão</option>
              </select>
            </div>
          </div>
          {paymentMethod === "pix" && (
            <div>
              <Label htmlFor="pix">Chave PIX</Label>
              <Input id="pix" value={pixKey} maxLength={120} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
          )}
          {paymentMethod === "bank_transfer" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label htmlFor="bn">Banco</Label>
                <Input id="bn" value={bankName} maxLength={60} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ba">Agência</Label>
                <Input id="ba" value={bankAgency} maxLength={20} onChange={(e) => setBankAgency(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bc">Conta</Label>
                <Input id="bc" value={bankAccount} maxLength={30} onChange={(e) => setBankAccount(e.target.value)} />
              </div>
            </div>
          )}
        </SectionCard>

        {crmStatus === "invalid" && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            Seu CRM está marcado como inválido. Você não aparece nas buscas nem recebe convites até corrigir os dados.
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg" className="w-full sm:w-auto">
            {saving ? "Salvando..." : "Salvar Perfil"}
          </Button>
        </div>
      </div>

      {/* ====== Coluna direita ====== */}
      <aside className="space-y-6">
        {/* Resumo */}
        <div className="rounded-2xl border-2 border-primary/70 bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumo do Perfil</h3>
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-primary">
              {avatar && <AvatarImage src={avatar} />}
              <AvatarFallback className="bg-accent">{(name || "M").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{name || "Seu nome"}</p>
              <p className="truncate text-sm text-muted-foreground">{specialty || "Especialidade"}</p>
              <p className="text-xs text-muted-foreground">⭐ Sem avaliações ainda</p>
            </div>
          </div>
          {specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {specialties.slice(0, 4).map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
              {specialties.length > 4 && <Badge variant="outline" className="text-xs">+{specialties.length - 4}</Badge>}
            </div>
          )}
          <div className="mt-4">
            <div className="flex justify-between text-xs">
              <span className="font-medium">Preenchimento</span>
              <span>{completion}%</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>

        {/* Validações */}
        <div className="rounded-2xl border-2 border-primary/70 bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Validações</h3>
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok
                  ? <CheckCircle2 className="h-4 w-4 text-success" style={{ color: "oklch(0.55 0.14 150)" }} />
                  : <AlertCircle className="h-4 w-4 text-destructive" />}
                <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Documentos */}
        <div className="rounded-2xl border-2 border-primary/70 bg-card p-5 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Documentos</h3>
          <PdfUploader userId={userId} bucket="documents" url={diploma}
            label="Diploma de medicina" hint="PDF, JPG ou PNG (máx 5MB) — privado" onChange={setDiploma} />
          <PdfUploader userId={userId} bucket="documents" url={crmDoc}
            label="Documento do CRM" hint="PDF, JPG ou PNG (máx 5MB) — privado" onChange={setCrmDoc} />
          <PdfUploader userId={userId} bucket="cvs" url={cv}
            label="Currículo (CV)" hint="PDF público para visualização das redes" onChange={setCv} />
          <p className="text-xs text-muted-foreground">
            Status de verificação: {crmStatus === "verified" ? "verificado" : crmStatus === "invalid" ? "inválido" : "em análise"}
          </p>
        </div>
      </aside>
    </form>
  );
}

/* ============== NETWORK FORM (inalterado) ============== */
function NetworkProfileForm({ userId, fullName, onSaved }: { userId: string; fullName: string; onSaved: () => void }) {
  const [name, setName] = useState(fullName);
  const [networkName, setNetworkName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("networks").select("network_name, cnpj, avatar_url").eq("id", userId).maybeSingle();
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
        network_name: networkName.trim(), cnpj: cnpj.trim(), avatar_url: avatar,
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
