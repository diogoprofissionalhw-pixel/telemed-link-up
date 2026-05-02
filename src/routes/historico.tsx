import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge, type RequestStatus } from "@/components/dashboard/status-badge";

export const Route = createFileRoute("/historico")({
  component: HistoricoPage,
});

interface Item {
  id: string;
  shift_date: string;
  status: RequestStatus;
  updated_at: string;
  network?: { network_name: string } | null;
  doctor?: { profile?: { full_name: string } | null } | null;
}

function HistoricoPage() {
  const { user, profile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      setLoading(true);
      const select = isDoctor
        ? "id, shift_date, status, updated_at, network:networks(network_name)"
        : "id, shift_date, status, updated_at, doctor:doctors(profile:profiles(full_name))";
      const filter = isDoctor ? "doctor_id" : "network_id";
      const { data } = await supabase
        .from("shift_requests")
        .select(select)
        .eq(filter, user.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      setItems((data ?? []) as unknown as Item[]);
      setLoading(false);
    })();
  }, [user, profile, isDoctor]);

  return (
    <DashboardLayout
      title="Histórico"
      subtitle="Linha do tempo de todas as suas atividades."
      breadcrumbs={[{ label: "Histórico" }]}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState icon={ClockIcon} title="Sem atividades registradas ainda" />
      ) : (
        <div className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <ol className="relative space-y-5 border-l-2 border-border pl-5">
            {items.map((it) => {
              const who = isDoctor ? it.network?.network_name : it.doctor?.profile?.full_name;
              return (
                <li key={it.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      Plantão {new Date(it.shift_date + "T00:00:00").toLocaleDateString("pt-BR")} — {who ?? "—"}
                    </p>
                    <StatusBadge status={it.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Última atualização: {new Date(it.updated_at).toLocaleString("pt-BR")}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </DashboardLayout>
  );
}
