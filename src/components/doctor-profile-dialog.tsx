import { useEffect, useState } from "react";
import {
  Stethoscope, Award, GraduationCap, Languages, BadgeCheck, FileText, ExternalLink, MapPin, Eye,
  Clock, DollarSign, Link as LinkIcon, Calendar, CalendarClock, Briefcase, ShieldCheck, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StarRating } from "@/components/star-rating";
import { DoctorPortfolio } from "@/components/doctor-portfolio";

interface DoctorFull {
  id: string;
  public_id: string | null;
  specialty: string;
  specialties: string[];
  crm: string;
  crm_uf: string;
  crm_status: string | null;
  headline: string | null;
  bio: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  education: string | null;
  certifications: string | null;
  medical_experience: string | null;
  languages: string | null;
  linkedin_url: string | null;
  lattes_url: string | null;
  is_premium: boolean;
  identity_verified: boolean;
  timezone: string | null;
  created_at: string | null;
  full_name: string;
  avatar_url: string | null;
  cv_pdf_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

interface RatingItem {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

interface ExperienceItem {
  id: string;
  role: string;
  institution: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
}

interface WeeklyAvailability {
  weekdays: number[];
  start_time: string;
  end_time: string;
  timezone: string;
}

interface AvailabilityItem {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctorId: string;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TABS = [
  { v: "dados", label: "Dados" },
  { v: "carreira", label: "Carreira" },
  { v: "agenda", label: "Agenda" },
  { v: "verificacao", label: "Verificação" },
] as const;

export function DoctorProfileDialog({ open, onOpenChange, doctorId }: Props) {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<DoctorFull | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [weekly, setWeekly] = useState<WeeklyAvailability | null>(null);
  const [availabilities, setAvailabilities] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("dados");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTab("dados");
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: d }, { data: r }, { data: ex }, { data: wk }, { data: av }] = await Promise.all([
        supabase.rpc("doctors_directory").eq("id", doctorId).maybeSingle(),
        supabase
          .from("ratings")
          .select("id, stars, comment, created_at")
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false }),
        supabase
          .from("doctor_experiences")
          .select("id, role, institution, start_date, end_date, description")
          .eq("doctor_id", doctorId)
          .order("start_date", { ascending: false }),
        supabase
          .from("doctor_weekly_availability")
          .select("weekdays, start_time, end_time, timezone")
          .eq("doctor_id", doctorId)
          .maybeSingle(),
        supabase
          .from("doctor_availabilities")
          .select("id, available_date, start_time, end_time, notes")
          .eq("doctor_id", doctorId)
          .gte("available_date", today)
          .order("available_date", { ascending: true })
          .limit(12),
      ]);

      if (d) {
        const row = d as any;
        let cvUrl: string | null = row.cv_pdf_url ?? null;
        if (cvUrl) {
          const marker = "/storage/v1/object/public/cvs/";
          const idx = cvUrl.indexOf(marker);
          const path = idx >= 0 ? cvUrl.slice(idx + marker.length) : cvUrl;
          const { data: signed } = await supabase.storage.from("cvs").createSignedUrl(path, 3600);
          cvUrl = signed?.signedUrl ?? null;
        }
        setDoctor({
          id: row.id,
          public_id: row.public_id ?? null,
          specialty: row.specialty,
          specialties: (row.specialties as string[] | null) ?? [],
          crm: row.crm,
          crm_uf: row.crm_uf,
          crm_status: row.crm_status ?? null,
          headline: row.headline ?? null,
          bio: row.bio ?? null,
          years_experience: row.years_experience ?? null,
          consultation_fee: row.consultation_fee ?? null,
          education: row.education ?? null,
          certifications: row.certifications ?? null,
          medical_experience: row.medical_experience ?? null,
          languages: row.languages ?? null,
          linkedin_url: row.linkedin_url ?? null,
          lattes_url: row.lattes_url ?? null,
          is_premium: !!row.is_premium,
          identity_verified: !!row.identity_verified,
          timezone: row.timezone ?? null,
          created_at: row.created_at ?? null,
          avatar_url: row.avatar_url ?? null,
          cv_pdf_url: cvUrl,
          city: row.city ?? null,
          state: row.state ?? null,
          country: row.country ?? null,
          full_name: row.full_name ?? "Médico",
        });
      }

      setRatings((r ?? []) as RatingItem[]);
      setExperiences((ex ?? []) as ExperienceItem[]);
      setWeekly((wk ?? null) as WeeklyAvailability | null);
      setAvailabilities((av ?? []) as AvailabilityItem[]);
      setLoading(false);
    })();
  }, [open, doctorId]);

  const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perfil do médico</DialogTitle>
        </DialogHeader>
        {loading || !doctor ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-5">
            {/* Cabeçalho */}
            <div className="flex items-start gap-3">
              <Avatar className="h-14 w-14 border-2 border-border">
                {doctor.avatar_url && <AvatarImage src={doctor.avatar_url} alt={doctor.full_name} />}
                <AvatarFallback className="bg-accent">
                  {doctor.full_name ? doctor.full_name.charAt(0).toUpperCase() : <Stethoscope className="h-7 w-7 text-primary" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{doctor.full_name}</h3>
                {doctor.headline && <p className="text-sm text-foreground/80">{doctor.headline}</p>}
                <p className="text-sm text-muted-foreground">
                  {doctor.specialty} · CRM {doctor.crm}/{doctor.crm_uf}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StarRating value={avg} readonly size={16} />
                  <span className="text-xs text-muted-foreground">
                    {ratings.length > 0 ? `${avg.toFixed(1)} (${ratings.length})` : "Sem avaliações"}
                  </span>
                  {doctor.crm_status === "verified" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <BadgeCheck className="h-3 w-3" /> CRM verificado
                    </span>
                  )}
                  {doctor.identity_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <BadgeCheck className="h-3 w-3" /> Identidade verificada
                    </span>
                  )}
                  {doctor.is_premium && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">Premium</span>
                  )}
                </div>
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto rounded-xl border bg-card p-1">
                {TABS.map((t) => (
                  <TabsTrigger key={t.v} value={t.v} className="py-2 text-xs sm:text-sm">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ============ DADOS PESSOAIS ============ */}
              <TabsContent value="dados" className="mt-4 space-y-4">
                {doctor.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {doctor.specialties.map((s) => (
                      <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{s}</span>
                    ))}
                  </div>
                )}
                <div className="grid gap-3 text-sm">
                  <CvRow icon={FileText} label="Bio">{doctor.bio || "—"}</CvRow>
                  <CvRow icon={MapPin} label="Localização">
                    {[doctor.city, doctor.state, doctor.country].filter(Boolean).join(" • ") || "—"}
                  </CvRow>
                  <CvRow icon={Languages} label="Idiomas">{doctor.languages || "—"}</CvRow>
                  <CvRow icon={DollarSign} label="Valor por hora">
                    {doctor.consultation_fee != null ? `R$ ${doctor.consultation_fee}` : "A combinar"}
                  </CvRow>
                  {(doctor.linkedin_url || doctor.lattes_url) && (
                    <CvRow icon={LinkIcon} label="Links">
                      <span className="flex flex-wrap gap-3">
                        {doctor.linkedin_url && (
                          <a href={doctor.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>
                        )}
                        {doctor.lattes_url && (
                          <a href={doctor.lattes_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Lattes</a>
                        )}
                      </span>
                    </CvRow>
                  )}
                  <CvRow icon={Calendar} label="Na plataforma desde">
                    {doctor.created_at ? new Date(doctor.created_at).toLocaleDateString("pt-BR") : "—"}
                  </CvRow>
                  {doctor.public_id && <CvRow icon={BadgeCheck} label="ID público">#{doctor.public_id}</CvRow>}
                </div>
                
              </TabsContent>

              {/* ============ CARREIRA ============ */}
              <TabsContent value="carreira" className="mt-4 space-y-5">
                <div className="grid gap-3 text-sm">
                  <CvRow icon={Award} label="Experiência">
                    {doctor.years_experience ? `${doctor.years_experience} anos` : "—"}
                  </CvRow>
                  <CvRow icon={GraduationCap} label="Formação">{doctor.education || "—"}</CvRow>
                  <CvRow icon={BadgeCheck} label="Certificações">{doctor.certifications || "—"}</CvRow>
                  <CvRow icon={Stethoscope} label="Experiência médica">{doctor.medical_experience || "—"}</CvRow>
                </div>

                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Briefcase className="h-4 w-4 text-primary" /> Experiências profissionais
                  </h4>
                  {experiences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma experiência cadastrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {experiences.map((e) => (
                        <div key={e.id} className="rounded-lg border bg-card p-3">
                          <p className="text-sm font-medium">{e.role}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.institution} · {formatPeriod(e.start_date, e.end_date)}
                          </p>
                          {e.description && <p className="mt-1 text-sm whitespace-pre-wrap">{e.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-semibold">Portfólio</h4>
                  <DoctorPortfolio doctorId={doctor.id} editable={false} />
                </div>

                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Star className="h-4 w-4 text-primary" /> Avaliações
                  </h4>
                  {ratings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ainda sem avaliações.</p>
                  ) : (
                    <div className="space-y-2">
                      {ratings.map((r) => (
                        <div key={r.id} className="rounded-lg border bg-card p-3">
                          <div className="flex items-center justify-between">
                            <StarRating value={r.stars} readonly size={14} />
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          {r.comment && <p className="mt-2 text-sm text-foreground">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ============ AGENDA ============ */}
              <TabsContent value="agenda" className="mt-4 space-y-4">
                <div className="grid gap-3 text-sm">
                  <CvRow icon={Clock} label="Fuso horário">{doctor.timezone || weekly?.timezone || "—"}</CvRow>
                  <CvRow icon={CalendarClock} label="Disponibilidade semanal">
                    {weekly
                      ? `${(weekly.weekdays ?? []).map((d) => WEEKDAY_LABELS[d] ?? d).join(", ")} · ${hhmm(weekly.start_time)} às ${hhmm(weekly.end_time)}`
                      : "—"}
                  </CvRow>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Próximas datas disponíveis</h4>
                  {availabilities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma data específica cadastrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {availabilities.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
                          <span className="font-medium">
                            {new Date(`${a.available_date}T00:00:00`).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-muted-foreground">
                            {hhmm(a.start_time)} às {hhmm(a.end_time)}
                            {a.notes ? ` · ${a.notes}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ============ VERIFICAÇÃO ============ */}
              <TabsContent value="verificacao" className="mt-4 space-y-4">
                <div className="grid gap-3 text-sm">
                  <CvRow icon={BadgeCheck} label="CRM">
                    {doctor.crm}/{doctor.crm_uf} · {doctor.crm_status === "verified" ? "Verificado" : "Não verificado"}
                  </CvRow>
                  <CvRow icon={ShieldCheck} label="Identidade">
                    {doctor.identity_verified ? "Verificada" : "Não verificada"}
                  </CvRow>
                </div>

                {doctor.cv_pdf_url ? (
                  <div className="rounded-lg border bg-primary/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-primary">
                        <FileText className="h-4 w-4" /> Currículo em PDF
                      </span>
                      <div className="flex gap-1">
                        <a href={doctor.cv_pdf_url} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                          <Eye className="h-3 w-3" /> Visualizar
                        </a>
                        <a href={doctor.cv_pdf_url} download
                           className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                          <ExternalLink className="h-3 w-3" /> Baixar
                        </a>
                      </div>
                    </div>
                    <iframe src={doctor.cv_pdf_url} className="mt-2 h-72 w-full rounded-md border bg-white" title="Currículo em PDF" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Currículo em PDF não enviado.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function hhmm(t: string | null | undefined) {
  return t ? t.slice(0, 5) : "—";
}

function formatPeriod(start: string, end: string | null) {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return `${fmt(start)} — ${end ? fmt(end) : "atual"}`;
}

function CvRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg bg-muted/40 p-3">
      <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words">{children}</p>
      </div>
    </div>
  );
}
