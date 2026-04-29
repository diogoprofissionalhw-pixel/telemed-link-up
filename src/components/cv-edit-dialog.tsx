import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctorId: string;
  onSaved?: () => void;
}

export function CvEditDialog({ open, onOpenChange, doctorId, onSaved }: Props) {
  const [bio, setBio] = useState("");
  const [years, setYears] = useState<string>("");
  const [education, setEducation] = useState("");
  const [certs, setCerts] = useState("");
  const [langs, setLangs] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("doctors")
        .select("bio, years_experience, education, certifications, languages")
        .eq("id", doctorId)
        .maybeSingle();
      if (data) {
        setBio(data.bio ?? "");
        setYears(data.years_experience?.toString() ?? "");
        setEducation(data.education ?? "");
        setCerts(data.certifications ?? "");
        setLangs(data.languages ?? "");
      }
    })();
  }, [open, doctorId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const yearsNum = years.trim() ? parseInt(years, 10) : null;
    const { error } = await supabase
      .from("doctors")
      .update({
        bio: bio.trim() || null,
        years_experience: yearsNum && !isNaN(yearsNum) ? yearsNum : null,
        education: education.trim() || null,
        certifications: certs.trim() || null,
        languages: langs.trim() || null,
      })
      .eq("id", doctorId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Currículo atualizado!");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meu currículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="years">Anos de experiência</Label>
            <Input id="years" type="number" min={0} max={70} value={years} onChange={(e) => setYears(e.target.value)} />
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
            <Label htmlFor="lang">Idiomas</Label>
            <Input id="lang" value={langs} maxLength={200} onChange={(e) => setLangs(e.target.value)} placeholder="Português, Inglês..." />
          </div>
          <div>
            <Label htmlFor="bio">Sobre mim</Label>
            <Textarea id="bio" value={bio} maxLength={1000} onChange={(e) => setBio(e.target.value)} placeholder="Breve resumo profissional" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "Salvando..." : "Salvar currículo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
