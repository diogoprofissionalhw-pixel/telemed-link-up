import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock3, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  getAcademyCourse,
  listAcademyCourses,
  type AcademyCourse,
  type AcademyModuleMeta,
} from "@/lib/academy.functions";
import {
  getCompanyPanel,
  listLinkableDoctors,
  saveCompanyTrack,
  setCompanyMember,
} from "@/lib/academy-company.functions";
import type { StudentProgressRow } from "@/lib/academy-progress.functions";

export const Route = createFileRoute("/academy/empresa")({
  head: () => ({
    meta: [
      { title: "Painel da empresa — Connect-Academy" },
      {
        name: "description",
        content: "Acompanhe a jornada dos profissionais da sua equipe e monte trilhas personalizadas na Connect-Academy.",
      },
      { property: "og:title", content: "Painel da empresa — Connect-Academy" },
      { property: "og:description", content: "Equipe, trilha personalizada e progresso dos profissionais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyPanelPage,
});

function CompanyPanelPage() {
  const { user, profile, loading } = useAuth();
  const isNetwork = profile?.account_type === "network";

  const panelFn = useServerFn(getCompanyPanel);
  const linkableFn = useServerFn(listLinkableDoctors);
  const memberFn = useServerFn(setCompanyMember);
  const saveTrackFn = useServerFn(saveCompanyTrack);
  const coursesFn = useServerFn(listAcademyCourses);
  const courseFn = useServerFn(getAcademyCourse);

  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [courseId, setCourseId] = useState("");
  const [courseModules, setCourseModules] = useState<AcademyModuleMeta[]>([]);
  const [roster, setRoster] = useState<
    { doctorId: string; name: string; specialty: string | null; status: "pending" | "accepted" }[]
  >([]);
  const [linkable, setLinkable] = useState<{ doctorId: string; name: string; specialty: string | null }[]>([]);
  const [progressRows, setProgressRows] = useState<StudentProgressRow[]>([]);
  const [trackTitle, setTrackTitle] = useState("Trilha da equipe");
  const [trackDescription, setTrackDescription] = useState("");
  const [selectedModules, setSelectedModules] = useState<{ courseId: string; moduleId: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    coursesFn({ data: undefined as never })
      .then((r) => {
        setCourses(r.items);
        if (r.items[0]) setCourseId(r.items[0].id);
      })
      .catch(() => undefined);
  }, [coursesFn]);

  const reload = useCallback(() => {
    if (!isNetwork) return;
    setBusy(true);
    panelFn({ data: { courseId: courseId || null } })
      .then((r) => {
        setRoster(r.roster);
        setProgressRows(r.progress);
        if (r.track) {
          setTrackTitle(r.track.title);
          setTrackDescription(r.track.description ?? "");
        }
        setSelectedModules(
          r.items
            .filter((i) => i.module_id)
            .map((i) => ({ courseId: i.course_id, moduleId: i.module_id as string })),
        );
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar painel"))
      .finally(() => setBusy(false));
    linkableFn({ data: undefined as never })
      .then((r) => setLinkable(r.items))
      .catch(() => undefined);
  }, [isNetwork, panelFn, linkableFn, courseId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const slug = courses.find((c) => c.id === courseId)?.slug;
    if (!slug) return;
    courseFn({ data: { slug } })
      .then((r) => setCourseModules(r.modules))
      .catch(() => setCourseModules([]));
  }, [courseId, courses, courseFn]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!user || !isNetwork) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-xl font-bold">Painel exclusivo das empresas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com uma conta de empresa parceira para acompanhar sua equipe na Academy.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/academy">
              <Button>Voltar à Academy</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const toggleMember = async (doctorId: string, linked: boolean) => {
    try {
      const res = await memberFn({ data: { doctorId, linked } });
      if (!res.ok) throw new Error(res.error ?? "Erro ao atualizar equipe");
      toast.success(
        linked
          ? "Convite enviado — o profissional precisa aceitar para entrar na equipe."
          : "Vínculo removido.",
      );
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar equipe");
    }
  };

  const toggleModule = (moduleId: string) =>
    setSelectedModules((list) =>
      list.some((m) => m.moduleId === moduleId)
        ? list.filter((m) => m.moduleId !== moduleId)
        : [...list, { courseId, moduleId }],
    );

  const persistTrack = async () => {
    setBusy(true);
    try {
      const res = await saveTrackFn({
        data: {
          title: trackTitle.trim() || "Trilha da equipe",
          description: trackDescription.trim() || null,
          modules: selectedModules,
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Erro ao salvar trilha");
      toast.success("Trilha personalizada salva.");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar trilha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royal">Painel da empresa</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vincule profissionais, monte a trilha da equipe e acompanhe o progresso.
            </p>
          </div>
          <BackButton to="/academy" label="Voltar à Academy" />
        </div>

        <div className="mb-6 max-w-sm">
          <Label>Trilha analisada</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha a trilha" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="progresso">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="progresso">Progresso</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="trilha">Trilha personalizada</TabsTrigger>
          </TabsList>

          <TabsContent value="progresso">
            {busy ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : progressRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Nenhum profissional da sua equipe começou esta trilha ainda.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {progressRows.map((r) => (
                  <li key={r.userId} className="rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{r.name}</p>
                      {r.courseCompleted ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          <CheckCircle2 className="h-4 w-4" /> Concluído
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.percent}%</span>
                      )}
                    </div>
                    <Progress value={r.percent} className="mt-2 h-2" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.lessonsCompleted} de {r.lessonsTotal} aulas · {r.quizzesPassed} quiz(zes) aprovado(s)
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="equipe">
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-4 w-4" /> Minha equipe ({roster.length})
                </h2>
                {roster.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Nenhum profissional vinculado.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {roster.map((m) => (
                      <li key={m.doctorId} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.specialty ?? "Médico"}</p>
                        </div>
                        {m.status === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
                            <Clock3 className="h-3.5 w-3.5" /> Convite pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Na equipe
                          </span>
                        )}
                        <Button variant="outline" size="sm" onClick={() => toggleMember(m.doctorId, false)}>
                          Remover
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Profissionais verificados
                </h2>
                <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
                  {linkable
                    .filter((d) => !roster.some((m) => m.doctorId === d.doctorId))
                    .map((d) => (
                      <li key={d.doctorId} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{d.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{d.specialty ?? "Médico"}</p>
                        </div>
                        <Button size="sm" onClick={() => toggleMember(d.doctorId, true)}>
                          Convidar
                        </Button>
                      </li>
                    ))}
                </ul>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="trilha">
            <section className="rounded-2xl border bg-card p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ttitle">Nome da trilha da equipe</Label>
                  <Input id="ttitle" value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="tdesc">Descrição</Label>
                  <Textarea
                    id="tdesc"
                    rows={2}
                    value={trackDescription}
                    onChange={(e) => setTrackDescription(e.target.value)}
                  />
                </div>
              </div>

              <p className="mt-5 text-sm font-medium">Módulos liberados para a equipe</p>
              <ul className="mt-3 flex flex-col gap-2">
                {courseModules.length === 0 ? (
                  <li className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Esta trilha ainda não tem módulos publicados.
                  </li>
                ) : (
                  courseModules.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.lessons.length} aula(s)</p>
                      </div>
                      <Switch
                        checked={selectedModules.some((s) => s.moduleId === m.id)}
                        onCheckedChange={() => toggleModule(m.id)}
                      />
                    </li>
                  ))
                )}
              </ul>

              <Button onClick={persistTrack} disabled={busy} className="mt-5 gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar trilha da equipe
              </Button>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
