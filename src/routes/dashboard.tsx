import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Calendar, Clock, Building2, Stethoscope, Plus, CheckCircle2, XCircle, Hourglass, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

interface ShiftRequest {
  id: string;
  network_id: string;
  doctor_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  notes: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
  network?: { network_name: string } | null;
  doctor_profile?: { full_name: string } | null;
  doctor?: { specialty: string; crm: string; crm_uf: string } | null;
}

interface DoctorOption {
  id: string;
  specialty: string;
  crm: string;
  crm_uf: string;
  full_name: string;
}

function statusBadge(status: ShiftRequest["status"]) {
  const map = {
    pending:   { icon: Hourglass,    label: "Pendente",  cls: "bg-warning/15 text-warning-foreground", style: { color: "oklch(0.45 0.12 60)" } },
    accepted:  { icon: CheckCircle2, label: "Aceito",    cls: "bg-success/15", style: { color: "oklch(0.40 0.14 150)" } },
    declined:  { icon: XCircle,      label: "Recusado",  cls: "bg-destructive/10", style: { color: "oklch(0.50 0.20 25)" } },
    cancelled: { icon: Ban,          label: "Cancelado", cls: "bg-muted", style: { color: "var(--muted-foreground)" } },
  } as const;
  const { icon: Icon, label, cls, style } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`} style={style}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60; // virou o dia
  return Math.round((mins / 60) * 100) / 100;
}

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-4 py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent">
            {profile.account_type === "doctor"
              ? <Stethoscope className="h-6 w-6 text-primary" />
              : <Building2 className="h-6 w-6 text-primary" />}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {profile.account_type === "doctor" ? "Painel do médico" : "Painel da rede"}
            </p>
            <h1 className="text-2xl font-bold">Olá, {profile.full_name}</h1>
          </div>
        </div>

        {profile.account_type === "doctor"
          ? <DoctorPanel userId={user.id} />
          : <NetworkPanel userId={user.id} />}
      </main>
    </div>
  );
}

/* ----------------- DOCTOR PANEL ----------------- */
function DoctorPanel({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shift_requests")
      .select("*, network:networks(network_name)")
      .eq("doctor_id", userId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRequests((data ?? []) as ShiftRequest[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase
      .from("shift_requests")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Plantão aceito!" : "Plantão recusado");
    load();
  };

  const pending = requests.filter(r => r.status === "pending");
  const others = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Solicitações pendentes ({pending.length})</h2>
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : pending.length === 0 ? (
          <EmptyState text="Nenhuma solicitação pendente no momento." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pending.map(r => (
              <RequestCard key={r.id} req={r} viewerType="doctor" onRespond={respond} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem registros ainda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {others.map(r => <RequestCard key={r.id} req={r} viewerType="doctor" />)}
          </div>
        )}
      </section>
    </div>
  );
}

/* ----------------- NETWORK PANEL ----------------- */
function NetworkPanel({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shift_requests")
      .select("*, doctor:doctors(specialty, crm, crm_uf), doctor_profile:profiles!shift_requests_doctor_id_fkey(full_name)")
      .eq("network_id", userId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRequests((data ?? []) as ShiftRequest[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("shift_requests")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Solicitação cancelada");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Suas solicitações</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova solicitação</Button>
          </DialogTrigger>
          <NewRequestDialog
            networkId={userId}
            onCreated={() => { setOpen(false); load(); }}
          />
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : requests.length === 0 ? (
        <EmptyState text="Você ainda não enviou solicitações. Crie a primeira!" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {requests.map(r => (
            <RequestCard key={r.id} req={r} viewerType="network" onCancel={cancel} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------- NEW REQUEST DIALOG ----------------- */
function NewRequestDialog({ networkId, onCreated }: { networkId: string; onCreated: () => void }) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("19:00");
  const [end, setEnd] = useState("07:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("doctors")
        .select("id, specialty, crm, crm_uf, profiles!inner(full_name)");
      const list: DoctorOption[] = (data ?? []).map((d: any) => ({
        id: d.id,
        specialty: d.specialty,
        crm: d.crm,
        crm_uf: d.crm_uf,
        full_name: d.profiles?.full_name ?? "Médico",
      }));
      setDoctors(list);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return toast.error("Selecione um médico");
    if (!date || !start || !end) return toast.error("Preencha data e horários");

    const hours = calcHours(start, end);
    if (hours <= 0) return toast.error("Horário inválido");

    setSubmitting(true);
    const { error } = await supabase.from("shift_requests").insert({
      network_id: networkId,
      doctor_id: doctorId,
      shift_date: date,
      start_time: start,
      end_time: end,
      duration_hours: hours,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação enviada!");
    onCreated();
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Nova solicitação de plantão</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Médico</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder={doctors.length ? "Selecione o médico" : "Nenhum médico cadastrado"} />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name} — {d.specialty} (CRM {d.crm}/{d.crm_uf})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="d">Data do plantão</Label>
          <Input id="d" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="s">Início</Label>
            <Input id="s" type="time" value={start} onChange={e => setStart(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="e">Fim</Label>
            <Input id="e" type="time" value={end} onChange={e => setEnd(e.target.value)} required />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Duração: <strong>{calcHours(start, end)}h</strong> (atravessa o dia se necessário)
        </p>
        <div>
          <Label htmlFor="n">Observações (opcional)</Label>
          <Textarea id="n" value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} placeholder="Detalhes do plantão, área, especificidades..." />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ----------------- REQUEST CARD ----------------- */
function RequestCard({
  req, viewerType, onRespond, onCancel,
}: {
  req: ShiftRequest;
  viewerType: "doctor" | "network";
  onRespond?: (id: string, status: "accepted" | "declined") => void;
  onCancel?: (id: string) => void;
}) {
  const counterpart = viewerType === "doctor"
    ? req.network?.network_name ?? "Rede"
    : `${req.doctor_profile?.full_name ?? "Médico"} — ${req.doctor?.specialty ?? ""}`;

  return (
    <div className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {viewerType === "doctor"
            ? <Building2 className="h-5 w-5 text-primary" />
            : <Stethoscope className="h-5 w-5 text-primary" />}
          <div>
            <p className="font-semibold leading-tight">{counterpart}</p>
            <p className="text-xs text-muted-foreground">
              {viewerType === "doctor" ? "Solicitação recebida" : "Solicitação enviada"}
            </p>
          </div>
        </div>
        {statusBadge(req.status)}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium capitalize">{formatDate(req.shift_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{req.start_time.slice(0,5)} → {req.end_time.slice(0,5)}</span>
        </div>
        <div className="col-span-2 text-xs text-muted-foreground">
          Duração: <strong className="text-foreground">{req.duration_hours}h</strong>
        </div>
      </div>

      {req.notes && (
        <p className="mt-3 rounded-lg bg-accent/50 px-3 py-2 text-sm text-accent-foreground">
          {req.notes}
        </p>
      )}

      {viewerType === "doctor" && req.status === "pending" && onRespond && (
        <div className="mt-4 flex gap-2">
          <Button onClick={() => onRespond(req.id, "accepted")} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
            Aceitar
          </Button>
          <Button onClick={() => onRespond(req.id, "declined")} variant="outline" className="flex-1">
            Recusar
          </Button>
        </div>
      )}

      {viewerType === "network" && req.status === "pending" && onCancel && (
        <Button onClick={() => onCancel(req.id)} variant="outline" size="sm" className="mt-4 w-full">
          Cancelar solicitação
        </Button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
