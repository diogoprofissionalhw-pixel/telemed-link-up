import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Star, MapPin, Filter, X, ArrowLeft, Stethoscope, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/medicos")({
  head: () => ({
    meta: [
      { title: "Médicos da rede Connect-Med — diretório de profissionais" },
      { name: "description", content: "Diretório de médicos verificados da Connect-Med. Filtre por especialidade, cidade, UF e valor da hora para encontrar o profissional ideal para o seu plantão." },
      { property: "og:title", content: "Médicos da rede Connect-Med" },
      { property: "og:description", content: "Diretório de médicos verificados — filtre por especialidade, localização e valor da hora." },
      { property: "og:url", content: "https://telemed-link-up.lovable.app/medicos" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://telemed-link-up.lovable.app/medicos" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Médicos da rede Connect-Med",
          description: "Diretório de médicos verificados disponíveis para plantões de telemedicina.",
          url: "https://telemed-link-up.lovable.app/medicos",
          isPartOf: { "@type": "WebSite", name: "Connect-Med", url: "https://telemed-link-up.lovable.app" },
        }),
      },
    ],
  }),
  component: DoctorsPage,
});

interface Doctor {
  id: string;
  full_name: string;
  specialty: string;
  specialties: string[];
  city: string | null;
  state: string | null;
  consultation_fee: number | null;
  avatar_url: string | null;
  bio: string | null;
  crm: string;
  crm_uf: string;
  crm_status: string;
  years_experience: number | null;
  avg_stars: number;
  reviews_count: number;
}

