import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, Building2, Sun, Moon, Clock as ClockIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SearchInput } from "@/components/dashboard/search-input";

export const Route = createFileRoute("/consultas")({
  head: () => ({
    meta: [
      { title: "Consultas — Connect-Med" },
      { name: "description", content: "Acompanhe suas consultas e plantões agendados em tempo real." },
      { property: "og:title", content: "Consultas — Connect-Med" },
      { property: "og:description", content: "Acompanhe suas consultas e plantões agendados em tempo real." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConsultasPage,
});

interface Row {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_period: "morning" | "night" | "custom";
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  network?: { network_name: string } | null;
  doctor?: { specialty: string; profile?: { full_name: string } | null } | null;
}

function ConsultasPage() {
  const { user, profile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      setLoading(true);
      const select = isDoctor
        ? "id, shift_date, start_time, end_time, shift_period, status, network:networks(network_name)"
        : "id, shift_date, start_time, end_time, shift_period, status, doctor:doctors(specialty, profile:profiles(full_name))";
      const filter = isDoctor ? "doctor_id" : "network_id";
      const { data } = await supabase
        .from("shift_requests")
        .select(select)
        .eq(filter, user.id)
        .in("status", ["accepted", "completed"])
        .order("shift_date", { ascending: false });
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, [user, profile, isDoctor]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const name = isDoctor ? r.network?.network_name : r.doctor?.profile?.full_name;
    return name?.toLowerCase().includes(s) || r.shift_date.includes(s);
  });

  return (
    <DashboardLayout
      title="Consultas"
      subtitle={isDoctor ? "Plantões aceitos e realizados." : "Plantões em andamento e finalizados."}
      breadcrumbs={[{ label: "Consultas" }]}
    >
      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou data..." />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Nenhuma consulta encontrada"
          description={isDoctor ? "Quando você aceitar plantões, eles aparecerão aqui." : "Quando médicos aceitarem suas solicitações, os plantões aparecerão aqui."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{isDoctor ? "Rede" : "Médico"}</th>
                <th className="px-4 py-3 text-left">{isDoctor ? "—" : "Especialidade"}</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Turno</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const PeriodIcon = r.shift_period === "morning" ? Sun : r.shift_period === "night" ? Moon : ClockIcon;
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {isDoctor ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <Stethoscope className="h-4 w-4 text-muted-foreground" />}
                        {isDoctor ? r.network?.network_name : r.doctor?.profile?.full_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{isDoctor ? "—" : (r.doctor?.specialty ?? "—")}</td>
                    <td className="px-4 py-3">{new Date(r.shift_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <PeriodIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
