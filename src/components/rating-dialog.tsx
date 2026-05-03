import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/star-rating";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  doctorId: string;
  networkId: string;
  onSaved?: () => void;
}

export function RatingDialog({ open, onOpenChange, requestId, doctorId, networkId, onSaved }: Props) {
  const [punctuality, setPunctuality] = useState(5);
  const [careQuality, setCareQuality] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const stars = Math.round((punctuality + careQuality + communication) / 3);

  useEffect(() => {
    if (!open) return;
    setPunctuality(5); setCareQuality(5); setCommunication(5);
    setComment(""); setExistingId(null);
    (async () => {
      const { data } = await supabase
        .from("ratings")
        .select("id, stars, comment, punctuality, care_quality, communication")
        .eq("request_id", requestId)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        setPunctuality((data as any).punctuality ?? data.stars);
        setCareQuality((data as any).care_quality ?? data.stars);
        setCommunication((data as any).communication ?? data.stars);
        setComment(data.comment ?? "");
      }
    })();
  }, [open, requestId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      stars,
      punctuality,
      care_quality: careQuality,
      communication,
      comment: comment.trim() || null,
    };
    const { error } = existingId
      ? await supabase.from("ratings").update(payload).eq("id", existingId)
      : await supabase.from("ratings").insert({ ...payload, request_id: requestId, doctor_id: doctorId, network_id: networkId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Avaliação registrada!");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar profissional</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <Criterion label="Pontualidade" value={punctuality} onChange={setPunctuality} />
          <Criterion label="Qualidade do atendimento" value={careQuality} onChange={setCareQuality} />
          <Criterion label="Comunicação" value={communication} onChange={setCommunication} />
          <div className="rounded-md bg-muted/40 p-2 text-center text-xs text-muted-foreground">
            Nota geral: <strong className="text-foreground">{stars} ★</strong>
          </div>
          <div>
            <Label htmlFor="cmt">Comentário (opcional)</Label>
            <Textarea
              id="cmt"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Fale brevemente da experiência..."
              maxLength={1000}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Enviando..." : existingId ? "Atualizar avaliação" : "Enviar avaliação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Criterion({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-card p-2.5">
      <span className="text-sm font-medium">{label}</span>
      <StarRating value={value} onChange={onChange} size={22} />
    </div>
  );
}
