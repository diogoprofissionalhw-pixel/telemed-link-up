import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Building2, Camera, FileText, Stethoscope, Upload, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [user, loading, navigate]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <AppShell userType={profile.account_type}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Meu perfil</p>
          <h1 className="text-2xl font-bold">
            {profile.account_type === "doctor" ? "Perfil do médico" : "Perfil da rede"}
          </h1>
        </div>

        {profile.account_type === "doctor" ? (
          <DoctorProfileForm userId={user.id} fullName={profile.full_name} onSaved={refreshProfile} />
        ) : (
          <NetworkProfileForm userId={user.id} fullName={profile.full_name} onSaved={refreshProfile} />
        )}
      </main>
    </AppShell>
  );
}

/* ----------------- AVATAR UPLOADER ----------------- */
function AvatarUploader({
  userId, url, fallback, icon: Icon, onChange,
}: {
  userId: string;
  url: string | null;
  fallback: string;
  icon: any;
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

  const remove = async () => {
    onChange(null);
    toast.success("Foto removida");
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
          <Button type="button" variant="ghost" size="sm" onClick={remove} className="gap-2 text-destructive hover:text-destructive">
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("doctors")
        .select("bio, years_experience, education, certifications, languages, avatar_url, cv_pdf_url, cpf, email, city, state, country")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setBio(data.bio ?? "");
        setYears(data.years_experience?.toString() ?? "");
        setEducation(data.education ?? "");
        setCerts(data.certifications ?? "");
        setLangs(data.languages ?? "");
        setAvatar(data.avatar_url ?? null);
        setCv(data.cv_pdf_url ?? null);
        setCpf((data as any).cpf ?? "");
        setEmail((data as any).email ?? "");
        setCity((data as any).city ?? "");
        setState((data as any).state ?? "");
        setCountry((data as any).country ?? "Brasil");
      }
      setLoading(false);
    })();
  }, [userId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe seu nome");
    setSaving(true);
    const yearsNum = years.trim() ? parseInt(years, 10) : null;

    const [{ error: pErr }, { error: dErr }] = await Promise.all([
      supabase.from("profiles").update({ full_name: name.trim() }).eq("id", userId),
      supabase.from("doctors").update({
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
    setSaving(false);
    if (pErr || dErr) return toast.error((pErr ?? dErr)!.message);
    toast.success("Perfil atualizado!");
    onSaved();
  };

  if (loading) return <p className="text-muted-foreground">Carregando perfil...</p>;

  return (
    <form onSubmit={save} className="space-y-6 rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <AvatarUploader userId={userId} url={avatar} fallback={name} icon={Stethoscope} onChange={setAvatar} />

      <div>
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
      </div>

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

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Salvando..." : "Salvar perfil"}
      </Button>
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
