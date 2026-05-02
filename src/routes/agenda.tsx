import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

interface Availability {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

function AgendaPage() {
  const { user, profile } = useAuth();
  const isDoctor = profile?.account_type === "doctor";
  const [today] = useState(new Date());
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const loadShifts = useCallback(async () => {
    if (!user || !profile) return;
    const start = isoDate(new Date(month.getFullYear(), month.getMonth(), 1));
    const end = isoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
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
  }, [user, profile, isDoctor, month]);

  const loadAvailabilities = useCallback(async () => {
    if (!user || !isDoctor) return;
    const start = isoDate(new Date(month.getFullYear(), month.getMonth(), 1));
    const end = isoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    const { data } = await supabase
      .from("doctor_availabilities")
      .select("id, available_date, start_time, end_time, notes")
      .eq("doctor_id", user.id)
      .gte("available_date", start)
      .lte("available_date", end)
      .order("start_time");
    setAvailabilities((data ?? []) as Availability[]);
  }, [user, isDoctor, month]);

  useEffect(() => { loadShifts(); }, [loadShifts]);
  useEffect(() => { loadAvailabilities(); }, [loadAvailabilities]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const shiftsByDate = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts) {
      const arr = m.get(s.shift_date) ?? [];
      arr.push(s);
      m.set(s.shift_date, arr);
    }
    return m;
  }, [shifts]);
  const availByDate = useMemo(() => {
    const m = new Map<string, Availability[]>();
    for (const a of availabilities) {
      const arr = m.get(a.available_date) ?? [];
      arr.push(a);
      m.set(a.available_date, arr);
    }
    return m;
  }, [availabilities]);

  const dayShifts = selected ? (shiftsByDate.get(selected) ?? []) : [];
  const dayAvail = selected ? (availByDate.get(selected) ?? []) : [];
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const todayKey = isoDate(today);

  const removeAvailability = async (id: string) => {
    const { error } = await supabase.from("doctor_availabilities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Disponibilidade removida");
    loadAvailabilities();
  };

  return (
    <DashboardLayout
      title="Agenda"
      subtitle={isDoctor ? "Visualize plantões e gerencie sua disponibilidade." : "Visualize seus plantões do mês em um clique."}
      breadcrumbs={[{ label: "Agenda" }]}
      actions={
        <div className="flex items-center gap-2">
          {isDoctor && (
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Disponibilidade
                </Button>
              </DialogTrigger>
              <CreateAvailabilityDialog
                defaultDate={selected ?? todayKey}
                userId={user!.id}
                onCreated={() => { setOpenCreate(false); loadAvailabilities(); }}
              />
            </Dialog>
          )}
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
              const shiftCount = shiftsByDate.get(key)?.length ?? 0;
              const availCount = availByDate.get(key)?.length ?? 0;
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
                  <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                    {availCount > 0 && (
                      <span
                        className="grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white"
                        style={{ backgroundColor: "oklch(0.55 0.15 150)" }}
                        title={`${availCount} disponibilidade(s)`}
                      >
                        {availCount}
                      </span>
                    )}
                    {shiftCount > 0 && (
                      <span
                        className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
                        title={`${shiftCount} plantão(ões)`}
                      >
                        {shiftCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {isDoctor && (
            <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "oklch(0.55 0.15 150)" }} /> Disponibilidades
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Plantões
              </span>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="mb-3 text-sm font-semibold">
            {selected
              ? new Date(selected + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
              : "Selecione um dia"}
          </h3>

          {!selected ? (
            <p className="text-sm text-muted-foreground">Clique em uma data para ver detalhes.</p>
          ) : (
            <div className="space-y-5">
              {/* Disponibilidades (só médico) */}
              {isDoctor && (
                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disponibilidades</p>
                  {dayAvail.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma neste dia.</p>
                  ) : (
                    <div className="space-y-2">
                      {dayAvail.map((a) => (
                        <div key={a.id} className="flex items-start justify-between gap-2 rounded-xl border p-3" style={{ borderColor: "oklch(0.55 0.15 150 / 0.3)", backgroundColor: "oklch(0.55 0.15 150 / 0.05)" }}>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-sm font-medium">
                              <Clock className="h-3.5 w-3.5" />
                              {a.start_time.slice(0, 5)} – {a.end_time.slice(0, 5)}
                            </p>
                            {a.notes && <p className="mt-0.5 text-xs text-muted-foreground">{a.notes}</p>}
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeAvailability(a.id)} title="Remover">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Plantões */}
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plantões</p>
                {dayShifts.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="Sem plantões neste dia" />
                ) : (
                  <div className="space-y-3">
                    {dayShifts.map((s) => (
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
              </section>
            </div>
          )}
        </aside>
      </div>
    </DashboardLayout>
  );
}

function CreateAvailabilityDialog({ defaultDate, userId, onCreated }: { defaultDate: string; userId: string; onCreated: () => void }) {
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDate(defaultDate); }, [defaultDate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) return toast.error("Preencha data e horários");
    if (startTime >= endTime) return toast.error("Horário final deve ser após o inicial");
    setSaving(true);
    const { error } = await supabase.from("doctor_availabilities").insert({
      doctor_id: userId,
      available_date: date,
      start_time: startTime,
      end_time: endTime,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Disponibilidade adicionada");
    setNotes("");
    onCreated();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova disponibilidade</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="av-date">Data</Label>
          <Input id="av-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="av-start">Início</Label>
            <Input id="av-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="av-end">Fim</Label>
            <Input id="av-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
        </div>
        <div>
          <Label htmlFor="av-notes">Observações (opcional)</Label>
          <Textarea id="av-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex: prefiro pediatria" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Adicionar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(month: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const dayOfWeek = (first.getDay() + 6) % 7;
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
