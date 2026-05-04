import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart, Ban, Tag as TagIcon, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Row {
  id: string;
  is_favorite: boolean;
  is_blocked: boolean;
  tags: string[];
  notes: string | null;
}

export function NetworkDoctorTagPanel({ doctorId }: { doctorId: string }) {
  const { user, userType } = useAuth();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const networkId = user?.id;
  const enabled = userType === "network" && !!networkId;

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("network_doctor_tags")
        .select("id, is_favorite, is_blocked, tags, notes")
        .eq("network_id", networkId!)
        .eq("doctor_id", doctorId)
        .maybeSingle();
      const r: Row = data
        ? { id: data.id, is_favorite: data.is_favorite, is_blocked: data.is_blocked, tags: data.tags ?? [], notes: data.notes }
        : { id: "", is_favorite: false, is_blocked: false, tags: [], notes: null };
      setRow(r);
      setNotes(r.notes ?? "");
      setLoading(false);
    })();
  }, [doctorId, networkId, enabled]);

  if (!enabled) return null;
  if (loading || !row) return null;

  const persist = async (patch: Partial<Row>) => {
    setSaving(true);
    const next = { ...row, ...patch };
    if (row.id) {
      const { error } = await supabase.from("network_doctor_tags")
        .update({ is_favorite: next.is_favorite, is_blocked: next.is_blocked, tags: next.tags, notes: next.notes })
        .eq("id", row.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      setRow(next);
    } else {
      const { data, error } = await supabase.from("network_doctor_tags")
        .insert({ network_id: networkId!, doctor_id: doctorId,
          is_favorite: next.is_favorite, is_blocked: next.is_blocked, tags: next.tags, notes: next.notes })
        .select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setRow({ ...next, id: data.id });
    }
    setSaving(false);
  };

  const toggleFav = () => persist({ is_favorite: !row.is_favorite, is_blocked: false });
  const toggleBlock = () => persist({ is_blocked: !row.is_blocked, is_favorite: false });
  const addTag = () => {
    const t = newTag.trim();
    if (!t) return;
    if (row.tags.includes(t)) { setNewTag(""); return; }
    persist({ tags: [...row.tags, t] });
    setNewTag("");
  };
  const removeTag = (t: string) => persist({ tags: row.tags.filter(x => x !== t) });
  const saveNotes = () => persist({ notes: notes.trim() || null });

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <TagIcon className="h-4 w-4 text-primary" /> Qualificação interna
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={row.is_favorite ? "default" : "outline"} onClick={toggleFav} disabled={saving} className="gap-1.5">
          <Heart className={`h-3.5 w-3.5 ${row.is_favorite ? "fill-current" : ""}`} />
          {row.is_favorite ? "Favorito" : "Favoritar"}
        </Button>
        <Button size="sm" variant={row.is_blocked ? "destructive" : "outline"} onClick={toggleBlock} disabled={saving} className="gap-1.5">
          <Ban className="h-3.5 w-3.5" />
          {row.is_blocked ? "Bloqueado" : "Bloquear"}
        </Button>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Tags</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {row.tags.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
          {row.tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
              {t}
              <button type="button" onClick={() => removeTag(t)} className="hover:opacity-70" aria-label={`Remover ${t}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newTag} maxLength={30} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="ex: pediatria-noturno" className="h-8 text-xs" />
          <Button size="sm" type="button" variant="outline" onClick={addTag} disabled={saving || !newTag.trim()} className="gap-1">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Notas privadas</p>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes}
          placeholder="Anotações visíveis somente para sua rede..." rows={2} maxLength={500} className="text-xs" />
      </div>
    </div>
  );
}
