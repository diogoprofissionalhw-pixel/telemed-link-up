import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Exp = {
  id: string;
  role: string;
  institution: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
};

export function DoctorExperiences({ doctorId, editable }: { doctorId: string; editable: boolean }) {
  const [items, setItems] = useState<Exp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("doctor_experiences")
        .select("*")
        .eq("doctor_id", doctorId)
        .order("start_date", { ascending: false });
      setItems((data ?? []) as Exp[]);
      setLoading(false);
    })();
  }, [doctorId]);

  const addEmpty = () => {
    setItems((s) => [
      { id: `new-${Date.now()}`, role: "", institution: "", start_date: "", end_date: null, description: "" },
      ...s,
    ]);
  };

  const update = (idx: number, patch: Partial<Exp>) =>
    setItems((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const save = async (idx: number) => {
    const it = items[idx];
    if (!it.role.trim() || !it.institution.trim() || !it.start_date) {
      return toast.error("Cargo, instituição e data de início são obrigatórios");
    }
    if (it.end_date && it.end_date < it.start_date) {
      return toast.error("Data de fim não pode ser anterior à data de início");
    }
    const payload = {
      doctor_id: doctorId,
      role: it.role.trim(),
      institution: it.institution.trim(),
      start_date: it.start_date,
      end_date: it.end_date || null,
      description: it.description?.trim() || null,
    };
    if (it.id.startsWith("new-")) {
      const { data, error } = await supabase.from("doctor_experiences").insert(payload).select().single();
      if (error) return toast.error(error.message);
      update(idx, data as Exp);
    } else {
      const { error } = await supabase.from("doctor_experiences").update(payload).eq("id", it.id);
      if (error) return toast.error(error.message);
    }
    toast.success("Experiência salva");
  };

  const remove = async (idx: number) => {
    const it = items[idx];
    if (!it.id.startsWith("new-")) {
      const { error } = await supabase.from("doctor_experiences").delete().eq("id", it.id);
      if (error) return toast.error(error.message);
    }
    setItems((s) => s.filter((_, i) => i !== idx));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma experiência cadastrada ainda.</p>
      )}
      {items.map((it, idx) => (
        <div key={it.id} className="rounded-lg border-2 border-border bg-muted/20 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Cargo</Label>
              <Input value={it.role} disabled={!editable} onChange={(e) => update(idx, { role: e.target.value })} placeholder="Ex: Plantonista" />
            </div>
            <div>
              <Label>Instituição</Label>
              <Input value={it.institution} disabled={!editable} onChange={(e) => update(idx, { institution: e.target.value })} placeholder="Ex: Hospital Central" />
            </div>
            <div>
              <Label>Início</Label>
              <Input type="date" value={it.start_date} disabled={!editable} onChange={(e) => update(idx, { start_date: e.target.value })} />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input type="date" value={it.end_date ?? ""} disabled={!editable} onChange={(e) => update(idx, { end_date: e.target.value || null })} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={it.description ?? ""} disabled={!editable} maxLength={500} rows={2} onChange={(e) => update(idx, { description: e.target.value })} />
          </div>
          {editable && (
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(idx)} className="text-destructive hover:text-destructive gap-1">
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
              <Button type="button" size="sm" onClick={() => save(idx)}>Salvar</Button>
            </div>
          )}
        </div>
      ))}
      {editable && (
        <Button type="button" variant="outline" onClick={addEmpty} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> <Briefcase className="h-4 w-4" /> Adicionar experiência
        </Button>
      )}
    </div>
  );
}
