import { useEffect, useState } from "react";
import { Stethoscope, Award, GraduationCap, Languages, BadgeCheck, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "@/components/star-rating";

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
  const [doctor, setDoctor] = useState<DoctorFull | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [{ data: d }, { data: r }] = await Promise.all([
        supabase
          .from("doctors")
          .select("id, specialty, crm, crm_uf, bio, years_experience, education, certifications, languages, profiles!inner(full_name)")
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
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-accent">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>
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
            </div>

            <div className="grid gap-3 text-sm">
              <CvRow icon={Award} label="Experiência">
                {doctor.years_experience ? `${doctor.years_experience} anos` : "—"}
              </CvRow>
              <CvRow icon={GraduationCap} label="Formação">{doctor.education || "—"}</CvRow>
              <CvRow icon={BadgeCheck} label="Certificações">{doctor.certifications || "—"}</CvRow>
              <CvRow icon={Languages} label="Idiomas">{doctor.languages || "—"}</CvRow>
              <CvRow icon={FileText} label="Bio">{doctor.bio || "—"}</CvRow>
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
