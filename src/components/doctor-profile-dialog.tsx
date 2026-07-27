import { useEffect, useState } from "react";
import { Stethoscope, Award, GraduationCap, Languages, BadgeCheck, FileText, ExternalLink, MapPin, Eye, MessageCircle } from "lucide-react";
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
          .rpc("doctors_directory")
          .eq("id", doctorId)
          .maybeSingle(),
        supabase
          .from("ratings")
          .select("id, stars, comment, created_at")
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false }),
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
      {user && doctor && (
        <ChatPanel
          open={chatOpen}
          onOpenChange={setChatOpen}
          currentUserId={user.id}
          otherUserId={doctor.id}
          otherName={doctor.full_name}
          otherAvatarUrl={doctor.avatar_url}
        />
      )}
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
