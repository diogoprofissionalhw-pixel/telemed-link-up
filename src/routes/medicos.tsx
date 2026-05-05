import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Star, MapPin, Clock, Filter, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/medicos")({
  head: () => ({
    meta: [
      { title: "Conheça Nossos Médicos — Connect-Med" },
      { name: "description", content: "Explore a rede Connect-Med de médicos qualificados. Filtre por especialidade, localização e taxa horária." },
      { property: "og:title", content: "Conheça Nossos Médicos — Connect-Med" },
      { property: "og:description", content: "Explore profissionais qualificados em telemedicina." },
    ],
  }),
  component: DoctorsPage,
});

const DOCTORS = [
  { id: 1, name: "Dr. Carlos Silva", specialty: "Médico Clínico Geral", location: "São Paulo, SP", rating: 4.9, reviews: 127, responseTime: "Responde em minutos", hourlyRate: 150, specialties: ["Clínica Geral", "Telemedicina", "Diagnóstico Clínico"], avatar: "👨‍⚕️" },
  { id: 2, name: "Dra. Marina Costa", specialty: "Cardiologista", location: "Rio de Janeiro, RJ", rating: 4.8, reviews: 95, responseTime: "Responde em 2 horas", hourlyRate: 200, specialties: ["Cardiologia", "Telemedicina", "Prevenção"], avatar: "👩‍⚕️" },
  { id: 3, name: "Dr. Rafael Mendes", specialty: "Pediatra", location: "Belo Horizonte, MG", rating: 4.7, reviews: 64, responseTime: "Responde em 1 hora", hourlyRate: 180, specialties: ["Pediatria", "Telemedicina", "Neonatologia"], avatar: "👨‍⚕️" },
  { id: 4, name: "Dra. Juliana Alves", specialty: "Psiquiatra", location: "São Paulo, SP", rating: 5.0, reviews: 152, responseTime: "Responde em minutos", hourlyRate: 250, specialties: ["Psiquiatria", "Telemedicina", "Saúde Mental"], avatar: "👩‍⚕️" },
  { id: 5, name: "Dr. Pedro Rocha", specialty: "Médico de Família", location: "Curitiba, PR", rating: 4.6, reviews: 41, responseTime: "Responde em 3 horas", hourlyRate: 130, specialties: ["Medicina de Família", "Clínica Geral"], avatar: "👨‍⚕️" },
  { id: 6, name: "Dra. Beatriz Lima", specialty: "Endocrinologista", location: "Porto Alegre, RS", rating: 4.9, reviews: 88, responseTime: "Responde em 1 hora", hourlyRate: 220, specialties: ["Endocrinologia", "Telemedicina"], avatar: "👩‍⚕️" },
];

const ALL_SPECIALTIES = ["Clínica Geral", "Cardiologia", "Pediatria", "Psiquiatria", "Medicina de Família", "Endocrinologia", "Telemedicina"];
const ALL_LOCATIONS = ["São Paulo, SP", "Rio de Janeiro, RJ", "Belo Horizonte, MG", "Curitiba, PR", "Porto Alegre, RS"];

function DoctorsPage() {
  const [query, setQuery] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [locs, setLocs] = useState<string[]>([]);
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(500);
  const [open, setOpen] = useState(false);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DOCTORS.filter((d) => {
      if (q && !(d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || d.specialties.some(s => s.toLowerCase().includes(q)))) return false;
      if (specs.length > 0 && !d.specialties.some(s => specs.includes(s))) return false;
      if (locs.length > 0 && !locs.includes(d.location)) return false;
      if (d.hourlyRate < minRate || d.hourlyRate > maxRate) return false;
      return true;
    });
  }, [query, specs, locs, minRate, maxRate]);

  const clear = () => { setQuery(""); setSpecs([]); setLocs([]); setMinRate(0); setMaxRate(500); };

  const panelProps = { query, setQuery, specs, toggleSpec: (s: string) => setSpecs(toggle(specs, s)), locs, toggleLoc: (l: string) => setLocs(toggle(locs, l)), minRate, setMinRate, maxRate, setMaxRate, clear };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-background">
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
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "médico encontrado" : "médicos encontrados"}</p>
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
                {filtered.length === 0 ? (
                  <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
                    Nenhum médico encontrado com esses filtros.
                  </div>
                ) : (
                  filtered.map((d) => <DoctorCard key={d.id} d={d} />)
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterPanel({
  query, setQuery, specs, toggleSpec, locs, toggleLoc, minRate, setMinRate, maxRate, setMaxRate, clear,
}: {
  query: string; setQuery: (v: string) => void;
  specs: string[]; toggleSpec: (s: string) => void;
  locs: string[]; toggleLoc: (l: string) => void;
  minRate: number; setMinRate: (n: number) => void;
  maxRate: number; setMaxRate: (n: number) => void;
  clear: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">Busca</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome ou especialidade..." className="pl-9" />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Especialidades</p>
        <div className="space-y-2 max-h-48 overflow-auto pr-1">
          {ALL_SPECIALTIES.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={specs.includes(s)} onCheckedChange={() => toggleSpec(s)} />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Localização</p>
        <div className="space-y-2 max-h-40 overflow-auto pr-1">
          {ALL_LOCATIONS.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={locs.includes(l)} onCheckedChange={() => toggleLoc(l)} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Taxa horária (R$)</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Mínimo</span><span>R$ {minRate}</span></div>
            <input type="range" min={0} max={500} step={10} value={minRate} onChange={(e) => setMinRate(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Máximo</span><span>R$ {maxRate}</span></div>
            <input type="range" min={0} max={500} step={10} value={maxRate} onChange={(e) => setMaxRate(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>
      </div>
      <button type="button" onClick={clear} className="text-sm font-medium text-primary hover:underline">
        Limpar filtros
      </button>
    </div>
  );
}

function DoctorCard({ d }: { d: typeof DOCTORS[number] }) {
  return (
    <div className="rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent text-3xl">{d.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold">{d.name}</h3>
              <p className="text-sm text-muted-foreground">{d.specialty}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">R$ {d.hourlyRate}<span className="text-xs font-normal text-muted-foreground">/hora</span></p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> <span className="font-medium text-foreground">{d.rating}</span> ({d.reviews})</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {d.location}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {d.responseTime}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.specialties.map((s) => <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>)}
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
