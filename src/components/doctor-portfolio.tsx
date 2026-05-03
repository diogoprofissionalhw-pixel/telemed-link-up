import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, BookOpen, FileText, Plus, Trash2, ExternalLink, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Cert { id: string; title: string; issuer: string | null; issued_year: number | null; url: string | null }
interface Course { id: string; title: string; institution: string | null; hours: number | null; completed_year: number | null }
interface Pub { id: string; title: string; journal: string | null; year: number | null; url: string | null }
interface HistItem { id: string; shift_date: string; duration_hours: number; status: string; network: { network_name: string } | null }

export function DoctorPortfolio({ doctorId, editable }: { doctorId: string; editable: boolean }) {
  const [certs, setCerts] = useState<Cert[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [history, setHistory] = useState<HistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [c, co, p, h] = await Promise.all([
      supabase.from("doctor_certifications").select("*").eq("doctor_id", doctorId).order("issued_year", { ascending: false }),
      supabase.from("doctor_courses").select("*").eq("doctor_id", doctorId).order("completed_year", { ascending: false }),
      supabase.from("doctor_publications").select("*").eq("doctor_id", doctorId).order("year", { ascending: false }),
      supabase.from("shift_requests").select("id, shift_date, duration_hours, status, network:networks(network_name)")
        .eq("doctor_id", doctorId).in("status", ["completed", "accepted"]).order("shift_date", { ascending: false }).limit(20),
    ]);
    setCerts((c.data ?? []) as any);
    setCourses((co.data ?? []) as any);
    setPubs((p.data ?? []) as any);
    setHistory((h.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [doctorId]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando portfólio...</p>;

  return (
    <div className="space-y-6">
      <Section icon={Award} title="Certificações" count={certs.length}>
        <ItemList items={certs.map(c => ({
          id: c.id, primary: c.title,
          secondary: [c.issuer, c.issued_year].filter(Boolean).join(" · "),
          url: c.url,
        }))} editable={editable} onDelete={async (id) => {
          await supabase.from("doctor_certifications").delete().eq("id", id);
          reload();
        }} />
        {editable && <CertForm doctorId={doctorId} onSaved={reload} />}
      </Section>

      <Section icon={BookOpen} title="Cursos" count={courses.length}>
        <ItemList items={courses.map(c => ({
          id: c.id, primary: c.title,
          secondary: [c.institution, c.hours ? `${c.hours}h` : null, c.completed_year].filter(Boolean).join(" · "),
        }))} editable={editable} onDelete={async (id) => {
          await supabase.from("doctor_courses").delete().eq("id", id);
          reload();
        }} />
        {editable && <CourseForm doctorId={doctorId} onSaved={reload} />}
      </Section>

      <Section icon={FileText} title="Publicações" count={pubs.length}>
        <ItemList items={pubs.map(p => ({
          id: p.id, primary: p.title,
          secondary: [p.journal, p.year].filter(Boolean).join(" · "),
          url: p.url,
        }))} editable={editable} onDelete={async (id) => {
          await supabase.from("doctor_publications").delete().eq("id", id);
          reload();
        }} />
        {editable && <PubForm doctorId={doctorId} onSaved={reload} />}
      </Section>

      <Section icon={History} title="Histórico de plantões" count={history.length}>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem plantões registrados ainda.</p>
        ) : (
          <ul className="space-y-1.5">
            {history.map(h => (
              <li key={h.id} className="flex items-center justify-between text-sm rounded-md bg-muted/40 px-3 py-1.5">
                <span>{new Date(h.shift_date + "T00:00:00").toLocaleDateString("pt-BR")} · {h.network?.network_name ?? "Rede"}</span>
                <span className="text-xs text-muted-foreground">{h.duration_hours}h · {h.status === "completed" ? "Concluído" : "Aceito"}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, count, children }: { icon: any; title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {children}
    </div>
  );
}

function ItemList({ items, editable, onDelete }: {
  items: { id: string; primary: string; secondary: string; url?: string | null }[];
  editable: boolean;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">Nenhum item adicionado.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map(i => (
        <li key={i.id} className="flex items-start justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{i.primary}</p>
            {i.secondary && <p className="text-xs text-muted-foreground truncate">{i.secondary}</p>}
          </div>
          <div className="flex items-center gap-1">
            {i.url && (
              <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-70">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {editable && (
              <button type="button" onClick={() => onDelete(i.id)} className="text-destructive hover:opacity-70">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CertForm({ doctorId, onSaved }: { doctorId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [issuer, setIssuer] = useState("");
  const [year, setYear] = useState(""); const [url, setUrl] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Informe o título");
    const { error } = await supabase.from("doctor_certifications").insert({
      doctor_id: doctorId, title: title.trim(), issuer: issuer.trim() || null,
      issued_year: year ? parseInt(year) : null, url: url.trim() || null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setIssuer(""); setYear(""); setUrl(""); setOpen(false);
    toast.success("Certificação adicionada"); onSaved();
  };
  if (!open) return <Button size="sm" variant="outline" type="button" onClick={() => setOpen(true)} className="mt-3 gap-1.5"><Plus className="h-3 w-3" />Adicionar certificação</Button>;
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Título *</Label><Input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></div>
      <div><Label>Emissor</Label><Input value={issuer} maxLength={80} onChange={e => setIssuer(e.target.value)} /></div>
      <div><Label>Ano</Label><Input type="number" min={1950} max={2100} value={year} onChange={e => setYear(e.target.value)} /></div>
      <div className="sm:col-span-2"><Label>URL (opcional)</Label><Input value={url} maxLength={300} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
      <div className="sm:col-span-2 flex gap-2"><Button type="submit" size="sm">Salvar</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
    </form>
  );
}

function CourseForm({ doctorId, onSaved }: { doctorId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [inst, setInst] = useState("");
  const [hours, setHours] = useState(""); const [year, setYear] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Informe o título");
    const { error } = await supabase.from("doctor_courses").insert({
      doctor_id: doctorId, title: title.trim(), institution: inst.trim() || null,
      hours: hours ? parseInt(hours) : null, completed_year: year ? parseInt(year) : null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setInst(""); setHours(""); setYear(""); setOpen(false);
    toast.success("Curso adicionado"); onSaved();
  };
  if (!open) return <Button size="sm" variant="outline" type="button" onClick={() => setOpen(true)} className="mt-3 gap-1.5"><Plus className="h-3 w-3" />Adicionar curso</Button>;
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Título *</Label><Input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></div>
      <div><Label>Instituição</Label><Input value={inst} maxLength={80} onChange={e => setInst(e.target.value)} /></div>
      <div><Label>Carga (h)</Label><Input type="number" min={1} value={hours} onChange={e => setHours(e.target.value)} /></div>
      <div><Label>Ano</Label><Input type="number" min={1950} max={2100} value={year} onChange={e => setYear(e.target.value)} /></div>
      <div className="sm:col-span-2 flex gap-2"><Button type="submit" size="sm">Salvar</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
    </form>
  );
}

function PubForm({ doctorId, onSaved }: { doctorId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [journal, setJournal] = useState("");
  const [year, setYear] = useState(""); const [url, setUrl] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Informe o título");
    const { error } = await supabase.from("doctor_publications").insert({
      doctor_id: doctorId, title: title.trim(), journal: journal.trim() || null,
      year: year ? parseInt(year) : null, url: url.trim() || null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setJournal(""); setYear(""); setUrl(""); setOpen(false);
    toast.success("Publicação adicionada"); onSaved();
  };
  if (!open) return <Button size="sm" variant="outline" type="button" onClick={() => setOpen(true)} className="mt-3 gap-1.5"><Plus className="h-3 w-3" />Adicionar publicação</Button>;
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Título *</Label><Input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} /></div>
      <div><Label>Revista/Veículo</Label><Input value={journal} maxLength={120} onChange={e => setJournal(e.target.value)} /></div>
      <div><Label>Ano</Label><Input type="number" min={1950} max={2100} value={year} onChange={e => setYear(e.target.value)} /></div>
      <div className="sm:col-span-2"><Label>URL (DOI/link)</Label><Input value={url} maxLength={300} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
      <div className="sm:col-span-2 flex gap-2"><Button type="submit" size="sm">Salvar</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
    </form>
  );
}
