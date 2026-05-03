import { useEffect, useState } from "react";
import { Activity, Clock, DollarSign, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Metrics {
  fillRate: number;
  avgFillTimeHours: number;
  totalCost: number;
  avgCostPerHour: number;
  activeDoctors: number;
  topDoctors: { doctor_id: string; name: string; count: number; avg: number }[];
}

export function NetworkAnalytics({ networkId }: { networkId: string }) {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString();
      const { data: reqs } = await supabase
        .from("shift_requests")
        .select("id, doctor_id, status, agreed_value, duration_hours, created_at, responded_at")
        .eq("network_id", networkId)
        .gte("created_at", sinceStr);

      const list = reqs ?? [];
      const completed = list.filter(r => r.status === "completed" || r.status === "accepted");
      const totalCost = completed.reduce((a, r) => a + (Number(r.agreed_value) || 0), 0);
      const totalHours = completed.reduce((a, r) => a + (Number(r.duration_hours) || 0), 0);
      const fillRate = list.length ? (completed.length / list.length) * 100 : 0;

      const filledWithTime = completed.filter(r => r.responded_at);
      const avgFillMs = filledWithTime.length
        ? filledWithTime.reduce((a, r) => a + (new Date(r.responded_at!).getTime() - new Date(r.created_at).getTime()), 0) / filledWithTime.length
        : 0;

      // Top médicos (por nº de plantões aceitos/concluídos)
      const counts = new Map<string, number>();
      completed.forEach(r => counts.set(r.doctor_id, (counts.get(r.doctor_id) ?? 0) + 1));
      const topIds = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const [{ data: profs }, { data: ratings }] = await Promise.all([
        topIds.length ? supabase.from("profiles").select("id, full_name").in("id", topIds.map(([id]) => id)) : Promise.resolve({ data: [] as any[] }),
        topIds.length ? supabase.from("ratings").select("doctor_id, stars").in("doctor_id", topIds.map(([id]) => id)) : Promise.resolve({ data: [] as any[] }),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      const ratingMap = new Map<string, { sum: number; n: number }>();
      (ratings ?? []).forEach((r: any) => {
        const c = ratingMap.get(r.doctor_id) ?? { sum: 0, n: 0 };
        c.sum += r.stars; c.n += 1;
        ratingMap.set(r.doctor_id, c);
      });

      setM({
        fillRate,
        avgFillTimeHours: avgFillMs / 1000 / 3600,
        totalCost,
        avgCostPerHour: totalHours ? totalCost / totalHours : 0,
        activeDoctors: counts.size,
        topDoctors: topIds.map(([id, count]) => ({
          doctor_id: id,
          name: profMap.get(id) ?? "Médico",
          count,
          avg: ratingMap.get(id) ? ratingMap.get(id)!.sum / ratingMap.get(id)!.n : 0,
        })),
      });
      setLoading(false);
    })();
  }, [networkId]);

  if (loading || !m) return null;

  return (
    <section className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Performance da rede (últimos 90 dias)</h2>
        <p className="text-xs text-muted-foreground">Métricas de ocupação, tempo de preenchimento e custos operacionais.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={Activity} label="Taxa de ocupação" value={`${m.fillRate.toFixed(0)}%`} hint="Solicitações preenchidas" />
        <Tile icon={Clock} label="Tempo médio p/ preencher" value={m.avgFillTimeHours > 0 ? `${m.avgFillTimeHours.toFixed(1)}h` : "—"} hint="Da criação à resposta" />
        <Tile icon={DollarSign} label="Custo médio / hora" value={m.avgCostPerHour > 0 ? m.avgCostPerHour.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"} hint={`Total ${m.totalCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`} />
        <Tile icon={Users} label="Médicos ativos" value={m.activeDoctors} hint="Com plantões no período" />
      </div>

      {m.topDoctors.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold">Top médicos do período</h3>
          <ul className="space-y-1.5">
            {m.topDoctors.map(d => (
              <li key={d.doctor_id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium truncate">{d.name}</span>
                <span className="text-xs text-muted-foreground">{d.count} plantões · {d.avg > 0 ? `${d.avg.toFixed(1)}★` : "sem ★"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Tile({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
