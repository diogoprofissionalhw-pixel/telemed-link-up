import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Calendar, Clock, Building2, Stethoscope, Plus, CheckCircle2, XCircle, Hourglass, MessageSquare, User as UserIcon, Star, UserCog, Sun, Moon, DollarSign, Search, TrendingUp, Filter, Inbox, CalendarCheck, Briefcase, Sparkles, ShieldCheck, ShieldQuestion, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
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
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EmptyState as EmptyStateBox } from "@/components/dashboard/empty-state";
import { ReputationSummary } from "@/components/reputation-summary";
import { NetworkAnalytics } from "@/components/network-analytics";

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
  crm_status: "verified" | "pending" | "invalid";
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  avg_stars: number;
  rating_count: number;
  accepted_count: number;
  total_count: number;
  has_availability: boolean;
  has_conflict: boolean;
  match_score: number;
  match_tier: "best" | "high" | "medium" | "low";
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
  const { user, profile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";

  return (
    <DashboardLayout
      title={profile ? `Olá, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
      subtitle={isDoctor ? "Resumo do seu painel médico." : "Resumo da sua rede."}
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      {user && profile && (
        <>
          {isDoctor && <DashboardStats userId={user.id} userType={profile.account_type} />}
          <div className={isDoctor ? "mt-8" : ""}>
            {isDoctor
              ? <DoctorPanel userId={user.id} />
              : <NetworkPanel userId={user.id} />}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

/* ----------------- DASHBOARD STATS ----------------- */
function DashboardStats({ userId, userType }: { userId: string; userType: "doctor" | "network" }) {
  const [stats, setStats] = useState({ total: 0, monthCompleted: 0, todayUpcoming: 0, avgRating: 0, ratingCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const filter = userType === "doctor" ? "doctor_id" : "network_id";
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

      const [{ count: total }, { count: monthCompleted }, { count: todayUpcoming }] = await Promise.all([
        supabase.from("shift_requests").select("*", { count: "exact", head: true }).eq(filter, userId),
        supabase.from("shift_requests").select("*", { count: "exact", head: true }).eq(filter, userId).eq("status", "completed").gte("shift_date", monthStart),
        supabase.from("shift_requests").select("*", { count: "exact", head: true }).eq(filter, userId).eq("status", "accepted").eq("shift_date", today),
      ]);

      let avgRating = 0;
      let ratingCount = 0;
      if (userType === "doctor") {
        const { data: r } = await supabase.from("ratings").select("stars").eq("doctor_id", userId);
        if (r && r.length > 0) {
          ratingCount = r.length;
          avgRating = r.reduce((a, b) => a + b.stars, 0) / r.length;
        }
      }

      setStats({
        total: total ?? 0,
        monthCompleted: monthCompleted ?? 0,
        todayUpcoming: todayUpcoming ?? 0,
        avgRating,
        ratingCount,
      });
      setLoading(false);
    })();
  }, [userId, userType]);

  if (userType === "doctor") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Solicitações" value={stats.total} icon={Inbox} loading={loading} hint="Total recebido" />
        <StatsCard label="Realizadas no mês" value={stats.monthCompleted} icon={CalendarCheck} loading={loading} />
        <StatsCard label="Hoje" value={stats.todayUpcoming} icon={Calendar} loading={loading} hint="Plantões agendados" />
        <StatsCard
          label="Avaliação"
          value={stats.ratingCount > 0 ? `${stats.avgRating.toFixed(1)} ★` : "—"}
          icon={Star}
          loading={loading}
          hint={stats.ratingCount > 0 ? `${stats.ratingCount} ${stats.ratingCount === 1 ? "avaliação" : "avaliações"}` : "Sem avaliações"}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard label="Solicitações" value={stats.total} icon={Inbox} loading={loading} hint="Total enviado" />
      <StatsCard label="Realizadas no mês" value={stats.monthCompleted} icon={CalendarCheck} loading={loading} />
      <StatsCard label="Hoje" value={stats.todayUpcoming} icon={Calendar} loading={loading} hint="Plantões agendados" />
      <StatsCard label="Contratações ativas" value={stats.todayUpcoming + stats.monthCompleted} icon={Briefcase} loading={loading} hint="Aceitas + concluídas" />
    </div>
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

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link to="/profile">
          <Button variant="outline" className="gap-2">
            <UserCog className="h-4 w-4" /> Editar meu perfil
          </Button>
        </Link>
      </div>

      <ReputationSummary doctorId={userId} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Solicitações pendentes ({pending.length})</h2>
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : pending.length === 0 ? (
          <EmptyStateBox icon={Inbox} title="Nenhuma solicitação pendente no momento." />
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
      <NetworkAnalytics networkId={userId} />

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
        <EmptyStateBox icon={Inbox} title="Você ainda não enviou solicitações" description="Crie a primeira clicando em Nova solicitação." />
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

/* ----------------- NEW REQUEST DIALOG (Match Inteligente) ----------------- */
const PRESETS: Record<"morning" | "night", { start: string; end: string }> = {
  morning: { start: "07:00", end: "13:00" },
  night:   { start: "19:00", end: "07:00" },
};

// Mapa simplificado de fuso horário por UF brasileira
const UF_TZ: Record<string, number> = {
  AC: -5, AM: -4, RR: -4, RO: -4, MT: -4, MS: -4,
  PA: -3, AP: -3, TO: -3, MA: -3, PI: -3, CE: -3, RN: -3, PB: -3, PE: -3, AL: -3, SE: -3, BA: -3,
  DF: -3, GO: -3, MG: -3, ES: -3, RJ: -3, SP: -3, PR: -3, SC: -3, RS: -3,
};

// Lista completa de especialidades médicas reconhecidas (CFM)
const ALL_SPECIALTIES = [
  "Acupuntura","Alergia e Imunologia","Anestesiologia","Angiologia","Cardiologia",
  "Cirurgia Cardiovascular","Cirurgia da Mão","Cirurgia de Cabeça e Pescoço","Cirurgia do Aparelho Digestivo",
  "Cirurgia Geral","Cirurgia Pediátrica","Cirurgia Plástica","Cirurgia Torácica","Cirurgia Vascular",
  "Clínica Médica","Coloproctologia","Dermatologia","Endocrinologia","Endoscopia",
  "Gastroenterologia","Genética Médica","Geriatria","Ginecologia e Obstetrícia","Hematologia",
  "Homeopatia","Infectologia","Mastologia","Medicina de Família e Comunidade","Medicina do Trabalho",
  "Medicina do Tráfego","Medicina de Emergência","Medicina Esportiva","Medicina Física e Reabilitação",
  "Medicina Intensiva","Medicina Legal","Medicina Nuclear","Medicina Preventiva","Nefrologia",
  "Neurocirurgia","Neurologia","Nutrologia","Oftalmologia","Oncologia Clínica","Ortopedia e Traumatologia",
  "Otorrinolaringologia","Patologia","Patologia Clínica","Pediatria","Pneumologia","Psiquiatria",
  "Radiologia e Diagnóstico por Imagem","Radioterapia","Reumatologia","Telemedicina","Urologia",
];

function tierLabel(tier: DoctorOption["match_tier"]) {
  switch (tier) {
    case "best": return { emoji: "⭐", text: "Melhor match", cls: "bg-warning/20 text-warning-foreground", color: "oklch(0.45 0.15 80)" };
    case "high": return { emoji: "🟢", text: "Alta compatibilidade", cls: "bg-success/15", color: "oklch(0.40 0.14 150)" };
    case "medium": return { emoji: "🟡", text: "Média compatibilidade", cls: "bg-warning/15", color: "oklch(0.45 0.12 60)" };
    default: return { emoji: "⚪", text: "Baixa", cls: "bg-muted", color: "var(--muted-foreground)" };
  }
}

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
  const [networkUf, setNetworkUf] = useState<string>("");

  // Critérios de match
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState<string>("0");
  const [minYears, setMinYears] = useState<string>("0");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [filterUf, setFilterUf] = useState<string>("all");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [maxValue, setMaxValue] = useState<string>("");

  useEffect(() => {
    (async () => {
      // Carrega rede para obter UF de referência (legislação/fuso)
      const { data: net } = await supabase.from("networks").select("id").eq("id", networkId).maybeSingle();
      // Não temos UF na rede; deixar usuário escolher mais tarde se quiser
      void net;

      const [{ data: docs }, { data: ratings }, { data: shifts }, { data: avails }] = await Promise.all([
        supabase.from("doctors").select("id, specialty, crm, crm_uf, crm_status, avatar_url, city, state, years_experience, profiles!inner(full_name)"),
        supabase.from("ratings").select("doctor_id, stars"),
        supabase.from("shift_requests").select("doctor_id, status, shift_date, start_time, end_time").in("status", ["accepted", "completed", "pending"]),
        supabase.from("doctor_availabilities").select("doctor_id, available_date, start_time, end_time"),
      ]);

      const ratingMap = new Map<string, { sum: number; n: number }>();
      (ratings ?? []).forEach((r: any) => {
        const cur = ratingMap.get(r.doctor_id) ?? { sum: 0, n: 0 };
        cur.sum += r.stars; cur.n += 1;
        ratingMap.set(r.doctor_id, cur);
      });
      const acceptedMap = new Map<string, number>();
      const totalMap = new Map<string, number>();
      (shifts ?? []).forEach((s: any) => {
        totalMap.set(s.doctor_id, (totalMap.get(s.doctor_id) ?? 0) + 1);
        if (s.status === "accepted" || s.status === "completed") {
          acceptedMap.set(s.doctor_id, (acceptedMap.get(s.doctor_id) ?? 0) + 1);
        }
      });

      const list: DoctorOption[] = (docs ?? []).map((d: any) => {
        const ag = ratingMap.get(d.id);
        return {
          id: d.id,
          specialty: d.specialty,
          crm: d.crm,
          crm_uf: d.crm_uf,
          crm_status: (d.crm_status ?? "pending") as "verified" | "pending" | "invalid",
          avatar_url: d.avatar_url ?? null,
          city: d.city ?? null,
          state: d.state ?? null,
          years_experience: d.years_experience ?? null,
          full_name: d.profiles?.full_name ?? "Médico",
          avg_stars: ag ? ag.sum / ag.n : 0,
          rating_count: ag?.n ?? 0,
          accepted_count: acceptedMap.get(d.id) ?? 0,
          total_count: totalMap.get(d.id) ?? 0,
          has_availability: false,
          has_conflict: false,
          match_score: 0,
          match_tier: "low",
        };
      });

      // Salva referências para cálculo dinâmico
      (window as any).__avails = avails ?? [];
      (window as any).__shifts = shifts ?? [];
      setDoctors(list);
    })();
  }, [networkId]);

  // União das especialidades cadastradas + lista oficial completa
  const specialties = useMemo(() => {
    const set = new Set<string>([...ALL_SPECIALTIES, ...doctors.map(d => d.specialty).filter(Boolean)]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [doctors]);

  // Recalcula match sempre que mudam critérios de horário/data/especialidade
  const ranked = useMemo(() => {
    const avails = ((window as any).__avails ?? []) as Array<{ doctor_id: string; available_date: string; start_time: string; end_time: string }>;
    const shifts = ((window as any).__shifts ?? []) as Array<{ doctor_id: string; status: string; shift_date: string; start_time: string; end_time: string }>;
    const q = search.trim().toLowerCase();
    const minR = Number(minRating);
    const minY = Number(minYears);
    const refTz = networkUf ? UF_TZ[networkUf] : null;

    const list = doctors
      // CRM inválido nunca aparece no match
      .filter(d => d.crm_status !== "invalid")
      .filter(d => {
        if (filterSpecialty !== "all" && d.specialty !== filterSpecialty) return false;
        if (minR > 0 && d.avg_stars < minR) return false;
        if (minY > 0 && (d.years_experience ?? 0) < minY) return false;
        if (filterUf !== "all" && d.state !== filterUf && d.crm_uf !== filterUf) return false;
        if (onlyVerified && d.crm_status !== "verified") return false;
        if (!q) return true;
        return (
          d.full_name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          (d.city ?? "").toLowerCase().includes(q)
        );
      })
      .map(d => {
        // Disponibilidade declarada cobrindo o horário?
        const hasAvail = !!date && !!start && !!end && avails.some(a =>
          a.doctor_id === d.id &&
          a.available_date === date &&
          a.start_time <= start &&
          a.end_time >= (end > start ? end : "23:59")
        );
        // Conflito com plantão já aceito/pendente?
        const hasConflict = !!date && shifts.some(s =>
          s.doctor_id === d.id &&
          s.shift_date === date &&
          (s.status === "accepted" || s.status === "pending") &&
          !(s.end_time <= start || s.start_time >= end)
        );

        // Score
        let score = 0;
        // Especialidade compatível (peso muito alto: 35)
        if (filterSpecialty !== "all" && d.specialty === filterSpecialty) score += 35;
        else if (filterSpecialty === "all") score += 15; // neutro
        // Disponibilidade no horário (peso muito alto: 30)
        if (hasAvail) score += 30;
        if (hasConflict) score -= 40;
        // Fuso horário (peso alto: 12) - mesma faixa de UTC
        if (refTz !== null && d.state && UF_TZ[d.state] === refTz) score += 12;
        else if (refTz !== null && d.state && UF_TZ[d.state] !== undefined) score += 4;
        // Experiência (peso médio: 8)
        score += Math.min(8, (d.years_experience ?? 0) * 0.8);
        // Avaliação (peso médio: 8)
        if (d.rating_count > 0) score += (d.avg_stars / 5) * 8;
        // Histórico aceitação (peso médio: 7)
        const acceptRate = d.total_count > 0 ? d.accepted_count / d.total_count : 0;
        score += acceptRate * 7;

        // CRM verificado bonus
        if (d.crm_status === "verified") score += 5;

        let tier: DoctorOption["match_tier"];
        if (score >= 75) tier = "best";
        else if (score >= 55) tier = "high";
        else if (score >= 35) tier = "medium";
        else tier = "low";

        return { ...d, has_availability: hasAvail, has_conflict: hasConflict, match_score: Math.max(0, Math.round(score)), match_tier: tier };
      })
      .filter(d => !onlyAvailable || d.has_availability)
      .sort((a, b) => b.match_score - a.match_score);

    return list;
  }, [doctors, filterSpecialty, search, minRating, minYears, onlyAvailable, date, start, end, networkUf, filterUf, onlyVerified]);

  const onPeriodChange = (p: "morning" | "night" | "custom") => {
    setPeriod(p);
    if (p !== "custom") {
      setStart(PRESETS[p].start);
      setEnd(PRESETS[p].end);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return toast.error("Selecione um médico para convidar");
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
    toast.success("Convite enviado ao médico!");
    onCreated();
  };

  return (
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Match inteligente — Telemedicina
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {/* Critérios do plantão */}
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Especialidade desejada</Label>
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger><SelectValue placeholder="Selecione a especialidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer especialidade</SelectItem>
                {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="d">Data do plantão</Label>
            <Input id="d" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>UF de referência (fuso/legislação)</Label>
            <Select value={networkUf} onValueChange={setNetworkUf}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {Object.keys(UF_TZ).sort().map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Turno</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { v: "morning" as const, label: "Manhã", icon: Sun },
                { v: "night"   as const, label: "Noite", icon: Moon },
                { v: "custom"  as const, label: "Outro", icon: Clock },
              ]).map((opt) => (
                <button key={opt.v} type="button" onClick={() => onPeriodChange(opt.v)}
                  className={`flex items-center justify-center gap-1 rounded-md border p-1.5 text-xs font-medium ${period === opt.v ? "border-primary bg-accent" : "border-border"}`}>
                  <opt.icon className="h-3 w-3" /> {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="s">Início</Label>
              <Input id="s" type="time" value={start} onChange={e => { setStart(e.target.value); setPeriod("custom"); }} required />
            </div>
            <div>
              <Label htmlFor="e">Fim</Label>
              <Input id="e" type="time" value={end} onChange={e => { setEnd(e.target.value); setPeriod("custom"); }} required />
            </div>
          </div>
        </div>

        {/* Filtros adicionais */}
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={minRating} onValueChange={setMinRating}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Qualquer ★</SelectItem>
              <SelectItem value="3">3★+</SelectItem>
              <SelectItem value="4">4★+</SelectItem>
              <SelectItem value="4.5">4.5★+</SelectItem>
            </SelectContent>
          </Select>
          <Select value={minYears} onValueChange={setMinYears}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Qualquer exp.</SelectItem>
              <SelectItem value="2">2+ anos</SelectItem>
              <SelectItem value="5">5+ anos</SelectItem>
              <SelectItem value="10">10+ anos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mais filtros: localização, CRM verificado, orçamento */}
        <div className="grid gap-2 sm:grid-cols-4">
          <Select value={filterUf} onValueChange={setFilterUf}>
            <SelectTrigger><SelectValue placeholder="UF do médico" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer UF</SelectItem>
              {Object.keys(UF_TZ).sort().map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              inputMode="decimal"
              placeholder="Orçamento máx (R$)"
              value={maxValue}
              onChange={e => setMaxValue(e.target.value)}
              className="pl-8"
            />
          </div>
          <label className="flex items-center gap-2 rounded-md border px-3 text-xs">
            <input type="checkbox" checked={onlyVerified} onChange={e => setOnlyVerified(e.target.checked)} className="rounded" />
            Apenas CRM verificado
          </label>
          <label className="flex items-center gap-2 rounded-md border px-3 text-xs">
            <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} className="rounded" />
            Apenas disponíveis
          </label>
        </div>

        {/* Ranking */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Ranking ({ranked.length})</Label>
            <p className="text-[10px] text-muted-foreground">Score: especialidade · disponibilidade · fuso · exp · ★ · histórico</p>
          </div>
          {ranked.length === 0 ? (
            <p className="rounded-md border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum médico atende aos critérios.
            </p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {ranked.map((d) => {
                const tier = tierLabel(d.match_tier);
                const isSelected = doctorId === d.id;
                return (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setDoctorId(d.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${isSelected ? "border-primary bg-accent/40" : "border-border hover:bg-muted/40"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {d.avatar_url && <AvatarImage src={d.avatar_url} alt={d.full_name} />}
                        <AvatarFallback>{d.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{d.full_name}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tier.cls}`} style={{ color: tier.color }}>
                            {tier.emoji} {tier.text}
                          </span>
                          {d.crm_status === "verified" ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-success" title="CRM verificado">
                              <ShieldCheck className="h-3 w-3" /> CRM ok
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-warning" title="Em análise">
                              <ShieldQuestion className="h-3 w-3" /> Em análise
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {d.specialty} · CRM {d.crm}/{d.crm_uf}
                          {d.state ? ` · ${d.state}` : ""}
                          {d.years_experience ? ` · ${d.years_experience}a exp` : ""}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>★ {d.rating_count > 0 ? d.avg_stars.toFixed(1) : "—"}</span>
                          <span>· {d.accepted_count} plantões</span>
                          {d.has_availability && <span className="text-success font-medium">· Disponível</span>}
                          {d.has_conflict && <span className="text-destructive font-medium">· Conflito</span>}
                          <span className="ml-auto font-semibold text-foreground">Score {d.match_score}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex justify-end">
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); onViewProfile(d.id); }}
                          className="text-xs font-medium text-primary hover:underline">
                          Ver currículo
                        </button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="v">Valor acordado (R$)</Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="v" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder={maxValue ? `Sugerido: até ${maxValue}` : "0,00"} className="pl-8" />
          </div>
        </div>

        <div>
          <Label htmlFor="n">Observações</Label>
          <Textarea id="n" value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} placeholder="Detalhes do plantão de telemedicina..." />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={submitting || !doctorId} className="w-full sm:w-auto gap-2">
            <Send className="h-4 w-4" />
            {submitting ? "Enviando..." : "Convidar médico"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
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
