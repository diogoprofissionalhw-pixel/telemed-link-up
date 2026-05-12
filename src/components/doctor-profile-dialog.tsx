import { useEffect, useState } from "react";
import { Stethoscope, Award, GraduationCap, Languages, BadgeCheck, FileText, ExternalLink, MapPin, Mail, IdCard, Eye, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/star-rating";
import { DoctorPortfolio } from "@/components/doctor-portfolio";
import { NetworkDoctorTagPanel } from "@/components/network-doctor-tag-panel";
import { ChatPanel } from "@/components/chat-panel";

interface DoctorFull {
  id: string;
  specialty: string;
  crm: string;
  crm_uf: string;
  bio: string | null;
  years_experience: number | null;
  education: string | null;
  certifications: string | null;
  languages: string | null;
  full_name: string;
  avatar_url: string | null;
  cv_pdf_url: string | null;
  cpf: string | null;
  email: string | null;
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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctorId: string;
}

export function DoctorProfileDialog({ open, onOpenChange, doctorId }: Props) {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<DoctorFull | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [{ data: d }, { data: r }] = await Promise.all([
        supabase
          .from("doctors")
          .select("id, specialty, crm, crm_uf, bio, years_experience, education, certifications, languages, avatar_url, cv_pdf_url, cpf, email, city, state, country, profiles!inner(full_name)")
          .eq("id", doctorId)
          .maybeSingle(),
        supabase
          .from("ratings")
          .select("id, stars, comment, created_at")
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false }),
      ]);
      if (d) {
        const profileData = (d as any).profiles;
        setDoctor({
          id: (d as any).id,
          specialty: (d as any).specialty,
          crm: (d as any).crm,
          crm_uf: (d as any).crm_uf,
          bio: (d as any).bio,
          years_experience: (d as any).years_experience,
          education: (d as any).education,
          certifications: (d as any).certifications,
          languages: (d as any).languages,
          avatar_url: (d as any).avatar_url ?? null,
          cv_pdf_url: (d as any).cv_pdf_url ?? null,
          cpf: (d as any).cpf ?? null,
          email: (d as any).email ?? null,
          city: (d as any).city ?? null,
          state: (d as any).state ?? null,
          country: (d as any).country ?? null,
          full_name: profileData?.full_name ?? "Médico",
        });
      }
      setRatings((r ?? []) as RatingItem[]);
      setLoading(false);
    })();
  }, [open, doctorId]);

  const avg = ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perfil do médico</DialogTitle>
        </DialogHeader>
        {loading || !doctor ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <Avatar className="h-14 w-14 border-2 border-border">
                {doctor.avatar_url && <AvatarImage src={doctor.avatar_url} alt={doctor.full_name} />}
                <AvatarFallback className="bg-accent">
                  {doctor.full_name ? doctor.full_name.charAt(0).toUpperCase() : <Stethoscope className="h-7 w-7 text-primary" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{doctor.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {doctor.specialty} · CRM {doctor.crm}/{doctor.crm_uf}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <StarRating value={avg} readonly size={16} />
                  <span className="text-xs text-muted-foreground">
                    {ratings.length > 0 ? `${avg.toFixed(1)} (${ratings.length})` : "Sem avaliações"}
                  </span>
                </div>
              </div>
              {user && user.id !== doctor.id && (
                <Button size="sm" onClick={() => setChatOpen(true)} className="gap-1.5 self-start">
                  <MessageCircle className="h-4 w-4" /> Mensagem
                </Button>
              )}
            </div>

            {doctor.cv_pdf_url && (
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
            )}

            <div className="grid gap-3 text-sm">
              <CvRow icon={MapPin} label="Localização">
                {[doctor.city, doctor.state, doctor.country].filter(Boolean).join(" • ") || "—"}
              </CvRow>
              <CvRow icon={Mail} label="E-mail">{doctor.email || "—"}</CvRow>
              <CvRow icon={IdCard} label="CPF">{doctor.cpf || "—"}</CvRow>
              <CvRow icon={Award} label="Experiência">
                {doctor.years_experience ? `${doctor.years_experience} anos` : "—"}
              </CvRow>
              <CvRow icon={GraduationCap} label="Formação">{doctor.education || "—"}</CvRow>
              <CvRow icon={BadgeCheck} label="Certificações">{doctor.certifications || "—"}</CvRow>
              <CvRow icon={Languages} label="Idiomas">{doctor.languages || "—"}</CvRow>
              <CvRow icon={FileText} label="Bio">{doctor.bio || "—"}</CvRow>
            </div>

            <NetworkDoctorTagPanel doctorId={doctor.id} />

            <div>
              <h4 className="mb-2 text-sm font-semibold">Portfólio</h4>
              <DoctorPortfolio doctorId={doctor.id} editable={false} />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Avaliações</h4>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
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
