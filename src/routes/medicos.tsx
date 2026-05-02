import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Search, MapPin, Star, Eye, ShieldCheck, ShieldAlert, ShieldQuestion, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { EmptyState } from "@/components/dashboard/empty-state";
import { DoctorProfileDialog } from "@/components/doctor-profile-dialog";

export const Route = createFileRoute("/medicos")({
  component: MedicosPage,
});

interface Doctor {
  id: string;
  specialty: string;
  crm: string;
  crm_uf: string;
  crm_status: "verified" | "pending" | "invalid";
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  full_name: string;
  years_experience: number | null;
  avg_stars: number;
  rating_count: number;
  next_availability: string | null;
}

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

type SortKey = "match" | "rating" | "experience" | "availability";

function MedicosPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [uf, setUf] = useState("all");
  const [minRating, setMinRating] = useState("0");
  const [minYears, setMinYears] = useState("0");
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [sortKey, setSortKey] = useState<SortKey>("match");
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: doctors }, { data: profs }, { data: ratings }, { data: avails }] = await Promise.all([
        supabase.from("doctors").select("id, specialty, crm, crm_uf, crm_status, city, state, avatar_url, years_experience"),
        supabase.from("profiles").select("id, full_name").eq("account_type", "doctor"),
        supabase.from("ratings").select("doctor_id, stars"),
        supabase.from("doctor_availabilities").select("doctor_id, available_date").gte("available_date", today),
      ]);
      const profMap = new Map((profs ?? []).map(p => [p.id, p.full_name]));
      const ratingMap = new Map<string, { sum: number; count: number }>();
      for (const r of ratings ?? []) {
        const cur = ratingMap.get(r.doctor_id) ?? { sum: 0, count: 0 };
        cur.sum += r.stars; cur.count += 1;
        ratingMap.set(r.doctor_id, cur);
      }
      const nextAvailMap = new Map<string, string>();
      for (const a of avails ?? []) {
        const cur = nextAvailMap.get(a.doctor_id);
        if (!cur || a.available_date < cur) nextAvailMap.set(a.doctor_id, a.available_date);
      }
      const merged: Doctor[] = (doctors ?? []).map((d: any) => {
        const r = ratingMap.get(d.id);
        return {
          id: d.id,
          specialty: d.specialty,
          crm: d.crm,
          crm_uf: d.crm_uf,
          crm_status: (d.crm_status ?? "pending") as Doctor["crm_status"],
          city: d.city,
          state: d.state,
          avatar_url: d.avatar_url,
          years_experience: d.years_experience ?? null,
          full_name: profMap.get(d.id) ?? "Médico",
          avg_stars: r ? r.sum / r.count : 0,
          rating_count: r?.count ?? 0,
          next_availability: nextAvailMap.get(d.id) ?? null,
        };
      });
      setDocs(merged);
      setLoading(false);
    })().catch(e => toast.error(e.message));
  }, []);

  const specialties = useMemo(() => Array.from(new Set(docs.map(d => d.specialty))).sort(), [docs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = Number(minRating);
    const minY = Number(minYears);
    const list = docs.filter(d => {
      // Médicos com CRM inválido ficam ocultos
      if (d.crm_status === "invalid") return false;
      if (statusFilter === "active" && !d.next_availability) {
        // Mantém ativos: aqueles com disponibilidade futura. Se quiser todos, escolha "Todos".
      }
      if (specialty !== "all" && d.specialty !== specialty) return false;
      if (uf !== "all" && d.crm_uf !== uf) return false;
      if (min > 0 && d.avg_stars < min) return false;
      if (minY > 0 && (d.years_experience ?? 0) < minY) return false;
      if (!q) return true;
      return (d.full_name + " " + d.specialty + " " + d.crm).toLowerCase().includes(q);
    });

    list.sort((a, b) => {
      if (sortKey === "rating") return b.avg_stars - a.avg_stars;
      if (sortKey === "experience") return (b.years_experience ?? 0) - (a.years_experience ?? 0);
      if (sortKey === "availability") {
        const av = a.next_availability ?? "9999";
        const bv = b.next_availability ?? "9999";
        return av.localeCompare(bv);
      }
      // match: combina avaliação, exp, disponibilidade, CRM verificado
      const score = (d: Doctor) =>
        (d.avg_stars * 8) +
        Math.min(15, (d.years_experience ?? 0)) +
        (d.next_availability ? 20 : 0) +
        (d.crm_status === "verified" ? 5 : 0);
      return score(b) - score(a);
    });

    return list;
  }, [docs, search, specialty, uf, minRating, minYears, statusFilter, sortKey]);

  return (
    <DashboardLayout
      title="Médicos"
      subtitle="Telemedicina — encontre profissionais por especialidade, fuso e disponibilidade."
      breadcrumbs={[{ label: "Médicos" }]}
      requireUserType="network"
    >
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar nome, especialidade ou CRM..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger><SelectValue placeholder="Especialidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as especialidades</SelectItem>
            {specialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={uf} onValueChange={setUf}>
          <SelectTrigger><SelectValue placeholder="UF (legislação/fuso)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas UF</SelectItem>
            {UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Select value={minRating} onValueChange={setMinRating}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Qualquer avaliação</SelectItem>
            <SelectItem value="3">3★ ou mais</SelectItem>
            <SelectItem value="4">4★ ou mais</SelectItem>
            <SelectItem value="4.5">4.5★ ou mais</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minYears} onValueChange={setMinYears}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Qualquer experiência</SelectItem>
            <SelectItem value="2">2+ anos</SelectItem>
            <SelectItem value="5">5+ anos</SelectItem>
            <SelectItem value="10">10+ anos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "active" | "all")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Apenas ativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="match">Melhor match</SelectItem>
            <SelectItem value="rating">Avaliação</SelectItem>
            <SelectItem value="experience">Experiência</SelectItem>
            <SelectItem value="availability">Disponibilidade mais próxima</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum médico encontrado" description="Ajuste os filtros para ampliar sua busca." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(d => (
            <div key={d.id} className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={d.avatar_url ?? undefined} />
                  <AvatarFallback>{d.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold flex items-center gap-1.5">
                    {d.full_name}
                    {d.crm_status === "verified" && <ShieldCheck className="h-3.5 w-3.5 text-success" aria-label="CRM verificado" />}
                    {d.crm_status === "pending" && <ShieldQuestion className="h-3.5 w-3.5 text-warning" aria-label="CRM em análise" />}
                  </h3>
                  <p className="truncate text-sm text-muted-foreground">{d.specialty}</p>
                  <p className="text-xs text-muted-foreground">CRM {d.crm}/{d.crm_uf}{d.years_experience ? ` · ${d.years_experience}a` : ""}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{d.state ?? "—"}</span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current text-warning" />
                  {d.rating_count > 0 ? `${d.avg_stars.toFixed(1)} (${d.rating_count})` : "Sem avaliações"}
                </span>
              </div>
              {d.next_availability && (
                <div className="mt-2 flex items-center gap-1 text-xs text-success">
                  <Briefcase className="h-3 w-3" /> Disponível a partir de {new Date(d.next_availability + "T00:00:00").toLocaleDateString("pt-BR")}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setProfileId(d.id)}>
                  <Eye className="h-3.5 w-3.5" />Ver perfil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {profileId && user && (
        <DoctorProfileDialog
          open={!!profileId}
          onOpenChange={(v) => !v && setProfileId(null)}
          doctorId={profileId}
        />
      )}
    </DashboardLayout>
  );
}
