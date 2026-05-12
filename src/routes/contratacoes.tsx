import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge, type RequestStatus } from "@/components/dashboard/status-badge";

export const Route = createFileRoute("/contratacoes")({
  head: () => ({
    meta: [
      { title: "Contratações — Connect-Med" },
      { name: "description", content: "Veja contratações de plantões realizadas pela sua rede ou aceitas como médico." },
      { property: "og:title", content: "Contratações — Connect-Med" },
      { property: "og:description", content: "Veja contratações de plantões realizadas pela sua rede ou aceitas como médico." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ContratacoesPage,
});

interface Row {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: RequestStatus;
  agreed_value: number | null;
  doctor?: { specialty: string; profile?: { full_name: string } | null } | null;
}

function ContratacoesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("shift_requests")
        .select("id, shift_date, start_time, end_time, status, agreed_value, doctor:doctors(specialty, profile:profiles(full_name))")
        .eq("network_id", user.id)
        .in("status", ["accepted", "completed"])
        .order("shift_date", { ascending: false });
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardLayout
      title="Contratações"
      subtitle="Acompanhe os médicos que aceitaram seus plantões."
      breadcrumbs={[{ label: "Contratações" }]}
      requireUserType="network"
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhuma contratação ainda" description="Quando médicos aceitarem suas solicitações, eles aparecerão aqui." />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Médico</th>
                <th className="px-4 py-3 text-left">Especialidade</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Horário</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{r.doctor?.profile?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.doctor?.specialty ?? "—"}</td>
                  <td className="px-4 py-3">{new Date(r.shift_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}</td>
                  <td className="px-4 py-3">
                    {r.agreed_value ? r.agreed_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
