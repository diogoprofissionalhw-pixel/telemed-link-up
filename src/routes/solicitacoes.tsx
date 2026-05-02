import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Inbox, MessageSquare, CheckCircle2, XCircle, Search, Filter, Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ChatDialog } from "@/components/chat-dialog";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge, type RequestStatus } from "@/components/dashboard/status-badge";

export const Route = createFileRoute("/solicitacoes")({
  component: SolicitacoesPage,
});

interface Row {
  id: string;
  network_id: string;
  doctor_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  agreed_value: number | null;
  status: RequestStatus;
  notes: string | null;
  created_at: string;
  network?: { network_name: string; avatar_url?: string | null } | null;
  doctor?: { specialty: string; crm: string; crm_uf: string; avatar_url?: string | null; profile?: { full_name: string } | null } | null;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function SolicitacoesPage() {
  const { user, profile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [chatReq, setChatReq] = useState<Row | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);
    const filter = isDoctor ? "doctor_id" : "network_id";
    const select = isDoctor
      ? "*, network:networks(network_name, avatar_url)"
      : "*, doctor:doctors(specialty, crm, crm_uf, avatar_url, profile:profiles(full_name))";
    const { data, error } = await supabase
      .from("shift_requests")
      .select(select)
      .eq(filter, user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, [user, profile, isDoctor]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`sol-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "shift_requests" },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = isDoctor
        ? (r.network?.network_name ?? "")
        : `${r.doctor?.profile?.full_name ?? ""} ${r.doctor?.specialty ?? ""} ${r.doctor?.crm ?? ""}`;
      return hay.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter, isDoctor]);

  const respond = async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase
      .from("shift_requests")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Plantão aceito!" : "Plantão recusado");
    load();
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const { error } = await supabase
      .from("shift_requests")
      .update({ status: "cancelled", cancellation_reason: cancelReason.trim() || null })
      .eq("id", cancelTarget.id);
    if (error) return toast.error(error.message);
    toast.success("Solicitação cancelada");
    setCancelTarget(null);
    setCancelReason("");
    load();
  };

  return (
    <DashboardLayout
      title="Solicitações"
      subtitle={isDoctor ? "Veja e responda às solicitações que você recebeu." : "Acompanhe todas as solicitações enviadas."}
      breadcrumbs={[{ label: "Solicitações" }]}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isDoctor ? "Buscar por rede..." : "Buscar por médico, especialidade ou CRM..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="accepted">Aceito</SelectItem>
            <SelectItem value="declined">Recusado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={rows.length === 0 ? "Nenhuma solicitação ainda" : "Nenhum resultado para os filtros"}
          description={rows.length === 0 ? (isDoctor ? "Você ainda não recebeu solicitações." : "Crie uma nova solicitação no Dashboard.") : "Ajuste a busca ou o filtro de status."}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{isDoctor ? "Rede" : "Médico"}</th>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Horário</th>
                  <th className="px-4 py-3 text-left font-medium">Valor</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const name = isDoctor
                    ? r.network?.network_name ?? "Rede"
                    : r.doctor?.profile?.full_name ?? "Médico";
                  const sub = isDoctor ? "" : `${r.doctor?.specialty ?? ""} • ${r.doctor?.crm ?? ""}/${r.doctor?.crm_uf ?? ""}`;
                  const avatar = isDoctor ? r.network?.avatar_url : r.doctor?.avatar_url;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={avatar ?? undefined} />
                            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-medium">{name}</div>
                            {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-foreground/80">
                          <CalIcon className="h-3.5 w-3.5" />{formatDate(r.shift_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-foreground/80">
                        {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                        <div className="text-xs text-muted-foreground">{r.duration_hours}h</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.agreed_value
                          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.agreed_value)
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {isDoctor && r.status === "pending" && (
                            <>
                              <Button size="sm" variant="ghost" className="text-success" onClick={() => respond(r.id, "accepted")} title="Aceitar">
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeclineId(r.id)} title="Recusar">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {!isDoctor && (r.status === "pending" || r.status === "accepted") && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelTarget(r)} title="Cancelar">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setChatReq(r)} title="Conversar">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {chatReq && user && (
        <ChatDialog
          open={!!chatReq}
          onOpenChange={(v) => !v && setChatReq(null)}
          requestId={chatReq.id}
          currentUserId={user.id}
          otherUserId={isDoctor ? chatReq.network_id : chatReq.doctor_id}
          otherName={isDoctor ? (chatReq.network?.network_name ?? "Rede") : (chatReq.doctor?.profile?.full_name ?? "Médico")}
        />
      )}

      <AlertDialog open={!!declineId} onOpenChange={(v) => !v && setDeclineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recusa</AlertDialogTitle>
            <AlertDialogDescription>
              A rede será notificada e a ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (declineId) await respond(declineId, "declined"); setDeclineId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, recusar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => { if (!v) { setCancelTarget(null); setCancelReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Informe um motivo (opcional) para o médico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo do cancelamento"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
