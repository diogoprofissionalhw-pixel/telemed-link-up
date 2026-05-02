import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Calendar, Clock, Building2, Stethoscope, Plus, CheckCircle2, XCircle, Hourglass, MessageSquare, User as UserIcon, Star, UserCog, Sun, Moon, DollarSign, Search, TrendingUp, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatDialog } from "@/components/chat-dialog";
import { DoctorProfileDialog } from "@/components/doctor-profile-dialog";
import { RatingDialog } from "@/components/rating-dialog";
import { StarRating } from "@/components/star-rating";

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
  shift_period: "morning" | "night" | "custom";
  agreed_value: number | null;
  notes: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  created_at: string;
  network?: { network_name: string; avatar_url?: string | null } | null;
  doctor?: { specialty: string; crm: string; crm_uf: string; avatar_url?: string | null; profile?: { full_name: string } | null } | null;
}

interface DoctorOption {
  id: string;
  specialty: string;
  crm: string;
  crm_uf: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  avg_stars: number;
  rating_count: number;
  accepted_count: number;
}

function statusBadge(status: ShiftRequest["status"]) {
  const map = {
    pending:   { icon: Hourglass,    label: "Pendente",  cls: "bg-warning/15", style: { color: "oklch(0.45 0.12 60)" } },
    accepted:  { icon: CheckCircle2, label: "Aceito",    cls: "bg-success/15", style: { color: "oklch(0.40 0.14 150)" } },
    declined:  { icon: XCircle,      label: "Recusado",  cls: "bg-destructive/10", style: { color: "oklch(0.50 0.20 25)" } },
    cancelled: { icon: XCircle,      label: "Cancelado", cls: "bg-muted", style: { color: "var(--muted-foreground)" } },
    completed: { icon: CheckCircle2, label: "Concluído", cls: "bg-primary/10", style: { color: "var(--primary)" } },
  } as const;
  const { icon: Icon, label, cls, style } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`} style={style}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function periodLabel(p: ShiftRequest["shift_period"]) {
  return p === "morning" ? "Manhã" : p === "night" ? "Noite" : "Personalizado";
}
function periodIcon(p: ShiftRequest["shift_period"]) {
  return p === "morning" ? Sun : p === "night" ? Moon : Clock;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [user, loading, navigate]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <AppShell userType={profile.account_type}>
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
    </AppShell>
  );
}

/* ----------------- DOCTOR PANEL ----------------- */
function DoctorPanel({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatReq, setChatReq] = useState<ShiftRequest | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shift_requests")
      .select("*, network:networks(network_name, avatar_url)")
      .eq("doctor_id", userId)
      .not("status", "in", "(cancelled,completed)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRequests((data ?? []) as ShiftRequest[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`req-doctor-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "shift_requests", filter: `doctor_id=eq.${userId}` },
        () => load())
      .subscribe();
    // Auto-refresh seguro a cada 60s (fallback caso realtime caia)
    const interval = setInterval(load, 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [userId, load]);

  // Toast de novas mensagens recebidas (quando o chat estiver fechado para esse pedido)
  useEffect(() => {
    const ch = supabase
      .channel(`msg-doc-${userId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const msg = payload.new as { request_id: string; content: string };
          if (chatReq?.id === msg.request_id) return;
          toast.message("Nova mensagem", { description: msg.content.slice(0, 80) });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, chatReq?.id]);

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
      <div className="flex justify-end">
        <Link to="/profile">
          <Button variant="outline" className="gap-2">
            <UserCog className="h-4 w-4" /> Editar meu perfil
          </Button>
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Solicitações pendentes ({pending.length})</h2>
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : pending.length === 0 ? (
          <EmptyState text="Nenhuma solicitação pendente no momento." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pending.map(r => (
              <RequestCard key={r.id} req={r} viewerType="doctor"
                onAccept={() => respond(r.id, "accepted")}
                onDecline={() => setDeclineId(r.id)}
                onChat={() => setChatReq(r)} />
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
            {others.map(r => (
              <RequestCard key={r.id} req={r} viewerType="doctor" onChat={() => setChatReq(r)} />
            ))}
          </div>
        )}
      </section>

      {chatReq && (
        <ChatDialog
          open={!!chatReq}
          onOpenChange={(v) => !v && setChatReq(null)}
          requestId={chatReq.id}
          currentUserId={userId}
          otherUserId={chatReq.network_id}
          otherName={chatReq.network?.network_name ?? "Rede"}
        />
      )}

      <AlertDialog open={!!declineId} onOpenChange={(v) => !v && setDeclineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recusa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja recusar este plantão? A rede será notificada e a ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (declineId) await respond(declineId, "declined");
                setDeclineId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function NetworkPanel({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [chatReq, setChatReq] = useState<ShiftRequest | null>(null);
  const [profileDoctorId, setProfileDoctorId] = useState<string | null>(null);
  const [ratingReq, setRatingReq] = useState<ShiftRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ShiftRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shift_requests")
      .select("*, doctor:doctors(specialty, crm, crm_uf, avatar_url, profile:profiles(full_name))")
      .eq("network_id", userId)
      .not("status", "in", "(cancelled,completed)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRequests((data ?? []) as ShiftRequest[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`req-network-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "shift_requests", filter: `network_id=eq.${userId}` },
        () => load())
      .subscribe();
    const interval = setInterval(load, 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [userId, load]);

  // Toast de novas mensagens recebidas
  useEffect(() => {
    const ch = supabase
      .channel(`msg-net-${userId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const msg = payload.new as { request_id: string; content: string };
          if (chatReq?.id === msg.request_id) return;
          toast.message("Nova mensagem", { description: msg.content.slice(0, 80) });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, chatReq?.id]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    const reason = cancelReason.trim();
    const { error } = await supabase
      .from("shift_requests")
      .update({ status: "cancelled", cancellation_reason: reason || null })
      .eq("id", cancelTarget.id);
    setCancelling(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação cancelada — médico será notificado");
    setRequests((prev) => prev.filter((r) => r.id !== cancelTarget.id));
    setCancelTarget(null);
    setCancelReason("");
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
            onViewProfile={(id) => setProfileDoctorId(id)}
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
            <RequestCard
              key={r.id}
              req={r}
              viewerType="network"
              onCancel={() => setCancelTarget(r)}
              onChat={() => setChatReq(r)}
              onViewProfile={() => setProfileDoctorId(r.doctor_id)}
              onRate={() => setRatingReq(r)}
            />
          ))}
        </div>
      )}

      {chatReq && (
        <ChatDialog
          open={!!chatReq}
          onOpenChange={(v) => !v && setChatReq(null)}
          requestId={chatReq.id}
          currentUserId={userId}
          otherUserId={chatReq.doctor_id}
          otherName={chatReq.doctor?.profile?.full_name ?? "Médico"}
        />
      )}
      {profileDoctorId && (
        <DoctorProfileDialog
          open={!!profileDoctorId}
          onOpenChange={(v) => !v && setProfileDoctorId(null)}
          doctorId={profileDoctorId}
        />
      )}
      {ratingReq && (
        <RatingDialog
          open={!!ratingReq}
          onOpenChange={(v) => !v && setRatingReq(null)}
          requestId={ratingReq.id}
          doctorId={ratingReq.doctor_id}
          networkId={userId}
        />
      )}

      {/* Cancelamento com motivo opcional */}
      <Dialog open={!!cancelTarget} onOpenChange={(v) => { if (!v) { setCancelTarget(null); setCancelReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O médico será notificado imediatamente e a solicitação sairá da sua lista de pedidos ativos.
            </p>
            <div>
              <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={300}
                placeholder="Ex: Plantão remarcado, paciente desistiu..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(""); }}>
              Voltar
            </Button>
            <Button
              onClick={confirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------- NEW REQUEST DIALOG ----------------- */
const PRESETS: Record<"morning" | "night", { start: string; end: string }> = {
  morning: { start: "07:00", end: "13:00" },
  night:   { start: "19:00", end: "07:00" },
};

function NewRequestDialog({
  networkId, onCreated, onViewProfile,
}: { networkId: string; onCreated: () => void; onViewProfile: (id: string) => void }) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState<string>("");
  const [period, setPeriod] = useState<"morning" | "night" | "custom">("night");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("19:00");
  const [end, setEnd] = useState("07:00");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [platformAvgHours, setPlatformAvgHours] = useState<number | null>(null);

  // Filtros de busca
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [filterUf, setFilterUf] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [{ data: docs }, { data: ratings }, { data: completedShifts }, { data: allShifts }] = await Promise.all([
        supabase.from("doctors").select("id, specialty, crm, crm_uf, avatar_url, city, state, profiles!inner(full_name)"),
        supabase.from("ratings").select("doctor_id, stars"),
        supabase.from("shift_requests").select("doctor_id, status").in("status", ["accepted", "completed"]),
        supabase.from("shift_requests").select("duration_hours").in("status", ["accepted", "completed"]),
      ]);
      const ratingMap = new Map<string, { sum: number; n: number }>();
      (ratings ?? []).forEach((r: any) => {
        const cur = ratingMap.get(r.doctor_id) ?? { sum: 0, n: 0 };
        cur.sum += r.stars; cur.n += 1;
        ratingMap.set(r.doctor_id, cur);
      });
      const acceptedMap = new Map<string, number>();
      (completedShifts ?? []).forEach((s: any) => {
        acceptedMap.set(s.doctor_id, (acceptedMap.get(s.doctor_id) ?? 0) + 1);
      });
      const list: DoctorOption[] = (docs ?? []).map((d: any) => {
        const ag = ratingMap.get(d.id);
        return {
          id: d.id,
          specialty: d.specialty,
          crm: d.crm,
          crm_uf: d.crm_uf,
          avatar_url: d.avatar_url ?? null,
          city: d.city ?? null,
          state: d.state ?? null,
          full_name: d.profiles?.full_name ?? "Médico",
          avg_stars: ag ? ag.sum / ag.n : 0,
          rating_count: ag?.n ?? 0,
          accepted_count: acceptedMap.get(d.id) ?? 0,
        };
      });
      setDoctors(list);
      // Duração média da plataforma
      const hoursArr = (allShifts ?? []).map((s: any) => Number(s.duration_hours)).filter((n) => !isNaN(n) && n > 0);
      if (hoursArr.length > 0) {
        setPlatformAvgHours(hoursArr.reduce((a, b) => a + b, 0) / hoursArr.length);
      }
    })();
  }, []);

  // Lista de especialidades e UFs disponíveis
  const specialties = useMemo(
    () => Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean))).sort(),
    [doctors],
  );
  const ufs = useMemo(
    () => Array.from(new Set(doctors.map(d => d.state).filter((x): x is string => !!x))).sort(),
    [doctors],
  );

  // Filtragem + ordenação inteligente:
  // 5 estrelas no topo -> avaliação desc -> nº atendimentos desc -> nome
  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors
      .filter(d => {
        if (filterSpecialty !== "all" && d.specialty !== filterSpecialty) return false;
        if (filterUf !== "all" && d.state !== filterUf) return false;
        if (!q) return true;
        return (
          d.full_name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          (d.city ?? "").toLowerCase().includes(q) ||
          (d.state ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aTop = a.avg_stars >= 5 && a.rating_count > 0 ? 1 : 0;
        const bTop = b.avg_stars >= 5 && b.rating_count > 0 ? 1 : 0;
        if (aTop !== bTop) return bTop - aTop;
        if (b.avg_stars !== a.avg_stars) return b.avg_stars - a.avg_stars;
        if (b.accepted_count !== a.accepted_count) return b.accepted_count - a.accepted_count;
        return a.full_name.localeCompare(b.full_name);
      });
  }, [doctors, search, filterSpecialty, filterUf]);

  const onPeriodChange = (p: "morning" | "night" | "custom") => {
    setPeriod(p);
    if (p !== "custom") {
      setStart(PRESETS[p].start);
      setEnd(PRESETS[p].end);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return toast.error("Selecione um médico");
    if (!date || !start || !end) return toast.error("Preencha data e horários");
    const hours = calcHours(start, end);
    if (hours <= 0) return toast.error("Horário inválido");
    const valNum = value.trim() ? Number(value.replace(",", ".")) : null;
    if (value.trim() && (valNum === null || isNaN(valNum) || valNum < 0)) {
      return toast.error("Valor inválido");
    }

    setSubmitting(true);
    const { error } = await supabase.from("shift_requests").insert({
      network_id: networkId,
      doctor_id: doctorId,
      shift_date: date,
      start_time: start,
      end_time: end,
      duration_hours: hours,
      shift_period: period,
      agreed_value: valNum,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação enviada!");
    onCreated();
  };

  const selected = doctors.find(d => d.id === doctorId);
  const currentHours = calcHours(start, end);

  return (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nova solicitação de plantão</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {/* Busca avançada */}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Buscar médico
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome, especialidade, cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger><SelectValue placeholder="Especialidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas especialidades</SelectItem>
                {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterUf} onValueChange={setFilterUf}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas UFs</SelectItem>
                {ufs.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ordenado por: 5★ no topo → melhor avaliação → mais atendimentos
          </p>
        </div>

        <div>
          <Label>Médico ({filteredDoctors.length} {filteredDoctors.length === 1 ? "encontrado" : "encontrados"})</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder={filteredDoctors.length ? "Selecione o médico" : "Nenhum médico encontrado"} />
            </SelectTrigger>
            <SelectContent>
              {filteredDoctors.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {d.avatar_url && <AvatarImage src={d.avatar_url} alt={d.full_name} />}
                      <AvatarFallback className="text-[10px]">{d.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>
                      {d.avg_stars >= 5 && d.rating_count > 0 && "⭐ "}
                      {d.full_name} — {d.specialty}
                      {d.rating_count > 0 ? ` ★${d.avg_stars.toFixed(1)}` : ""}
                      {d.accepted_count > 0 ? ` · ${d.accepted_count} plantões` : ""}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  {selected.avatar_url && <AvatarImage src={selected.avatar_url} alt={selected.full_name} />}
                  <AvatarFallback>{selected.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{selected.full_name}</p>
                  <div className="flex items-center gap-1.5">
                    <StarRating value={selected.avg_stars} readonly size={12} />
                    <span className="text-muted-foreground">
                      {selected.rating_count > 0 ? `${selected.avg_stars.toFixed(1)} (${selected.rating_count})` : "Sem avaliações"}
                      {selected.accepted_count > 0 ? ` · ${selected.accepted_count} plantões` : ""}
                      {selected.city ? ` • ${selected.city}/${selected.state ?? ""}` : ""}
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => onViewProfile(selected.id)} className="font-medium text-primary hover:underline whitespace-nowrap">
                Ver currículo
              </button>
            </div>
          )}
        </div>

        <div>
          <Label>Turno</Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: "morning" as const, label: "Manhã", icon: Sun },
              { v: "night"   as const, label: "Noite", icon: Moon },
              { v: "custom"  as const, label: "Outro", icon: Clock },
            ]).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => onPeriodChange(opt.v)}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-sm font-medium transition-colors ${
                  period === opt.v ? "border-primary bg-accent" : "border-border hover:bg-muted"
                }`}
              >
                <opt.icon className="h-4 w-4" /> {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="d">Data do plantão</Label>
          <Input id="d" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="s">Início</Label>
            <Input id="s" type="time" value={start} onChange={e => { setStart(e.target.value); setPeriod("custom"); }} required />
          </div>
          <div>
            <Label htmlFor="e">Fim</Label>
            <Input id="e" type="time" value={end} onChange={e => { setEnd(e.target.value); setPeriod("custom"); }} required />
          </div>
        </div>
        <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-1">
          <p>
            Duração desta solicitação: <strong className="text-foreground">{currentHours}h</strong>
          </p>
          {platformAvgHours !== null && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Média da plataforma: <strong className="text-foreground">{platformAvgHours.toFixed(1)}h</strong> por plantão
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="v">Valor acordado (R$)</Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="v" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" className="pl-8" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Opcional. Valor combinado entre rede e médico.</p>
        </div>

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
  req, viewerType, onAccept, onDecline, onCancel, onChat, onViewProfile, onRate,
}: {
  req: ShiftRequest;
  viewerType: "doctor" | "network";
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onChat?: () => void;
  onViewProfile?: () => void;
  onRate?: () => void;
}) {
  const counterpartName = viewerType === "doctor"
    ? req.network?.network_name ?? "Rede"
    : req.doctor?.profile?.full_name ?? "Médico";
  const counterpartSubtitle = viewerType === "doctor"
    ? "Solicitação recebida"
    : req.doctor?.specialty ?? "";
  const avatarUrl = viewerType === "doctor" ? req.network?.avatar_url : req.doctor?.avatar_url;
  const PIcon = periodIcon(req.shift_period);

  return (
    <div className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={counterpartName} />}
            <AvatarFallback className="bg-accent">
              {viewerType === "doctor"
                ? <Building2 className="h-5 w-5 text-primary" />
                : <Stethoscope className="h-5 w-5 text-primary" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold leading-tight">{counterpartName}</p>
            <p className="text-xs text-muted-foreground">{counterpartSubtitle}</p>
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
          <PIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{periodLabel(req.shift_period)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{req.start_time.slice(0,5)} → {req.end_time.slice(0,5)}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {req.agreed_value != null
              ? req.agreed_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : "A combinar"}
          </span>
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

      {viewerType === "doctor" && req.status === "pending" && onAccept && onDecline && (
        <div className="mt-4 flex gap-2">
          <Button onClick={onAccept} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
            Aceitar
          </Button>
          <Button onClick={onDecline} variant="outline" className="flex-1">
            Recusar
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {onChat && (
          <Button onClick={onChat} variant="outline" size="sm" className="gap-1.5 flex-1">
            <MessageSquare className="h-4 w-4" /> Mensagens
          </Button>
        )}
        {viewerType === "network" && onViewProfile && (
          <Button onClick={onViewProfile} variant="outline" size="sm" className="gap-1.5 flex-1">
            <UserIcon className="h-4 w-4" /> Currículo
          </Button>
        )}
        {viewerType === "network" && req.status === "accepted" && onRate && (
          <Button onClick={onRate} variant="outline" size="sm" className="gap-1.5 flex-1">
            <Star className="h-4 w-4" /> Avaliar
          </Button>
        )}
        {viewerType === "network" && (req.status === "pending" || req.status === "accepted") && onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
          >
            Cancelar
          </Button>
        )}
      </div>
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
