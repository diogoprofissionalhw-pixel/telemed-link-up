import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStars(5); setComment(""); setExistingId(null);
    (async () => {
      const { data } = await supabase
        .from("ratings")
        .select("id, stars, comment")
        .eq("request_id", requestId)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        setStars(data.stars);
        setComment(data.comment ?? "");
      }
    })();
  }, [open, requestId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { stars, comment: comment.trim() || null };
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
          <div className="flex flex-col items-center gap-2 py-2">
            <StarRating value={stars} onChange={setStars} size={32} />
            <p className="text-sm text-muted-foreground">{stars} de 5 estrelas</p>
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentário (opcional)"
            maxLength={1000}
            rows={4}
          />
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
