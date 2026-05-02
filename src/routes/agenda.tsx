import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  component: AgendaPage,
});

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  network?: { network_name: string } | null;
  doctor?: { profile?: { full_name: string } | null } | null;
}

function AgendaPage() {
  const { user, profile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";
  const [today] = useState(new Date());
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().slice(0, 10);
      const select = isDoctor
        ? "id, shift_date, start_time, end_time, status, network:networks(network_name)"
        : "id, shift_date, start_time, end_time, status, doctor:doctors(profile:profiles(full_name))";
      const filter = isDoctor ? "doctor_id" : "network_id";
      const { data } = await supabase
        .from("shift_requests")
        .select(select)
        .eq(filter, user.id)
        .in("status", ["pending", "accepted", "completed"])
        .gte("shift_date", start)
        .lte("shift_date", end)
        .order("start_time");
      setShifts((data ?? []) as unknown as Shift[]);
    })();
  }, [user, profile, isDoctor, month]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const byDate = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts) {
      const arr = m.get(s.shift_date) ?? [];
      arr.push(s);
      m.set(s.shift_date, arr);
    }
    return m;
  }, [shifts]);

  const dayList = selected ? (byDate.get(selected) ?? []) : [];
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const todayKey = isoDate(today);

  return (
    <DashboardLayout
      title="Agenda"
      subtitle="Visualize seus plantões do mês em um clique."
      breadcrumbs={[{ label: "Agenda" }]}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, i) => {
              const key = isoDate(cell.date);
              const count = byDate.get(key)?.length ?? 0;
              const isToday = key === todayKey;
              const isSelected = key === selected;
              return (
                <button
                  key={i}
                  onClick={() => cell.inMonth && setSelected(key)}
                  disabled={!cell.inMonth}
                  className={cn(
                    "relative aspect-square rounded-lg p-1.5 text-left text-xs transition-colors",
                    cell.inMonth ? "hover:bg-muted" : "text-muted-foreground/30",
                    isSelected && "bg-primary/10 ring-2 ring-primary",
                    isToday && !isSelected && "bg-accent",
                  )}
                >
                  <span className={cn("font-medium", isToday && "text-primary")}>{cell.date.getDate()}</span>
                  {count > 0 && (
                    <span className="absolute bottom-1 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="mb-3 text-sm font-semibold">
            {selected
              ? new Date(selected + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
              : "Selecione um dia"}
          </h3>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Clique em uma data para ver os plantões.</p>
          ) : dayList.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Sem plantões neste dia" />
          ) : (
            <div className="space-y-3">
              {dayList.map((s) => (
                <div key={s.id} className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {isDoctor ? s.network?.network_name : s.doctor?.profile?.full_name}
                    </p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </DashboardLayout>
  );
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(month: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const dayOfWeek = (first.getDay() + 6) % 7; // segunda = 0
  const start = new Date(first);
  start.setDate(first.getDate() - dayOfWeek);
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month.getMonth() });
  }
  return cells;
}