function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [locs, setLocs] = useState<string[]>([]);
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(1000);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: docs } = await supabase
        .from("doctors")
        .select("id, specialty, specialties, crm, crm_uf, crm_status, bio, years_experience, city, state, consultation_fee, avatar_url, profiles!inner(full_name)");
      const { data: ratings } = await supabase.from("ratings").select("doctor_id, stars");

      const ratingsMap = new Map<string, { sum: number; count: number }>();
      (ratings ?? []).forEach((r: any) => {
        const cur = ratingsMap.get(r.doctor_id) ?? { sum: 0, count: 0 };
        cur.sum += r.stars; cur.count += 1;
        ratingsMap.set(r.doctor_id, cur);
      });

      const list: Doctor[] = (docs ?? []).map((d: any) => {
        const r = ratingsMap.get(d.id);
        return {
          id: d.id,
          full_name: d.profiles?.full_name ?? "Médico",
          specialty: d.specialty,
          specialties: d.specialties ?? [],
          city: d.city,
          state: d.state,
          consultation_fee: d.consultation_fee,
          avatar_url: d.avatar_url,
          bio: d.bio,
          crm: d.crm,
          crm_uf: d.crm_uf,
          crm_status: d.crm_status,
          years_experience: d.years_experience,
          avg_stars: r ? r.sum / r.count : 0,
          reviews_count: r?.count ?? 0,
        };
      });
      setDoctors(list);
      setLoading(false);
    })();
  }, []);

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      if (d.specialty) set.add(d.specialty);
      d.specialties.forEach((s) => set.add(s));
    });
    return Array.from(set).sort();
  }, [doctors]);

  const allLocations = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      const loc = [d.city, d.state].filter(Boolean).join(", ");
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [doctors]);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const loc = [d.city, d.state].filter(Boolean).join(", ");
      if (q && !(d.full_name.toLowerCase().includes(q) || d.specialty?.toLowerCase().includes(q) || d.specialties.some(s => s.toLowerCase().includes(q)))) return false;
      if (specs.length > 0 && !(specs.includes(d.specialty) || d.specialties.some(s => specs.includes(s)))) return false;
      if (locs.length > 0 && !locs.includes(loc)) return false;
      const fee = d.consultation_fee ?? 0;
      if (fee < minRate || fee > maxRate) return false;
      return true;
    });
  }, [doctors, query, specs, locs, minRate, maxRate]);

  const clear = () => { setQuery(""); setSpecs([]); setLocs([]); setMinRate(0); setMaxRate(1000); };

  const panelProps = { query, setQuery, specs, toggleSpec: (s: string) => setSpecs(toggle(specs, s)), locs, toggleLoc: (l: string) => setLocs(toggle(locs, l)), minRate, setMinRate, maxRate, setMaxRate, clear, allSpecialties, allLocations };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="bg-background">
        <section>
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
            <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Voltar para a página inicial
            </Link>
            <div className="text-center">
              <h1 className="text-3xl font-bold sm:text-4xl">
                Conheça Nossos <span className="text-primary">Médicos</span>
              </h1>
              <p className="mt-3 text-muted-foreground">Explore uma rede de profissionais qualificados.</p>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[280px_1fr]">
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                  <h3 className="mb-4 flex items-center gap-2 font-semibold"><Filter className="h-4 w-4 text-primary" /> Filtros</h3>
                  <FilterPanel {...panelProps} />
                </div>
              </aside>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {loading ? "Carregando..." : <><span className="font-semibold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "médico encontrado" : "médicos encontrados"}</>}
                  </p>
                  <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                        <Filter className="h-4 w-4" /> Filtros
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] sm:w-[380px] overflow-y-auto">
                      <SheetTitle className="sr-only">Filtros</SheetTitle>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-semibold"><Filter className="h-4 w-4 text-primary" /> Filtros</h3>
                        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                      </div>
                      <FilterPanel {...panelProps} />
                      <Button onClick={() => setOpen(false)} className="mt-6 w-full">Aplicar filtros</Button>
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">Carregando médicos...</div>
                  ) : filtered.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
                      {doctors.length === 0 ? "Ainda não há médicos cadastrados." : "Nenhum médico encontrado com esses filtros."}
                    </div>
                  ) : (
                    filtered.map((d) => <DoctorCard key={d.id} d={d} />)
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

interface PanelProps {
  query: string; setQuery: (v: string) => void;
  specs: string[]; toggleSpec: (s: string) => void;
  locs: string[]; toggleLoc: (l: string) => void;
  minRate: number; setMinRate: (n: number) => void;
  maxRate: number; setMaxRate: (n: number) => void;
  clear: () => void;
  allSpecialties: string[];
  allLocations: string[];
}

function FilterPanel({ query, setQuery, specs, toggleSpec, locs, toggleLoc, minRate, setMinRate, maxRate, setMaxRate, clear, allSpecialties, allLocations }: PanelProps) {
  const [specQ, setSpecQ] = useState("");
  const [locQ, setLocQ] = useState("");
  const filteredSpecs = useMemo(() => {
    const t = specQ.trim().toLowerCase();
    return t ? allSpecialties.filter(s => s.toLowerCase().includes(t)) : allSpecialties;
  }, [specQ, allSpecialties]);
  const filteredLocs = useMemo(() => {
    const t = locQ.trim().toLowerCase();
    return t ? allLocations.filter(l => l.toLowerCase().includes(t)) : allLocations;
  }, [locQ, allLocations]);

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">Busca</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome" className="pl-9" />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Especialidades</p>
        <Input value={specQ} onChange={(e) => setSpecQ(e.target.value)} placeholder="Buscar especialidade..." className="mb-2 h-8 text-xs" />
        <div className="space-y-2 max-h-48 overflow-auto pr-1">
          {filteredSpecs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma especialidade.</p>
          ) : filteredSpecs.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={specs.includes(s)} onCheckedChange={() => toggleSpec(s)} />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Localização</p>
        <Input value={locQ} onChange={(e) => setLocQ(e.target.value)} placeholder="Buscar localização..." className="mb-2 h-8 text-xs" />
        <div className="space-y-2 max-h-40 overflow-auto pr-1">
          {filteredLocs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma localização.</p>
          ) : filteredLocs.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={locs.includes(l)} onCheckedChange={() => toggleLoc(l)} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Valor consulta (R$)</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Mínimo</span><span>R$ {minRate}</span></div>
            <input type="range" min={0} max={1000} step={10} value={minRate} onChange={(e) => setMinRate(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Máximo</span><span>R$ {maxRate}</span></div>
            <input type="range" min={0} max={1000} step={10} value={maxRate} onChange={(e) => setMaxRate(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>
      </div>
      <button type="button" onClick={clear} className="text-sm font-medium text-primary hover:underline">
        Limpar filtros
      </button>
    </div>
  );
}

function DoctorCard({ d }: { d: Doctor }) {
  const loc = [d.city, d.state].filter(Boolean).join(", ");
  const tags = Array.from(new Set([d.specialty, ...d.specialties].filter(Boolean))).slice(0, 4);
  return (
    <div className="rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="h-16 w-16 shrink-0 border-2 border-border">
          {d.avatar_url && <AvatarImage src={d.avatar_url} alt={d.full_name} />}
          <AvatarFallback className="bg-accent text-primary">
            {d.full_name ? d.full_name.charAt(0).toUpperCase() : <Stethoscope className="h-7 w-7" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold flex items-center gap-1.5">
                {d.full_name}
                {d.crm_status === "verified" && <BadgeCheck className="h-4 w-4 text-primary" />}
              </h3>
              <p className="text-sm text-muted-foreground">{d.specialty} · CRM {d.crm}/{d.crm_uf}</p>
            </div>
            {d.consultation_fee != null && (
              <div className="text-right">
                <p className="text-lg font-bold text-primary">R$ {Number(d.consultation_fee).toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/consulta</span></p>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="font-medium text-foreground">{d.avg_stars > 0 ? d.avg_stars.toFixed(1) : "—"}</span>
              {d.reviews_count > 0 && <span>({d.reviews_count})</span>}
            </span>
            {loc && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {loc}</span>}
            {d.years_experience != null && <span>{d.years_experience} anos de experiência</span>}
          </div>
          {d.bio && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{d.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((s) => <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>)}
          </div>
          <div className="mt-4 flex justify-end">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm">Ver perfil</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
