import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, MapPin, Filter, X, Stethoscope, BadgeCheck, ShieldCheck, Lock, Star, Check, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { StarRating } from "@/components/star-rating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getFirstName, formatPublicId } from "@/lib/utils";

export const Route = createFileRoute("/medicos")({
  head: () => ({
    meta: [
      { title: "Médicos da rede Connect-Med — diretório de profissionais" },
      { name: "description", content: "Diretório de médicos verificados da Connect-Med. Perfis com identidade protegida (shadow profiles) — apenas redes verificadas via CNPJ acessam dados completos." },
      { property: "og:title", content: "Médicos da rede Connect-Med" },
      { property: "og:description", content: "Diretório com privacidade reforçada. Cadastre sua rede para acessar perfis completos." },
      { property: "og:url", content: "https://telemed-link-up.lovable.app/medicos" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://telemed-link-up.lovable.app/medicos" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Médicos da rede Connect-Med",
        description: "Diretório de médicos verificados disponíveis para plantões de telemedicina.",
        url: "https://telemed-link-up.lovable.app/medicos",
      }),
    }],
  }),
  component: DoctorsPage,
});

interface PublicDoctor {
  id: string;
  public_id: string;
  first_name: string;
  specialty: string;
  specialties: string[];
  city: string | null;
  state: string | null;
  consultation_fee: number | null;
  crm_status: string;
  identity_verified: boolean;
  is_premium: boolean;
  years_experience: number | null;
  avg_stars: number;
  reviews_count: number;
  approval_rate: number; // 0-100
}

function DoctorsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [locs, setLocs] = useState<string[]>([]);
  const [minRate, setMinRate] = useState(0);
  const [maxRate, setMaxRate] = useState(1000);
  const [minStars, setMinStars] = useState(0);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [open, setOpen] = useState(false);

  // Verification status of the logged-in network (if any)
  const [networkVerified, setNetworkVerified] = useState<boolean | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: docs }, { data: ratings }, { data: reqs }] = await Promise.all([
        supabase
          .from("doctors")
          .select("id, public_id, specialty, specialties, crm_status, identity_verified, is_premium, years_experience, city, state, consultation_fee, profiles!inner(full_name)"),
        supabase.from("ratings").select("doctor_id, stars"),
        supabase.from("shift_requests").select("doctor_id, status"),
      ]);

      const rMap = new Map<string, { sum: number; count: number }>();
      (ratings ?? []).forEach((r: any) => {
        const c = rMap.get(r.doctor_id) ?? { sum: 0, count: 0 };
        c.sum += r.stars; c.count++; rMap.set(r.doctor_id, c);
      });
      const aMap = new Map<string, { acc: number; total: number }>();
      (reqs ?? []).forEach((r: any) => {
        const c = aMap.get(r.doctor_id) ?? { acc: 0, total: 0 };
        c.total++; if (r.status === "accepted" || r.status === "completed") c.acc++;
        aMap.set(r.doctor_id, c);
      });

      const list: PublicDoctor[] = (docs ?? []).map((d: any) => {
        const r = rMap.get(d.id);
        const a = aMap.get(d.id);
        return {
          id: d.id,
          public_id: d.public_id ?? "----",
          first_name: getFirstName(d.profiles?.full_name),
          specialty: d.specialty,
          specialties: d.specialties ?? [],
          city: d.city,
          state: d.state,
          consultation_fee: d.consultation_fee,
          crm_status: d.crm_status,
          identity_verified: !!d.identity_verified,
          is_premium: !!d.is_premium,
          years_experience: d.years_experience,
          avg_stars: r ? r.sum / r.count : 0,
          reviews_count: r?.count ?? 0,
          approval_rate: a && a.total > 0 ? Math.round((a.acc / a.total) * 100) : 0,
        };
      });
      setDoctors(list);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!user || profile?.account_type !== "network") { setNetworkVerified(null); return; }
    supabase.from("networks").select("is_verified").eq("id", user.id).maybeSingle()
      .then(({ data }) => setNetworkVerified(!!data?.is_verified));
  }, [user, profile]);

  const allSpecialties = useMemo(() => {
    const s = new Set<string>();
    doctors.forEach((d) => { if (d.specialty) s.add(d.specialty); d.specialties.forEach(x => s.add(x)); });
    return Array.from(s).sort();
  }, [doctors]);
  const allLocations = useMemo(() => {
    const s = new Set<string>();
    doctors.forEach((d) => { const l = [d.city, d.state].filter(Boolean).join(", "); if (l) s.add(l); });
    return Array.from(s).sort();
  }, [doctors]);
  const toggle = (a: string[], v: string) => a.includes(v) ? a.filter(x => x !== v) : [...a, v];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const loc = [d.city, d.state].filter(Boolean).join(", ");
      if (q && !(d.first_name.toLowerCase().includes(q) || d.public_id.includes(q) || d.specialty?.toLowerCase().includes(q) || d.specialties.some(s => s.toLowerCase().includes(q)))) return false;
      if (specs.length > 0 && !(specs.includes(d.specialty) || d.specialties.some(s => specs.includes(s)))) return false;
      if (locs.length > 0 && !locs.includes(loc)) return false;
      const fee = d.consultation_fee ?? 0;
      if (fee < minRate || fee > maxRate) return false;
      if (minStars > 0 && d.avg_stars < minStars) return false;
      if (onlyVerified && d.crm_status !== "verified") return false;
      return true;
    }).sort((a, b) => {
      if (a.is_premium !== b.is_premium) return a.is_premium ? -1 : 1;
      return b.avg_stars - a.avg_stars;
    });
  }, [doctors, query, specs, locs, minRate, maxRate, minStars, onlyVerified]);

  const clear = () => { setQuery(""); setSpecs([]); setLocs([]); setMinRate(0); setMaxRate(1000); setMinStars(0); setOnlyVerified(false); };

  const handleViewProfile = (d: PublicDoctor) => {
    if (!user) {
      toast.info("Cadastre sua rede para ver perfis completos.");
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    if (profile?.account_type === "doctor") {
      // Doctors can see full profiles
      navigate({ to: "/medicos" }); // placeholder — no public profile route yet
      return;
    }
    if (profile?.account_type === "network" && !networkVerified) {
      setGateOpen(true);
      return;
    }
    // Verified network — could navigate to detail page (not implemented here)
    toast.success(`Acesso liberado a ${d.first_name} ${formatPublicId(d.public_id)}`);
  };

  const panelProps = { query, setQuery, specs, toggleSpec: (s: string) => setSpecs(toggle(specs, s)), locs, toggleLoc: (l: string) => setLocs(toggle(locs, l)), minRate, setMinRate, maxRate, setMaxRate, minStars, setMinStars, onlyVerified, setOnlyVerified, clear, allSpecialties, allLocations };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="bg-background">
        <section>
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
            <div className="relative flex items-center justify-center">
              <BackButton to="/" label="Voltar para a página inicial" className="absolute left-0 top-1/2 -translate-y-1/2" />
              <div className="text-center">
                <h1 className="text-3xl font-bold sm:text-4xl">
                  Conheça Nossos <span className="text-primary">Médicos</span>
                </h1>
                <p className="mt-3 text-muted-foreground">Identidades protegidas — apenas redes verificadas acessam dados completos.</p>
              </div>
            </div>

            <div className="mt-10 mb-4 flex items-center justify-between">
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

            <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                  <h3 className="mb-4 flex items-center gap-2 font-semibold"><Filter className="h-4 w-4 text-primary" /> Filtros</h3>
                  <FilterPanel {...panelProps} />
                </div>
              </aside>

              <div className="space-y-4">
                {loading ? (
                  <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">Carregando médicos...</div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
                    {doctors.length === 0 ? "Ainda não há médicos cadastrados." : "Nenhum médico encontrado com esses filtros."}
                  </div>
                ) : (
                  filtered.map((d) => <ShadowDoctorCard key={d.id} d={d} onView={() => handleViewProfile(d)} />)
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Verificação necessária</DialogTitle>
            <DialogDescription>
              A visualização total dos perfis depende da validação do CNPJ da sua rede.
              Confirme a atividade econômica em saúde para liberar nomes completos, currículos e o início de conversas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGateOpen(false)}>Mais tarde</Button>
            <Button onClick={() => { setGateOpen(false); navigate({ to: "/perfil-empresa" }); }}>Validar agora</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PanelProps {
  query: string; setQuery: (v: string) => void;
  specs: string[]; toggleSpec: (s: string) => void;
  locs: string[]; toggleLoc: (l: string) => void;
  minRate: number; setMinRate: (n: number) => void;
  maxRate: number; setMaxRate: (n: number) => void;
  minStars: number; setMinStars: (n: number) => void;
  onlyVerified: boolean; setOnlyVerified: (v: boolean) => void;
  clear: () => void;
  allSpecialties: string[];
  allLocations: string[];
}

function FilterPanel({ query, setQuery, specs, toggleSpec, locs, toggleLoc, minRate, setMinRate, maxRate, setMaxRate, minStars, setMinStars, onlyVerified, setOnlyVerified, clear, allSpecialties, allLocations }: PanelProps) {
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
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
        <Checkbox checked={onlyVerified} onCheckedChange={(v) => setOnlyVerified(!!v)} className="mt-0.5" />
        <span className="text-sm">
          <span className="flex items-center gap-1 font-medium text-emerald-900"><BadgeCheck className="h-3.5 w-3.5" /> Apenas médicos verificados</span>
          <span className="block text-[11px] text-emerald-900/70">Exibe somente perfis com Informações Verificadas por CRM.</span>
        </span>
      </label>
      <div>
        <label className="mb-2 block text-sm font-medium">Busca</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome ou ID" className="pl-9" />
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
      <div>
        <p className="mb-2 text-sm font-medium">Avaliação mínima</p>
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMinStars(n)}
              className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${minStars === n ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {n === 0 ? "Qualquer" : <><Star className="h-3 w-3 fill-current" /> {n}+</>}
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={clear} className="text-sm font-medium text-primary hover:underline">
        Limpar filtros
      </button>
    </div>
  );
}

function ShadowDoctorCard({ d, onView }: { d: PublicDoctor; onView: () => void }) {
  const loc = [d.city, d.state].filter(Boolean).join(", ");
  const tags = Array.from(new Set([d.specialty, ...d.specialties].filter(Boolean))).slice(0, 4);
  const crmLabel = d.crm_status === "verified" ? "Informações Verificadas por CRM" : d.crm_status === "pending" ? "Registro Provisório" : "CRM em análise";
  const isVerified = d.crm_status === "verified";
  return (
    <div
      className={`relative rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        d.is_premium
          ? "border-amber-300 ring-2 ring-amber-200/60"
          : isVerified
            ? "border-sky-200 ring-1 ring-sky-100"
            : ""
      }`}
      style={{ boxShadow: d.is_premium ? "0 8px 28px -8px rgba(245, 158, 11, 0.35)" : isVerified ? "0 6px 22px -10px rgba(59, 130, 246, 0.25)" : "var(--shadow-card)" }}
    >
      {d.is_premium && (
        <div className="absolute -top-2 left-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
          <Star className="h-3 w-3 fill-current" /> Premium
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className={`h-16 w-16 shrink-0 border-2 ${d.is_premium ? "border-amber-300" : "border-border"}`}>
          <AvatarFallback className="bg-accent text-primary">
            <Stethoscope className="h-7 w-7" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold flex flex-wrap items-center gap-1.5">
                Dr(a). {d.first_name}
                {d.crm_status === "verified" && (
                  <span
                    title="Informações Verificadas por CRM"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sm ring-2 ring-white"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                  </span>
                )}
                {d.is_premium && (
                  <span
                    title="Médico Premium"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-white shadow-sm ring-2 ring-white"
                  >
                    <Star className="h-3 w-3 fill-current" />
                  </span>
                )}
                <span className="text-xs font-mono text-muted-foreground">— ID {formatPublicId(d.public_id)}</span>
              </h3>
              <p className="text-sm text-muted-foreground">{d.specialty}</p>
            </div>
            {d.consultation_fee != null && (
              <div className="text-right">
                <p className="text-lg font-bold text-primary">R$ {Number(d.consultation_fee).toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/consulta</span></p>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {d.crm_status === "verified" && (
              <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><BadgeCheck className="h-3.5 w-3.5" /> {crmLabel}</Badge>
            )}
            {d.crm_status === "pending" && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100"><BadgeCheck className="h-3.5 w-3.5" /> {crmLabel}</Badge>
            )}
            {d.identity_verified && (
              <Badge variant="secondary" className="gap-1 bg-sky-100 text-sky-700 hover:bg-sky-100"><ShieldCheck className="h-3.5 w-3.5" /> Identidade Verificada</Badge>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <StarRating value={d.avg_stars} readonly size={16} />
              {d.reviews_count > 0 && <span className="font-medium text-foreground">{d.avg_stars.toFixed(1)} ({d.reviews_count})</span>}
            </span>
            {loc && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {loc}</span>}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Experiência</p>
              <p className="text-sm font-semibold text-foreground">{d.years_experience ?? 0} anos</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Taxa de aprovação</p>
              <p className="text-sm font-semibold text-foreground">{d.approval_rate}%</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((s) => <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>)}
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={onView} className="gap-1.5"><Lock className="h-3.5 w-3.5" /> Ver perfil</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
