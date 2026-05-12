import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, CalendarCheck, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EmptyState } from "@/components/dashboard/empty-state";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Connect-Med" },
      { name: "description", content: "Métricas de desempenho dos seus plantões: receita, horas e tendências." },
      { property: "og:title", content: "Relatórios — Connect-Med" },
      { property: "og:description", content: "Métricas de desempenho dos seus plantões: receita, horas e tendências." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RelatoriosPage,
});

interface Row {
  shift_date: string;
  status: string;
  agreed_value: number | null;
  duration_hours: number;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "oklch(0.55 0.15 150)",
  accepted: "oklch(0.60 0.15 230)",
  pending: "oklch(0.70 0.12 80)",
  declined: "oklch(0.55 0.18 25)",
  cancelled: "oklch(0.65 0.02 250)",
};
const STATUS_LABEL: Record<string, string> = {
  completed: "Concluído", accepted: "Aceito", pending: "Pendente", declined: "Recusado", cancelled: "Cancelado",
};

function RelatoriosPage() {
  const { user, profile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      setLoading(true);
      const filter = isDoctor ? "doctor_id" : "network_id";
      const { data } = await supabase
        .from("shift_requests")
        .select("shift_date, status, agreed_value, duration_hours")
        .eq(filter, user.id);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [user, profile, isDoctor]);

  const stats = useMemo(() => {
    const completed = rows.filter(r => r.status === "completed");
    const totalValue = completed.reduce((a, r) => a + (r.agreed_value ?? 0), 0);
    const totalHours = completed.reduce((a, r) => a + Number(r.duration_hours ?? 0), 0);
    return {
      total: rows.length,
      completed: completed.length,
      totalValue,
      totalHours,
    };
  }, [rows]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.status !== "completed") continue;
      const d = new Date(r.shift_date + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => {
        const [y, m] = month.split("-");
        return { month: `${m}/${y.slice(2)}`, count };
      });
  }, [rows]);

  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return Array.from(counts.entries()).map(([status, count]) => ({
      name: STATUS_LABEL[status] ?? status,
      value: count,
      color: STATUS_COLORS[status] ?? "oklch(0.7 0.05 250)",
    }));
  }, [rows]);

  return (
    <DashboardLayout
      title="Relatórios"
      subtitle="Métricas de desempenho dos seus plantões."
      breadcrumbs={[{ label: "Relatórios" }]}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total de plantões" value={stats.total} icon={BarChart3} loading={loading} />
        <StatsCard label="Concluídos" value={stats.completed} icon={CalendarCheck} loading={loading} />
        <StatsCard label="Horas trabalhadas" value={`${stats.totalHours}h`} icon={TrendingUp} loading={loading} />
        <StatsCard
          label={isDoctor ? "Receita total" : "Investimento total"}
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.totalValue)}
          icon={DollarSign}
          loading={loading}
        />
      </div>

      {loading ? null : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={BarChart3} title="Sem dados ainda" description="Os relatórios aparecerão quando você tiver plantões registrados." />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-semibold">Tendência de plantões concluídos por mês</h3>
            {monthlyData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem plantões concluídos ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <marker id="arrow-end" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
                    </marker>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ stroke: "var(--primary)", strokeWidth: 1 }} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "var(--primary)" }}
                    activeDot={{ r: 6 }}
                    markerEnd="url(#arrow-end)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 font-semibold">Distribuição por status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
