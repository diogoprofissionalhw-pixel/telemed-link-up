import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera, Trash2, Plus, Linkedin, Check, Upload,
  Loader2, ShieldCheck, ShieldAlert, FileText, Save, Star,
} from "lucide-react";
import { BackButton } from "@/components/back-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { isValidCPF, isValidEmail, isValidPhone, maskCPF, maskPhone, onlyDigits, UF_LIST } from "@/lib/validators";
import logo from "@/assets/connect-med-logo.webp";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Connect-Med" },
      { name: "description", content: "Atualize seus dados profissionais, especialidades, currículo e disponibilidade." },
      { property: "og:title", content: "Meu perfil — Connect-Med" },
      { property: "og:description", content: "Atualize seus dados profissionais, especialidades, currículo e disponibilidade." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PerfilPage,
});

/* ================== CONSTANTS ================== */

const SPECIALTIES = [
  "Alergia e Imunologia","Anestesiologia","Angiologia","Cardiologia",
  "Cirurgia Bariátrica","Cirurgia Cardiovascular","Cirurgia da Mão",
  "Cirurgia de Cabeça e Pescoço","Cirurgia do Aparelho Digestivo",
  "Cirurgia Geral","Cirurgia Oncológica","Cirurgia Pediátrica",
  "Cirurgia Plástica","Cirurgia Torácica","Cirurgia Vascular",
  "Clínica Médica","Coloproctologia","Dermatologia",
  "Endocrinologia e Metabologia","Endoscopia Digestiva","Gastroenterologia",
  "Geriatria","Ginecologia e Obstetrícia","Hematologia e Hemoterapia",
  "Homeopatia","Infectologia","Mastologia","Medicina de Família e Comunidade",
  "Medicina do Trabalho","Medicina do Tráfego","Medicina Esportiva",
  "Medicina Física e Reabilitação","Medicina Intensiva","Medicina Legal e Perícia",
  "Medicina Nuclear","Nefrologia","Neurocirurgia","Neurologia","Nutrologia",
  "Oftalmologia","Oncologia Clínica","Ortopedia e Traumatologia",
  "Otorrinolaringologia","Patologia","Patologia Clínica","Pediatria",
  "Pneumologia","Psiquiatria","Radiologia e Diagnóstico por Imagem",
  "Radioterapia","Reumatologia","Tocoginecologia","Urologia",
];

const WEEKDAYS = [
  { v: 1, label: "Seg" },{ v: 2, label: "Ter" },{ v: 3, label: "Qua" },
  { v: 4, label: "Qui" },{ v: 5, label: "Sex" },{ v: 6, label: "Sáb" },{ v: 0, label: "Dom" },
];

const TIMEZONES = [
  { v: "America/Sao_Paulo", label: "Brasília (UTC−3)" },
  { v: "America/Manaus", label: "Manaus (UTC−4)" },
  { v: "America/Rio_Branco", label: "Rio Branco (UTC−5)" },
];

const BANKS = ["Itaú","Bradesco","Santander","Caixa","Banco do Brasil","Nubank","Inter","Outro"];

/* ================== MOCK LINKEDIN DATA ================== */

const MOCK_LINKEDIN = {
  name: "Diogo Massaro",
  email: "diogo.massaro@email.com",
  picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diogo",
  location: "João Pessoa, PB, Brasil",
  state: "PB",
  city: "João Pessoa",
  headline: "Médico Clínico Geral | Especialista em Telemedicina",
  yearsExperience: 12,
  education: "USP — Medicina (2010-2015)\nResidência em Clínica Médica — UNIFESP (2016-2018)\nEspecialização em Telemedicina — AMIB (2022)",
  languages: "Português, Inglês, Espanhol",
  experiences: [
    { role: "Médico Clínico", institution: "Hospital do Trauma", start_date: "2018-01-01", end_date: "", description: "Atendimento clínico em pronto-socorro e enfermaria." },
    { role: "Médico Plantonista", institution: "Hospital São Lucas", start_date: "2015-06-01", end_date: "2017-12-01", description: "Plantões clínicos em UTI." },
  ],
  certifications: [
    { title: "Certificação em Telemedicina", issuer: "AMIB", issued_year: 2023 },
    { title: "ACLS — Advanced Cardiac Life Support", issuer: "AHA", issued_year: 2022 },
  ],
  courses: [
    { title: "Curso de Telemedicina Avançada", institution: "AMIB", hours: 80, completed_year: 2023 },
  ],
  publications: [
    { title: "Diagnóstico clínico em telemedicina: revisão", journal: "Revista Brasileira de Medicina", year: 2023, url: "" },
  ],
};

type Experience = { id?: string; role: string; institution: string; start_date: string; end_date: string; description: string };
type Certification = { id?: string; title: string; issuer: string; issued_year: number | "" };
type Course = { id?: string; title: string; institution: string; hours: number | ""; completed_year: number | "" };
type Publication = { id?: string; title: string; journal: string; year: number | ""; url: string };

