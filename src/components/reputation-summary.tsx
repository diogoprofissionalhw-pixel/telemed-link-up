import { useEffect, useState } from "react";
import { Star, Clock, MessageSquare, HeartPulse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  count: number;
  avg: number;
  punctuality: number;
  careQuality: number;
  communication: number;
}

export function ReputationSummary({ doctorId }: { doctorId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ratings")
        .select("stars, punctuality, care_quality, communication")
        .eq("doctor_id", doctorId);
      const list = data ?? [];
      if (list.length === 0) {
        setStats({ count: 0, avg: 0, punctuality: 0, careQuality: 0, communication: 0 });
      } else {
        const avgOf = (key: string) => {
          const vals = list.map((r: any) => r[key]).filter((v: number) => typeof v === "number");
          return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
        };
        setStats({
          count: list.length,
          avg: list.reduce((a, b) => a + b.stars, 0) / list.length,
          punctuality: avgOf("punctuality"),
          careQuality: avgOf("care_quality"),
          communication: avgOf("communication"),
        });
      }
      setLoading(false);
    })();
  }, [doctorId]);

  if (loading || !stats) return null;
  if (stats.count === 0) return null;

  const isTopReputation = stats.avg >= 4.5 && stats.count >= 3;

  return (
    <section className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Sua reputação</h2>
          <p className="text-xs text-muted-foreground">Baseada em {stats.count} {stats.count === 1 ? "avaliação" : "avaliações"} de redes</p>
        </div>
        {isTopReputation && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold" style={{ color: "oklch(0.45 0.15 80)" }}>
            ⭐ Acesso prioritário a plantões
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric icon={Star} label="Geral" value={stats.avg} />
        <Metric icon={Clock} label="Pontualidade" value={stats.punctuality} />
        <Metric icon={HeartPulse} label="Atendimento" value={stats.careQuality} />
        <Metric icon={MessageSquare} label="Comunicação" value={stats.communication} />
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value > 0 ? value.toFixed(1) : "—"}<span className="text-sm font-normal text-muted-foreground"> /5</span></div>
    </div>
  );
}
