import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search, MapPin, Clock, Filter, X,
  ShieldCheck, ShieldQuestion, Send, Sun, Moon, DollarSign, MessageCircle,
} from "lucide-react";
import { BackButton } from "@/components/back-button";
import { StarRating } from "@/components/star-rating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isMasterUser } from "@/lib/master-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DoctorProfileDialog } from "@/components/doctor-profile-dialog";
import { ChatPanel } from "@/components/chat-panel";
import logo from "@/assets/connect-med-logo.webp";

export const Route = createFileRoute("/solicitar")({
  head: () => ({
    meta: [
      { title: "Solicitar médico — Connect-Med" },
      { name: "description", content: "Encontre e convide médicos qualificados para o seu plantão de telemedicina." },
      { property: "og:title", content: "Solicitar médico — Connect-Med" },
      { property: "og:description", content: "Convide médicos qualificados para o seu plantão de telemedicina." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SolicitarPage,
});

const ALL_SPECIALTIES = [
  "Acupuntura","Alergia e Imunologia","Anestesiologia","Angiologia","Cardiologia",
  "Cirurgia Cardiovascular","Cirurgia da Mão","Cirurgia de Cabeça e Pescoço","Cirurgia do Aparelho Digestivo",
  "Cirurgia Geral","Cirurgia Pediátrica","Cirurgia Plástica","Cirurgia Torácica","Cirurgia Vascular",
  "Clínica Médica","Coloproctologia","Dermatologia","Endocrinologia","Endoscopia",
  "Gastroenterologia","Genética Médica","Geriatria","Ginecologia e Obstetrícia","Hematologia",
  "Homeopatia","Infectologia","Mastologia","Medicina de Família e Comunidade","Medicina do Trabalho",
  "Medicina do Tráfego","Medicina de Emergência","Medicina Esportiva","Medicina Física e Reabilitação",
  "Medicina Intensiva","Medicina Legal","Medicina Nuclear","Medicina Preventiva","Nefrologia",
  "Neurocirurgia","Neurologia","Nutrologia","Oftalmologia","Oncologia Clínica","Ortopedia e Traumatologia",
  "Otorrinolaringologia","Patologia","Patologia Clínica","Pediatria","Pneumologia","Psiquiatria",
  "Radiologia e Diagnóstico por Imagem","Radioterapia","Reumatologia","Telemedicina","Urologia",
];

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
  specialties: string[];
  crm: string;
  crm_uf: string;
  crm_status: "verified" | "pending" | "invalid";
  cfm_status: "verified" | "pending" | "invalid";
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  bio: string | null;
  languages: string | null;
  avg_stars: number;
  rating_count: number;
  accepted_count: number;
  total_count: number;
}

function calcHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

function SolicitarPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [search, setSearch] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [ufs, setUfs] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [minYears, setMinYears] = useState(0);
  const [maxFee, setMaxFee] = useState(1000);
  const [sortBy, setSortBy] = useState<"match" | "rating" | "fee_asc" | "fee_desc" | "experience">("match");
  const [filterOpen, setFilterOpen] = useState(false);

  // convite
  const [inviteDoctor, setInviteDoctor] = useState<Doctor | null>(null);
  const [profileDoctorId, setProfileDoctorId] = useState<string | null>(null);
  const [chatDoctorId, setChatDoctorId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
    if (!authLoading && profile && profile.account_type !== "network" && !isMasterUser(user)) navigate({ to: "/dashboard" });
  }, [authLoading, user, profile, navigate]);

  useEffect(() => {
    (async () => {
      const [{ data: docs }, { data: ratings }, { data: shifts }] = await Promise.all([
        supabase.rpc("doctors_directory").select("id, specialty, specialties, crm, crm_uf, crm_status, cfm_status, avatar_url, city, state, years_experience, consultation_fee, bio, languages, full_name").eq("crm_status", "verified"),
        supabase.from("ratings").select("doctor_id, stars"),
        supabase.from("shift_requests").select("doctor_id, status").in("status", ["accepted", "completed", "pending"]),
      ]);

      const ratingMap = new Map<string, { sum: number; n: number }>();
      (ratings ?? []).forEach((r: any) => {
        const cur = ratingMap.get(r.doctor_id) ?? { sum: 0, n: 0 };
        cur.sum += r.stars; cur.n += 1;
        ratingMap.set(r.doctor_id, cur);
      });
      const acceptedMap = new Map<string, number>();
      const totalMap = new Map<string, number>();
      (shifts ?? []).forEach((s: any) => {
        totalMap.set(s.doctor_id, (totalMap.get(s.doctor_id) ?? 0) + 1);
        if (s.status === "accepted" || s.status === "completed") {
          acceptedMap.set(s.doctor_id, (acceptedMap.get(s.doctor_id) ?? 0) + 1);
        }
      });

      const list: Doctor[] = (docs ?? []).map((d: any) => {
        const ag = ratingMap.get(d.id);
        return {
          id: d.id,
          full_name: d.full_name ?? "Médico",
          specialty: d.specialty,
          specialties: d.specialties ?? [],
          crm: d.crm,
          crm_uf: d.crm_uf,
          crm_status: (d.crm_status ?? "pending") as Doctor["crm_status"],
          avatar_url: d.avatar_url ?? null,
          city: d.city ?? null,
          state: d.state ?? null,
          years_experience: d.years_experience ?? null,
          consultation_fee: d.consultation_fee ?? null,
          bio: d.bio ?? null,
          languages: d.languages ?? null,
          avg_stars: ag ? ag.sum / ag.n : 0,
          rating_count: ag?.n ?? 0,
          accepted_count: acceptedMap.get(d.id) ?? 0,
          total_count: totalMap.get(d.id) ?? 0,
        };
      });
      setDoctors(list);
      setLoading(false);
    })();
  }, []);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors
      .filter(d => d.crm_status !== "invalid")
      .filter(d => {
        if (q && !(
          d.full_name.toLowerCase().includes(q) ||
          d.crm.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          (d.bio ?? "").toLowerCase().includes(q) ||
          d.specialties.some(s => s.toLowerCase().includes(q))
        )) return false;
        if (specs.length > 0 && !specs.includes(d.specialty) && !d.specialties.some(s => specs.includes(s))) return false;
        if (ufs.length > 0 && !ufs.includes(d.state ?? "") && !ufs.includes(d.crm_uf)) return false;
        if (minRating > 0 && d.avg_stars < minRating) return false;
        if (minYears > 0 && (d.years_experience ?? 0) < minYears) return false;
        if (maxFee < 1000 && (d.consultation_fee ?? 0) > maxFee) return false;
        return true;
      })
      .map(d => {
        const acceptRate = d.total_count > 0 ? d.accepted_count / d.total_count : 0;
        const score =
          (d.rating_count > 0 ? (d.avg_stars / 5) * 40 : 15) +
          Math.min(25, (d.years_experience ?? 0) * 2) +
          acceptRate * 20 +
          (d.crm_status === "verified" ? 15 : 0);
        return { ...d, score };
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "rating": return b.avg_stars - a.avg_stars;
          case "fee_asc": return (a.consultation_fee ?? 9999) - (b.consultation_fee ?? 9999);
          case "fee_desc": return (b.consultation_fee ?? 0) - (a.consultation_fee ?? 0);
          case "experience": return (b.years_experience ?? 0) - (a.years_experience ?? 0);
          default: return b.score - a.score;
        }
      });
  }, [doctors, search, specs, ufs, minRating, minYears, maxFee, sortBy]);

  const clear = () => {
    setSearch(""); setSpecs([]); setUfs([]);
    setMinRating(0); setMinYears(0); setMaxFee(1000);
  };

  const filterPanel = (
    <FilterPanel
      search={search} setSearch={setSearch}
      specs={specs} toggleSpec={(s) => setSpecs(toggle(specs, s))}
      ufs={ufs} toggleUf={(u) => setUfs(toggle(ufs, u))}
      minRating={minRating} setMinRating={setMinRating}
      minYears={minYears} setMinYears={setMinYears}
      maxFee={maxFee} setMaxFee={setMaxFee}
      clear={clear}
    />
  );

  if (authLoading || !user || !profile) {
    return <div className="min-h-screen bg-background p-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <BackButton to="/dashboard" label="Voltar ao dashboard" />
            <div className="hidden md:block h-6 w-px bg-border" />
            <Link to="/" className="hidden md:flex items-center gap-2">
              <img src={logo} alt="Connect-Med" className="h-7 w-auto" />
            </Link>
          </div>
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, CRM, especialidade ou descrição..." className="pl-9 h-10" />
            </div>
          </div>
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                <Filter className="h-4 w-4" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-[380px] overflow-y-auto">
              <SheetTitle className="sr-only">Filtros</SheetTitle>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold"><Filter className="h-4 w-4 text-primary" /> Filtros</h3>
                <button onClick={() => setFilterOpen(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
              {filterPanel}
              <Button onClick={() => setFilterOpen(false)} className="mt-6 w-full">Aplicar filtros</Button>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Encontrar médico para plantão</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "médico encontrado" : "médicos encontrados"}
            </p>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Melhor match</SelectItem>
              <SelectItem value="rating">Melhor avaliação</SelectItem>
              <SelectItem value="experience">Mais experiência</SelectItem>
              <SelectItem value="fee_asc">Menor valor/hora</SelectItem>
              <SelectItem value="fee_desc">Maior valor/hora</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
          <aside className="hidden lg:block">
            <div className="sticky top-[80px] rounded-xl border bg-card p-5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Filter className="h-4 w-4 text-primary" /> Filtros
              </h3>
              {filterPanel}
            </div>
          </aside>

          <main>
            {loading ? (
              <p className="text-muted-foreground">Carregando médicos...</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
                Nenhum médico encontrado. Tente ajustar os filtros.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(d => (
                  <DoctorCard
                    key={d.id}
                    d={d}
                    onInvite={() => setInviteDoctor(d)}
                    onView={() => setProfileDoctorId(d.id)}
                    onMessage={() => setChatDoctorId(d.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {profileDoctorId && (
        <DoctorProfileDialog doctorId={profileDoctorId} open={!!profileDoctorId} onOpenChange={(v) => !v && setProfileDoctorId(null)} />
      )}

      {chatDoctorId && user && (
        <ChatPanel
          open={!!chatDoctorId}
          onOpenChange={(v) => !v && setChatDoctorId(null)}
          currentUserId={user.id}
          otherUserId={chatDoctorId}
          otherName={doctors.find(d => d.id === chatDoctorId)?.full_name ?? "Médico"}
          otherAvatarUrl={doctors.find(d => d.id === chatDoctorId)?.avatar_url ?? null}
        />
      )}

      <InviteDialog
        doctor={inviteDoctor}
        networkId={user.id}
        onClose={() => setInviteDoctor(null)}
        onSent={() => { setInviteDoctor(null); navigate({ to: "/dashboard" }); }}
      />
    </div>
  );
}

function SpecialtyFilter({ specs, toggleSpec }: { specs: string[]; toggleSpec: (s: string) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ALL_SPECIALTIES;
    return ALL_SPECIALTIES.filter(s => s.toLowerCase().includes(t));
  }, [q]);
  return (
    <div>
      <p className="mb-2 font-medium">Especialidades</p>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar especialidade..." className="h-8 pl-8 text-xs" />
      </div>
      {specs.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {specs.map(s => (
            <button key={s} type="button" onClick={() => toggleSpec(s)}
              className="flex items-center gap-1 rounded-full border border-primary bg-accent px-2 py-0.5 text-[10px]">
              {s} <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2 max-h-56 overflow-auto pr-1">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma especialidade encontrada.</p>
        ) : list.map(s => (
          <label key={s} className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox checked={specs.includes(s)} onCheckedChange={() => toggleSpec(s)} />
            <span>{s}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FilterPanel({
  search, setSearch, specs, toggleSpec, ufs, toggleUf,
  minRating, setMinRating, minYears, setMinYears, maxFee, setMaxFee,
  clear,
}: {
  search: string; setSearch: (v: string) => void;
  specs: string[]; toggleSpec: (s: string) => void;
  ufs: string[]; toggleUf: (u: string) => void;
  minRating: number; setMinRating: (n: number) => void;
  minYears: number; setMinYears: (n: number) => void;
  maxFee: number; setMaxFee: (n: number) => void;
  
  clear: () => void;
}) {
  return (
    <div className="space-y-6 text-sm">
      <div className="lg:hidden">
        <Label className="mb-2 block">Busca</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, especialidade..." className="pl-9" />
        </div>
      </div>

      <SpecialtyFilter specs={specs} toggleSpec={toggleSpec} />

      <div>
        <p className="mb-2 font-medium">UF (Estado)</p>
        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-auto pr-1">
          {UFS.map(u => (
            <button key={u} type="button" onClick={() => toggleUf(u)}
              className={`rounded border px-1.5 py-1 text-xs ${ufs.includes(u) ? "border-primary bg-accent" : "border-border"}`}>
              {u}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-medium">Avaliação mínima</p>
        <div className="flex flex-wrap gap-1.5">
          {[0, 3, 4, 4.5].map(v => (
            <button key={v} type="button" onClick={() => setMinRating(v)}
              className={`rounded-md border px-2 py-1 text-xs ${minRating === v ? "border-primary bg-accent" : "border-border"}`}>
              {v === 0 ? "Qualquer" : `${v}★+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-medium">Experiência mínima</p>
        <div className="flex flex-wrap gap-1.5">
          {[0, 2, 5, 10].map(v => (
            <button key={v} type="button" onClick={() => setMinYears(v)}
              className={`rounded-md border px-2 py-1 text-xs ${minYears === v ? "border-primary bg-accent" : "border-border"}`}>
              {v === 0 ? "Qualquer" : `${v}+ anos`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-medium">Valor máx. por hora</p>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>R$ 0</span><span className="font-medium text-foreground">{maxFee >= 1000 ? "Sem limite" : `R$ ${maxFee}`}</span>
        </div>
        <input type="range" min={0} max={1000} step={50} value={maxFee} onChange={(e) => setMaxFee(Number(e.target.value))} className="w-full accent-primary" />
      </div>

      <button type="button" onClick={clear} className="text-xs font-medium text-primary hover:underline">
        Limpar filtros
      </button>
    </div>
  );
}

function DoctorCard({ d, onInvite, onView, onMessage }: { d: Doctor & { score: number }; onInvite: () => void; onView: () => void; onMessage: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md sm:p-5 max-h-[340px] overflow-y-auto">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex sm:flex-col sm:items-center sm:gap-2">
          <Avatar className="h-16 w-16">
            {d.avatar_url && <AvatarImage src={d.avatar_url} alt={d.full_name} />}
            <AvatarFallback>{d.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <button type="button" onClick={onView} className="font-semibold hover:text-primary hover:underline truncate">
                {d.full_name}
              </button>
              <p className="text-sm text-muted-foreground">{d.specialty}</p>
            </div>
            <div className="text-right">
              {d.consultation_fee != null ? (
                <p className="text-lg font-bold text-primary">R$ {d.consultation_fee}<span className="text-xs font-normal text-muted-foreground">/h</span></p>
              ) : (
                <p className="text-xs text-muted-foreground">Valor a combinar</p>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <StarRating value={d.avg_stars} readonly size={16} />
              {d.rating_count > 0 ? (
                <span className="font-medium text-foreground">{d.avg_stars.toFixed(1)} ({d.rating_count})</span>
              ) : (
                <span>Sem avaliações</span>
              )}
            </span>
            <span className="font-medium text-foreground">CRM {d.crm}/{d.crm_uf}</span>
            {/* Espaço reservado para futuras conquistas */}
            <span className="achievements-slot inline-flex items-center gap-1" />
            {d.crm_status === "verified" ? (
              <span className="inline-flex items-center gap-0.5 text-success"><ShieldCheck className="h-3 w-3" /> Verificado</span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-warning"><ShieldQuestion className="h-3 w-3" /> Em análise</span>
            )}
            {(d.city || d.state) && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[d.city, d.state].filter(Boolean).join(", ")}</span>
            )}
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {d.years_experience ?? 0} anos exp.</span>
          </div>

          {d.bio && (
            <p className="mt-3 text-sm text-foreground/80 line-clamp-2">{d.bio}</p>
          )}

          {d.specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {d.specialties.slice(0, 6).map(s => (
                <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{s}</span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {d.accepted_count} {d.accepted_count === 1 ? "plantão" : "plantões"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onMessage} className="gap-1.5">
                <MessageCircle className="h-4 w-4" /> Mensagem
              </Button>
              <Button variant="outline" size="sm" onClick={onView}>Ver perfil</Button>
              <Button size="sm" onClick={onInvite}>
                Solicitar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PRESETS: Record<"morning" | "night", { start: string; end: string }> = {
  morning: { start: "07:00", end: "13:00" },
  night:   { start: "19:00", end: "07:00" },
};

function InviteDialog({ doctor, networkId, onClose, onSent }: {
  doctor: Doctor | null; networkId: string; onClose: () => void; onSent: () => void;
}) {
  const [period, setPeriod] = useState<"morning" | "night" | "custom">("night");
  const [date, setDate] = useState("");
  const [start, setStart] = useState(PRESETS.night.start);
  const [end, setEnd] = useState(PRESETS.night.end);
  const [submitting, setSubmitting] = useState(false);
  const [negotiate, setNegotiate] = useState(false);
  const [proposedValue, setProposedValue] = useState("");
  const [negotiationNote, setNegotiationNote] = useState("");

  const onPeriodChange = (p: "morning" | "night" | "custom") => {
    setPeriod(p);
    if (p !== "custom") {
      setStart(PRESETS[p].start); setEnd(PRESETS[p].end);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor) return;
    if (!date) return toast.error("Selecione a data");
    const hours = calcHours(start, end);
    if (hours <= 0) return toast.error("Horário inválido");
    setSubmitting(true);
    const { error } = await supabase.from("shift_requests").insert({
      network_id: networkId,
      doctor_id: doctor.id,
      shift_date: date,
      start_time: start,
      end_time: end,
      duration_hours: hours,
      shift_period: period,
      agreed_value: negotiate && proposedValue ? Number(proposedValue) : null,
      notes: negotiate && negotiationNote.trim() ? negotiationNote.trim() : null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Convite enviado ao médico!");
    onSent();
  };

  return (
    <Dialog open={!!doctor} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Convidar {doctor?.full_name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="d">Data do plantão</Label>
            <Input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>Turno</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { v: "morning" as const, label: "Manhã", icon: Sun },
                { v: "night"   as const, label: "Noite", icon: Moon },
                { v: "custom"  as const, label: "Outro", icon: Clock },
              ]).map(opt => (
                <button key={opt.v} type="button" onClick={() => onPeriodChange(opt.v)}
                  className={`flex items-center justify-center gap-1 rounded-md border p-1.5 text-xs ${period === opt.v ? "border-primary bg-accent" : "border-border"}`}>
                  <opt.icon className="h-3 w-3" /> {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="s">Início</Label>
              <Input id="s" type="time" value={start} onChange={(e) => { setStart(e.target.value); setPeriod("custom"); }} required />
            </div>
            <div>
              <Label htmlFor="e">Fim</Label>
              <Input id="e" type="time" value={end} onChange={(e) => { setEnd(e.target.value); setPeriod("custom"); }} required />
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Começa às <strong className="text-foreground">{start}</strong> e termina às <strong className="text-foreground">{end}</strong></span>
            <span>{calcHours(start, end)}h</span>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setNegotiate((v) => !v)}
              className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${negotiate ? "border-primary bg-accent" : "border-border hover:bg-muted/40"}`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                {negotiate ? "Proposta de valor" : "Negociar valor"}
              </span>
              <span className="text-muted-foreground">{negotiate ? "Ocultar" : "Adicionar"}</span>
            </button>
            {negotiate ? (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <div>
                  <Label htmlFor="value" className="text-xs">Valor proposto (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 1500"
                    value={proposedValue}
                    onChange={(e) => setProposedValue(e.target.value)}
                  />
                  {proposedValue && calcHours(start, end) > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      ≈ R$ {(Number(proposedValue) / calcHours(start, end)).toFixed(2)}/h
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="negnote" className="text-xs">Observação (opcional)</Label>
                  <Textarea
                    id="negnote"
                    rows={2}
                    placeholder="Detalhes sobre a proposta..."
                    value={negotiationNote}
                    onChange={(e) => setNegotiationNote(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Valor e detalhes podem ser combinados no chat após o aceite.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              <Send className="h-4 w-4" /> {submitting ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