/* ================== PAGE ================== */

function PerfilPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.account_type !== "doctor") {
      navigate({ to: "/perfil-empresa" });
    }
  }, [profile, navigate]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-emerald-50/30">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (profile.account_type !== "doctor") return null;

  return <DoctorRegistration userId={user.id} fullName={profile.full_name} email={user.email ?? ""} onSaved={refreshProfile} />;
}

/* ================== HEADER ================== */

function PageHeader() {
  return (
    <header className="border-b bg-white sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center" aria-label="Connect-Med">
          <img src={logo} alt="Connect-Med" className="h-10 w-auto object-contain" />
        </Link>
        <BackButton to="/dashboard" label="Voltar ao dashboard" />
      </div>
    </header>
  );
}

/* ================== MAIN FORM ================== */

function DoctorRegistration({
  userId, fullName, email, onSaved,
}: { userId: string; fullName: string; email: string; onSaved: () => void }) {
  // Section state
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Basic
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState(fullName);
  const [emailVal, setEmailVal] = useState(email);
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [headline, setHeadline] = useState("");

  // Medical
  const [crm, setCrm] = useState("");
  const [crmUf, setCrmUf] = useState("");
  const [cpf, setCpf] = useState("");
  const [primarySpecialty, setPrimarySpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExp, setYearsExp] = useState<number | "">("");
  const [extraSpecs, setExtraSpecs] = useState<string[]>([]);
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  // Contact
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Education / languages
  const [education, setEducation] = useState("");
  const [languages, setLanguages] = useState("");

  // Dynamic lists
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);

  // Availability
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");

  // Payment
  const [fee, setFee] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountDigit, setBankAccountDigit] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [pixKey, setPixKey] = useState("");

  // Documents
  const [diplomaUrl, setDiplomaUrl] = useState<string | null>(null);
  const [crmDocUrl, setCrmDocUrl] = useState<string | null>(null);
  const [rgUrl, setRgUrl] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);

  /* ---------- Load existing data ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: doc }, { data: exps }, { data: certs }, { data: crs }, { data: pubs }, { data: avail }] = await Promise.all([
        supabase.from("doctors").select("*").eq("id", userId).maybeSingle(),
        supabase.from("doctor_experiences").select("*").eq("doctor_id", userId).order("start_date", { ascending: false }),
        supabase.from("doctor_certifications").select("*").eq("doctor_id", userId),
        supabase.from("doctor_courses").select("*").eq("doctor_id", userId),
        supabase.from("doctor_publications").select("*").eq("doctor_id", userId),
        supabase.from("doctor_weekly_availability").select("*").eq("doctor_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (doc) {
        setAvatarUrl(doc.avatar_url);
        setEmailVal(doc.email ?? email);
        setHeadline((doc as any).headline ?? "");
        setCity(doc.city ?? "");
        setState(doc.state ?? "");
        setLocation([doc.city, doc.state, doc.country].filter(Boolean).join(", "));
        setCrm(doc.crm ?? "");
        setCrmUf(doc.crm_uf ?? "");
        setCpf(doc.cpf ? maskCPF(doc.cpf) : "");
        setPrimarySpecialty(doc.specialty ?? "");
        setBio(doc.bio ?? "");
        setYearsExp(doc.years_experience ?? "");
        setExtraSpecs(doc.specialties ?? []);
        setPhone(doc.phone ? maskPhone(doc.phone) : "");
        setWhatsapp(doc.whatsapp ? maskPhone(doc.whatsapp) : "");
        setEducation(doc.education ?? "");
        setLanguages(doc.languages ?? "");
        setFee(doc.consultation_fee ? Number(doc.consultation_fee) : "");
        setPaymentMethod(doc.payment_method ?? "");
        setBankName(doc.bank_name ?? "");
        setBankAccountType((doc as any).bank_account_type ?? "");
        setBankAgency(doc.bank_agency ?? "");
        setBankAccount(doc.bank_account ?? "");
        setBankAccountDigit((doc as any).bank_account_digit ?? "");
        setPixKeyType((doc as any).pix_key_type ?? "");
        setPixKey(doc.pix_key ?? "");
        setDiplomaUrl(doc.diploma_url);
        setCrmDocUrl(doc.crm_document_url);
        setRgUrl((doc as any).rg_document_url ?? null);
        setCvUrl(doc.cv_pdf_url);
        setTimezone(doc.timezone ?? "America/Sao_Paulo");
        if (doc.crm) setShowForm(true);
      }
      if (exps?.length) setExperiences(exps.map(e => ({ id: e.id, role: e.role, institution: e.institution, start_date: e.start_date, end_date: e.end_date ?? "", description: e.description ?? "" })));
      if (certs?.length) setCertifications(certs.map(c => ({ id: c.id, title: c.title, issuer: c.issuer ?? "", issued_year: c.issued_year ?? "" })));
      if (crs?.length) setCourses(crs.map(c => ({ id: c.id, title: c.title, institution: c.institution ?? "", hours: c.hours ?? "", completed_year: c.completed_year ?? "" })));
      if (pubs?.length) setPublications(pubs.map(p => ({ id: p.id, title: p.title, journal: p.journal ?? "", year: p.year ?? "", url: p.url ?? "" })));
      if (avail) {
        setWeekdays(avail.weekdays ?? [1, 2, 3, 4, 5]);
        setStartTime((avail.start_time ?? "08:00").slice(0, 5));
        setEndTime((avail.end_time ?? "18:00").slice(0, 5));
        setTimezone(avail.timezone ?? "America/Sao_Paulo");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, email]);

  /* ---------- Mock LinkedIn auto-fill ---------- */
  const connectLinkedIn = () => {
    toast.loading("Conectando com LinkedIn…", { id: "li" });
    setTimeout(() => {
      const m = MOCK_LINKEDIN;
      setAvatarUrl(m.picture);
      setName(m.name);
      setEmailVal(prev => prev || m.email);
      setLocation(m.location);
      setCity(m.city);
      setState(m.state);
      setHeadline(m.headline);
      setYearsExp(m.yearsExperience);
      setEducation(m.education);
      setLanguages(m.languages);
      setExperiences(m.experiences.map(e => ({ ...e })));
      setCertifications(m.certifications.map(c => ({ ...c })));
      setCourses(m.courses.map(c => ({ ...c })));
      setPublications(m.publications.map(p => ({ ...p })));
      setCrmUf(m.state);
      setLinkedinConnected(true);
      setShowForm(true);
      toast.success("Dados do LinkedIn importados! Preencha os campos médicos para finalizar.", { id: "li", duration: 5000 });
    }, 1100);
  };

  /* ---------- Validation / progress ---------- */
  const checklist = useMemo(() => [
    { ok: !!avatarUrl, label: "Foto de perfil" },
    { ok: name.trim().length >= 2, label: "Nome completo" },
    { ok: isValidEmail(emailVal), label: "Email válido" },
    { ok: /^\d{4,7}$/.test(onlyDigits(crm)), label: "CRM válido" },
    { ok: UF_LIST.includes(crmUf as any), label: "UF do CRM" },
    { ok: isValidCPF(cpf), label: "CPF válido" },
    { ok: !!primarySpecialty, label: "Especialidade principal" },
    { ok: bio.trim().length >= 50, label: "Descrição (mín. 50)" },
    { ok: isValidPhone(phone), label: "Telefone válido" },
    { ok: typeof fee === "number" && fee >= 50, label: "Taxa de consulta" },
    { ok: !!paymentMethod, label: "Método de pagamento" },
    { ok: weekdays.length >= 1, label: "Dias da semana" },
    { ok: !!diplomaUrl, label: "Diploma enviado" },
    { ok: !!crmDocUrl, label: "Documento do CRM" },
    { ok: !!rgUrl, label: "Documento de identidade" },
  ], [avatarUrl, name, emailVal, crm, crmUf, cpf, primarySpecialty, bio, phone, fee, paymentMethod, weekdays, diplomaUrl, crmDocUrl, rgUrl]);

  const completedCount = checklist.filter(c => c.ok).length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);

  /* ---------- Auto-save (draft to localStorage) ---------- */
  const draftKey = `cm-doctor-draft-${userId}`;
  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          name, emailVal, location, city, state, headline, crm, crmUf, cpf,
          primarySpecialty, bio, yearsExp, extraSpecs, phone, whatsapp,
          education, languages, weekdays, startTime, endTime, timezone,
          fee, paymentMethod, bankName, bankAccountType, bankAgency, bankAccount,
          bankAccountDigit, pixKeyType, pixKey,
        }));
        setAutoSavedAt(new Date());
      } catch {}
    }, 30000);
    return () => clearInterval(t);
  }, [loading, draftKey, name, emailVal, location, city, state, headline, crm, crmUf, cpf,
      primarySpecialty, bio, yearsExp, extraSpecs, phone, whatsapp, education, languages,
      weekdays, startTime, endTime, timezone, fee, paymentMethod, bankName, bankAccountType,
      bankAgency, bankAccount, bankAccountDigit, pixKeyType, pixKey]);

  /* ---------- Toggle helpers ---------- */
  const toggleSpec = (s: string) => {
    setExtraSpecs(prev => prev.includes(s)
      ? prev.filter(x => x !== s)
      : prev.length >= 10 ? (toast.warning("Máximo 10 especialidades"), prev) : [...prev, s]);
  };
  const toggleWeekday = (v: number) => {
    setWeekdays(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v].sort());
  };

  /* ---------- Save ---------- */
  const handleSave = async () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push("Nome");
    if (!isValidEmail(emailVal)) errs.push("Email");
    if (!/^\d{4,7}$/.test(onlyDigits(crm))) errs.push("CRM");
    if (!UF_LIST.includes(crmUf as any)) errs.push("UF do CRM");
    if (!isValidCPF(cpf)) errs.push("CPF");
    if (!primarySpecialty) errs.push("Especialidade");
    if (bio.trim().length < 50) errs.push("Descrição");
    if (!isValidPhone(phone)) errs.push("Telefone");
    if (typeof fee !== "number" || fee < 50) errs.push("Taxa");
    if (!paymentMethod) errs.push("Pagamento");
    if (weekdays.length < 1) errs.push("Disponibilidade");
    if (!diplomaUrl) errs.push("Diploma");
    if (!crmDocUrl) errs.push("Documento do CRM");
    if (!rgUrl) errs.push("Documento de identidade");
    if (errs.length) return toast.error(`Campos pendentes: ${errs.join(", ")}`);

    setSaving(true);
    try {
      // Upsert profile name
      await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", userId);

      // Upsert doctor
      const doctorPayload: any = {
        id: userId,
        avatar_url: avatarUrl,
        email: emailVal,
        headline: headline || null,
        city: city || location.split(",")[0]?.trim() || null,
        state: state || null,
        country: "Brasil",
        crm: onlyDigits(crm),
        crm_uf: crmUf.toUpperCase(),
        cpf: onlyDigits(cpf),
        specialty: primarySpecialty,
        specialties: extraSpecs,
        bio: bio.trim(),
        years_experience: yearsExp || null,
        phone: onlyDigits(phone),
        whatsapp: whatsapp ? onlyDigits(whatsapp) : null,
        education: education || null,
        languages: languages || null,
        consultation_fee: fee,
        payment_method: paymentMethod,
        bank_name: bankName || null,
        bank_account_type: bankAccountType || null,
        bank_agency: bankAgency || null,
        bank_account: bankAccount || null,
        bank_account_digit: bankAccountDigit || null,
        pix_key_type: pixKeyType || null,
        pix_key: pixKey || null,
        diploma_url: diplomaUrl,
        crm_document_url: crmDocUrl,
        rg_document_url: rgUrl,
        cv_pdf_url: cvUrl,
        timezone,
      };
      const { error: docErr } = await supabase.from("doctors").upsert(doctorPayload);
      if (docErr) throw docErr;

      // Replace dynamic lists (delete + insert is simplest here)
      await supabase.from("doctor_experiences").delete().eq("doctor_id", userId);
      if (experiences.length) {
        const rows = experiences
          .filter(e => e.role && e.institution && e.start_date)
          .map(e => ({
            doctor_id: userId, role: e.role, institution: e.institution,
            start_date: e.start_date, end_date: e.end_date || null, description: e.description || null,
          }));
        if (rows.length) await supabase.from("doctor_experiences").insert(rows);
      }
      await supabase.from("doctor_certifications").delete().eq("doctor_id", userId);
      if (certifications.length) {
        const rows = certifications
          .filter(c => c.title)
          .map(c => ({
            doctor_id: userId, title: c.title, issuer: c.issuer || null,
            issued_year: typeof c.issued_year === "number" ? c.issued_year : null,
          }));
        if (rows.length) await supabase.from("doctor_certifications").insert(rows);
      }
      await supabase.from("doctor_courses").delete().eq("doctor_id", userId);
      if (courses.length) {
        const rows = courses
          .filter(c => c.title)
          .map(c => ({
            doctor_id: userId, title: c.title, institution: c.institution || null,
            hours: typeof c.hours === "number" ? c.hours : null,
            completed_year: typeof c.completed_year === "number" ? c.completed_year : null,
          }));
        if (rows.length) await supabase.from("doctor_courses").insert(rows);
      }
      await supabase.from("doctor_publications").delete().eq("doctor_id", userId);
      if (publications.length) {
        const rows = publications
          .filter(p => p.title)
          .map(p => ({
            doctor_id: userId, title: p.title, journal: p.journal || null,
            year: typeof p.year === "number" ? p.year : null, url: p.url || null,
          }));
        if (rows.length) await supabase.from("doctor_publications").insert(rows);
      }

      // Weekly availability
      const { data: existingAvail } = await supabase.from("doctor_weekly_availability")
        .select("id").eq("doctor_id", userId).maybeSingle();
      if (existingAvail) {
        await supabase.from("doctor_weekly_availability").update({
          weekdays, start_time: startTime, end_time: endTime, timezone,
        }).eq("doctor_id", userId);
      } else {
        await supabase.from("doctor_weekly_availability").insert({
          doctor_id: userId, weekdays, start_time: startTime, end_time: endTime, timezone,
        });
      }

      try { localStorage.removeItem(draftKey); } catch {}
      onSaved();
      toast.success("Perfil salvo! Status: em análise.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50/30">
        <PageHeader />
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50/40" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <PageHeader />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* MAIN COLUMN */}
        <div className="mx-auto w-full max-w-2xl space-y-6">
          {!showForm ? (
            <AuthChoice onLinkedIn={connectLinkedIn} onManual={() => setShowForm(true)} />
          ) : (
            <>
              {linkedinConnected ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <Check className="h-4 w-4" /> Dados do LinkedIn importados. Revise e preencha os campos médicos abaixo.
                </div>
              ) : (
                <div className="rounded-2xl border bg-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Importar dados do LinkedIn</p>
                    <p className="text-xs text-gray-500">Auto-preenche até 70% do formulário em segundos.</p>
                  </div>
                  <button onClick={connectLinkedIn}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 shrink-0"
                    style={{ backgroundColor: "#0A66C2" }}>
                    <Linkedin className="h-4 w-4" /> Entrar com LinkedIn
                  </button>
                </div>
              )}

              <Section step={1} of={12} title="Informações Básicas" subtitle="Dados pessoais e foto de perfil">
                <AvatarUploader userId={userId} url={avatarUrl} fallback={name.charAt(0).toUpperCase()} onChange={setAvatarUrl} />
                <FieldGroup>
                  <Field label="Nome Completo" required>
                    <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Email" required>
                    <Input type="email" value={emailVal} onChange={(e) => setEmailVal(e.target.value)} />
                  </Field>
                  <Field label="Localização">
                    <Input value={location} onChange={(e) => {
                      setLocation(e.target.value);
                      const parts = e.target.value.split(",").map(p => p.trim());
                      setCity(parts[0] ?? "");
                      const uf = (parts[1] ?? "").toUpperCase();
                      if (UF_LIST.includes(uf as any)) setState(uf);
                    }} placeholder="Cidade, UF, País" />
                  </Field>
                  <Field label="Headline Profissional" hint={`${headline.length}/120`}>
                    <Input value={headline} onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
                      placeholder="Ex: Médico Clínico Geral | Especialista em Telemedicina" />
                  </Field>
                </FieldGroup>
              </Section>

              <Section step={2} of={12} title="Informações Médicas" subtitle="Registro profissional e especialidades">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Field label="CRM" required>
                        <Input value={crm} onChange={(e) => setCrm(onlyDigits(e.target.value).slice(0, 7))} placeholder="Ex: 0505" />
                      </Field>
                    </div>
                    <Field label="UF do CRM" required>
                      <Select value={crmUf} onValueChange={setCrmUf}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>{UF_LIST.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="CPF" required>
                    <Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
                  </Field>
                  <Field label="Especialidade Principal" required>
                    <Select value={primarySpecialty} onValueChange={setPrimarySpecialty}>
                      <SelectTrigger><SelectValue placeholder="Selecione sua especialidade" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Descrição Profissional" required hint={`${bio.length}/1000 (mín. 50)`}>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 1000))}
                      rows={4} placeholder="Conte sua experiência, abordagem profissional e áreas de interesse." />
                  </Field>
                  <Field label="Anos de Experiência" required hint="Calculado automaticamente a partir das experiências (editável)">
                    <Input type="number" min={0} max={70} value={yearsExp}
                      onChange={(e) => setYearsExp(e.target.value === "" ? "" : Math.max(0, Math.min(70, Number(e.target.value))))} />
                  </Field>
                  <div>
                    <Label className="mb-2 block">Especialidades adicionais <span className="text-xs font-normal text-gray-500">(até 10)</span></Label>
                    <div className="relative overflow-hidden transition-[max-height] duration-300"
                      style={{ maxHeight: showAllSpecs ? "1500px" : "200px" }}>
                      <div className="flex flex-wrap gap-2">
                        {SPECIALTIES.map(s => {
                          const on = extraSpecs.includes(s);
                          return (
                            <button type="button" key={s} onClick={() => toggleSpec(s)}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                on ? "border-emerald-600 bg-emerald-600 text-white"
                                   : "border-gray-200 bg-white text-gray-700 hover:border-emerald-400"}`}>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      {!showAllSpecs && (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="mt-2 text-emerald-700 hover:text-emerald-800"
                      onClick={() => setShowAllSpecs(s => !s)}>
                      {showAllSpecs ? "Ver menos" : "Ver mais"}
                    </Button>
                  </div>
                </FieldGroup>
              </Section>

              <Section step={3} of={12} title="Contato" subtitle="Como as redes podem falar com você">
                <FieldGroup>
                  <Field label="Telefone" required>
                    <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(11) 99999-9999" />
                  </Field>
                  <Field label="WhatsApp" hint="Deixe em branco se for o mesmo número">
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} placeholder="(11) 99999-9999" />
                  </Field>
                </FieldGroup>
              </Section>

              <Section step={4} of={12} title="Formação Acadêmica" subtitle="Faculdade, residência, pós-graduação">
                <Textarea rows={4} value={education} onChange={(e) => setEducation(e.target.value)}
                  placeholder="Ex: USP — Medicina (2015-2020), Especialização em Cardiologia — UNIFESP (2021-2023)" />
              </Section>

              <Section step={5} of={12} title="Idiomas" subtitle="Idiomas falados">
                <Textarea rows={2} value={languages} onChange={(e) => setLanguages(e.target.value)}
                  placeholder="Português, Inglês, Espanhol" />
              </Section>

              <Section step={6} of={12} title="Experiência Profissional" subtitle="Histórico de atuação">
                <DynamicList items={experiences} max={10}
                  onAdd={() => setExperiences(prev => [...prev, { role: "", institution: "", start_date: "", end_date: "", description: "" }])}
                  onRemove={(i) => setExperiences(prev => prev.filter((_, idx) => idx !== i))}
                  addLabel="Adicionar experiência"
                  renderItem={(e, i) => (
                    <FieldGroup>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Cargo"><Input value={e.role} maxLength={100}
                          onChange={(ev) => setExperiences(p => p.map((x, idx) => idx === i ? { ...x, role: ev.target.value } : x))} /></Field>
                        <Field label="Instituição"><Input value={e.institution} maxLength={150}
                          onChange={(ev) => setExperiences(p => p.map((x, idx) => idx === i ? { ...x, institution: ev.target.value } : x))} /></Field>
                        <Field label="Início"><Input type="month" value={e.start_date.slice(0, 7)}
                          onChange={(ev) => setExperiences(p => p.map((x, idx) => idx === i ? { ...x, start_date: ev.target.value ? `${ev.target.value}-01` : "" } : x))} /></Field>
                        <Field label="Término" hint="Deixe vazio se atual"><Input type="month" value={e.end_date ? e.end_date.slice(0, 7) : ""}
                          onChange={(ev) => setExperiences(p => p.map((x, idx) => idx === i ? { ...x, end_date: ev.target.value ? `${ev.target.value}-01` : "" } : x))} /></Field>
                      </div>
                      <Field label="Descrição" hint={`${e.description.length}/300`}>
                        <Textarea rows={2} value={e.description}
                          onChange={(ev) => setExperiences(p => p.map((x, idx) => idx === i ? { ...x, description: ev.target.value.slice(0, 300) } : x))} />
                      </Field>
                    </FieldGroup>
                  )} />
              </Section>

              <Section step={7} of={12} title="Certificações" subtitle="Credenciais e certificações">
                <DynamicList items={certifications} max={10}
                  onAdd={() => setCertifications(p => [...p, { title: "", issuer: "", issued_year: "" }])}
                  onRemove={(i) => setCertifications(p => p.filter((_, idx) => idx !== i))}
                  addLabel="Adicionar certificação"
                  renderItem={(c, i) => (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2"><Field label="Nome"><Input value={c.title} maxLength={150}
                        onChange={(e) => setCertifications(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} /></Field></div>
                      <Field label="Ano"><Input type="number" min={1950} max={2100} value={c.issued_year}
                        onChange={(e) => setCertifications(p => p.map((x, idx) => idx === i ? { ...x, issued_year: e.target.value === "" ? "" : Number(e.target.value) } : x))} /></Field>
                      <div className="sm:col-span-3"><Field label="Instituição emissora"><Input value={c.issuer} maxLength={150}
                        onChange={(e) => setCertifications(p => p.map((x, idx) => idx === i ? { ...x, issuer: e.target.value } : x))} /></Field></div>
                    </div>
                  )} />
              </Section>

              <Section step={8} of={12} title="Cursos" subtitle="Cursos complementares">
                <DynamicList items={courses} max={10}
                  onAdd={() => setCourses(p => [...p, { title: "", institution: "", hours: "", completed_year: "" }])}
                  onRemove={(i) => setCourses(p => p.filter((_, idx) => idx !== i))}
                  addLabel="Adicionar curso"
                  renderItem={(c, i) => (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Curso"><Input value={c.title} maxLength={150}
                        onChange={(e) => setCourses(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} /></Field>
                      <Field label="Instituição"><Input value={c.institution} maxLength={150}
                        onChange={(e) => setCourses(p => p.map((x, idx) => idx === i ? { ...x, institution: e.target.value } : x))} /></Field>
                    </div>
                  )} />
              </Section>

              <Section step={9} of={12} title="Publicações" subtitle="Artigos e publicações científicas">
                <DynamicList items={publications} max={10}
                  onAdd={() => setPublications(p => [...p, { title: "", journal: "", year: "", url: "" }])}
                  onRemove={(i) => setPublications(p => p.filter((_, idx) => idx !== i))}
                  addLabel="Adicionar publicação"
                  renderItem={(p, i) => (
                    <FieldGroup>
                      <Field label="Título"><Input value={p.title} maxLength={200}
                        onChange={(e) => setPublications(prev => prev.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} /></Field>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Revista / Veículo"><Input value={p.journal}
                          onChange={(e) => setPublications(prev => prev.map((x, idx) => idx === i ? { ...x, journal: e.target.value } : x))} /></Field>
                        <Field label="Ano"><Input type="number" min={1950} max={2100} value={p.year}
                          onChange={(e) => setPublications(prev => prev.map((x, idx) => idx === i ? { ...x, year: e.target.value === "" ? "" : Number(e.target.value) } : x))} /></Field>
                      </div>
                      <Field label="Link"><Input type="url" value={p.url} placeholder="https://..."
                        onChange={(e) => setPublications(prev => prev.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))} /></Field>
                    </FieldGroup>
                  )} />
              </Section>

              <Section step={10} of={12} title="Disponibilidade" subtitle="Quando você está disponível para atender">
                <FieldGroup>
                  <div>
                    <Label className="mb-2 block">Dias da semana <span className="text-red-500">*</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(d => {
                        const on = weekdays.includes(d.v);
                        return (
                          <button type="button" key={d.v} onClick={() => toggleWeekday(d.v)}
                            className={`min-w-[52px] rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              on ? "border-emerald-600 bg-emerald-600 text-white"
                                 : "border-gray-200 bg-white text-gray-700 hover:border-emerald-400"}`}>
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Início" required><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
                    <Field label="Término" required><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
                  </div>
                  <Field label="Fuso horário" required>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIMEZONES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </Section>

              <Section step={11} of={12} title="Informações de Pagamento" subtitle="Como você quer receber">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Taxa de Consulta/Plantão (R$)" required hint="Mín. R$ 50, máx. R$ 1000">
                      <Input type="number" min={50} max={1000} step="0.01" value={fee}
                        onChange={(e) => setFee(e.target.value === "" ? "" : Number(e.target.value))} placeholder="300.00" />
                    </Field>
                    <Field label="Método preferido" required>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {paymentMethod === "bank_transfer" && (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Banco">
                          <Select value={bankName} onValueChange={setBankName}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                          </Select>
                        </Field>
                        <Field label="Tipo de conta">
                          <Select value={bankAccountType} onValueChange={setBankAccountType}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="checking">Corrente</SelectItem>
                              <SelectItem value="savings">Poupança</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field label="Agência"><Input value={bankAgency} maxLength={5} onChange={(e) => setBankAgency(onlyDigits(e.target.value))} /></Field>
                        <Field label="Conta"><Input value={bankAccount} maxLength={12} onChange={(e) => setBankAccount(onlyDigits(e.target.value))} /></Field>
                        <Field label="Dígito"><Input value={bankAccountDigit} maxLength={2} onChange={(e) => setBankAccountDigit(e.target.value)} /></Field>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "pix" && (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                      <Field label="Tipo de chave">
                        <Select value={pixKeyType} onValueChange={setPixKeyType}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cpf">CPF</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Telefone</SelectItem>
                            <SelectItem value="random">Chave aleatória</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Chave PIX"><Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} /></Field>
                    </div>
                  )}
                </FieldGroup>
              </Section>

              <Section step={12} of={12} title="Documentos" subtitle="Verificação profissional (privados)">
                <FieldGroup>
                  <DocUploader userId={userId} label="Diploma de Medicina *" url={diplomaUrl} folder="diplomas" onChange={setDiplomaUrl} />
                  <DocUploader userId={userId} label="Documento do CRM *" url={crmDocUrl} folder="crm" onChange={setCrmDocUrl} />
                  <DocUploader userId={userId} label="Documento de Identidade (RG/CNH) *" url={rgUrl} folder="rg" onChange={setRgUrl} />
                  <DocUploader userId={userId} label="Currículo (PDF)" url={cvUrl} folder="cvs" onChange={setCvUrl} bucket="cvs" />
                </FieldGroup>
              </Section>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <BackButton to="/dashboard" label="Voltar ao dashboard" />
                <div className="flex items-center gap-3">
                  {autoSavedAt && (
                    <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                      <Save className="h-3 w-3" /> Rascunho salvo {autoSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                    {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Salvando…</> : <><Check className="mr-1 h-4 w-4" /> Salvar Perfil</>}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* SIDEBAR */}
        {showForm && (
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <SummaryCard avatarUrl={avatarUrl} name={name} headline={headline} extras={extraSpecs} progressPct={progressPct} />
            <ChecklistCard items={checklist} progressPct={progressPct} />
          </aside>
        )}
      </div>
    </div>
  );
}

/* ================== AUTH CHOICE ================== */

function AuthChoice({ onLinkedIn, onManual }: { onLinkedIn: () => void; onManual: () => void }) {
  return (
    <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight"
        style={{ fontFamily: '"Poppins", "Inter", system-ui, sans-serif' }}>
        Crie seu Perfil Profissional
      </h1>
      <p className="mt-2 text-gray-600">
        Conecte-se com redes de telemedicina e acesse plantões.
      </p>

      <button onClick={onLinkedIn}
        className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-lg px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-95"
        style={{ backgroundColor: "#0A66C2" }}>
        <Linkedin className="h-5 w-5" /> Entrar com LinkedIn
      </button>
      <p className="mt-2 text-sm text-gray-500 text-center">
        Conecte sua conta LinkedIn para auto-preencher 70% dos seus dados profissionais.
      </p>

      <div className="my-6 flex items-center gap-3 text-xs uppercase text-gray-400">
        <div className="h-px flex-1 bg-gray-200" /> ou <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button onClick={onManual}
        className="block w-full text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800">
        Preencher formulário manualmente →
      </button>
    </div>
  );
}

/* ================== UI BUILDING BLOCKS ================== */

function Section({ step, of, title, subtitle, children }: {
  step: number; of: number; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: '"Poppins", "Inter", system-ui, sans-serif' }}>
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
          {step}/{of}
        </Badge>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function DynamicList<T>({ items, max, onAdd, onRemove, renderItem, addLabel }: {
  items: T[]; max: number; onAdd: () => void; onRemove: (i: number) => void;
  renderItem: (item: T, i: number) => React.ReactNode; addLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-gray-500 italic">Nenhum item adicionado ainda.</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/40 p-4 relative">
          <button type="button" onClick={() => onRemove(i)}
            className="absolute right-3 top-3 text-gray-400 hover:text-red-600" aria-label="Remover">
            <Trash2 className="h-4 w-4" />
          </button>
          {renderItem(item, i)}
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={onAdd}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          <Plus className="mr-1 h-4 w-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

/* ================== AVATAR / DOC UPLOADERS ================== */

function AvatarUploader({ userId, url, fallback, onChange }: {
  userId: string; url: string | null; fallback: string; onChange: (url: string | null) => void;
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
      <Avatar className="h-24 w-24 ring-2 ring-emerald-100">
        {url && <AvatarImage src={url} alt="Avatar" />}
        <AvatarFallback className="bg-emerald-50 text-emerald-700 text-xl font-semibold">{fallback}</AvatarFallback>
      </Avatar>
      <div>
        <Button type="button" variant="outline" size="sm" disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Camera className="mr-1 h-4 w-4" />}
          {url ? "Alterar foto" : "Adicionar foto"}
        </Button>
        <p className="mt-1 text-xs text-gray-500">JPG ou PNG, até 5MB</p>
        <input ref={inputRef} type="file" accept="image/*" hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    </div>
  );
}

function DocUploader({ userId, label, url, folder, onChange, bucket = "documents" }: {
  userId: string; label: string; url: string | null; folder: string;
  onChange: (url: string | null) => void; bucket?: "documents" | "cvs";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 10MB)");
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${userId}/${folder}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (bucket === "cvs") {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(pub.publicUrl);
    } else {
      // private bucket — store the path; signed URL can be generated when needed
      onChange(path);
    }
    setBusy(false);
    toast.success("Arquivo enviado!");
  };
  const remove = () => { onChange(null); toast.success("Removido"); };

  return (
    <div className="rounded-lg border border-gray-200 p-3 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500 truncate">
          {url ? "Arquivo enviado" : "PDF, JPG ou PNG (máx 10MB)"}
        </p>
      </div>
      {url && (
        <Button type="button" size="sm" variant="ghost" onClick={remove} className="text-red-600 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      <Button type="button" size="sm" variant="outline" disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </Button>
      <input ref={inputRef} type="file" accept=".pdf,image/*" hidden
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

/* ================== SIDEBAR CARDS ================== */

function SummaryCard({ avatarUrl, name, headline, extras, progressPct }: {
  avatarUrl: string | null; name: string; headline: string; extras: string[]; progressPct: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
          <ShieldAlert className="mr-1 h-3 w-3" /> Em análise
        </Badge>
      </div>
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-20 w-20 ring-2 ring-emerald-100">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold">
            {name.charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <p className="mt-3 font-semibold text-gray-900">{name || "Seu nome"}</p>
        {headline && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{headline}</p>}
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <Star className="h-3.5 w-3.5" /> Sem avaliações ainda
        </div>
      </div>
      {extras.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
          {extras.slice(0, 3).map(s => (
            <Badge key={s} variant="outline" className="border-emerald-200 text-emerald-700 text-[10px]">{s}</Badge>
          ))}
          {extras.length > 3 && <Badge variant="outline" className="text-[10px]">+{extras.length - 3}</Badge>}
        </div>
      )}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-600 font-medium">Preenchimento</span>
          <span className="text-emerald-700 font-semibold">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>
    </div>
  );
}

function ChecklistCard({ items, progressPct }: { items: { ok: boolean; label: string }[]; progressPct: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Checklist</h3>
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
              item.ok ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
            }`}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className={item.ok ? "text-gray-700" : "text-gray-500"}>{item.label}</span>
          </li>
        ))}
      </ul>
      {progressPct < 100 && (
        <p className="mt-3 text-xs text-gray-500">
          Complete todos os itens para enviar seu perfil para análise.
        </p>
      )}
    </div>
  );
}
