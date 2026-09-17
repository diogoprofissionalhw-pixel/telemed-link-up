import type { ErrorComponentProps } from "@tanstack/react-router";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  FileDown,
  ListChecks,
  Lock,
  PlayCircle,
  Settings,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PlansDialog } from "@/components/plans-dialog";
import { AcademyQuizDialog } from "@/components/academy-quiz-dialog";
import { useAuth } from "@/lib/auth-context";
import { isMasterEmail } from "@/lib/master-access";
import { toEmbedUrl, formatDuration } from "@/lib/video-embed";
import { downloadLessonSummaryPdf } from "@/lib/academy-pdf";
import {
  getAcademyAccess,
  getAcademyCourse,
  getLessonPlayback,
  getLessonSummary,
  type AcademyLessonMeta,
  type AcademyModuleMeta,
} from "@/lib/academy.functions";
import {
  getMyCourseProgress,
  saveLessonProgress,
  WATCHED_THRESHOLD,
  type CourseProgress,
} from "@/lib/academy-progress.functions";
import { getMyCompanyTrack } from "@/lib/academy-company.functions";

export const Route = createFileRoute("/academy/$courseSlug")({
  loader: async ({ params }) => {
    const res = await getAcademyCourse({ data: { slug: params.courseSlug } });
    if (res.error) throw new Error(res.error);
    if (!res.course) throw notFound();
    return { course: res.course, modules: res.modules, lessons: res.lessons };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.course
      ? `${loaderData.course.title} — Connect-Academy`
      : "Trilha — Connect-Academy";
    const description =
      loaderData?.course?.description ??
      "Assista às aulas em vídeo, faça os quizzes e acompanhe seu progresso na Connect-Academy.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: ({ error }: ErrorComponentProps) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-destructive">Erro ao carregar a trilha: {(error instanceof Error ? error.message : String(error))}</p>
        <div className="mt-6 flex justify-center">
          <Link to="/academy">
            <Button>Voltar à Academy</Button>
          </Link>
        </div>
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Trilha não encontrada</h1>
        <div className="mt-6 flex justify-center">
          <Link to="/academy">
            <Button>Voltar à Academy</Button>
          </Link>
        </div>
      </main>
    </div>
  ),
  component: CoursePage,
});

type QuizTarget = { scope: "lesson"; lessonId: string } | { scope: "module"; moduleId: string };

function CoursePage() {
  const { course, modules, lessons } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchAccess = useServerFn(getAcademyAccess);
  const fetchPlayback = useServerFn(getLessonPlayback);
  const fetchProgress = useServerFn(getMyCourseProgress);
  const persistProgress = useServerFn(saveLessonProgress);
  const fetchSummary = useServerFn(getLessonSummary);
  const fetchCompanyTrack = useServerFn(getMyCompanyTrack);

  const firstLesson = modules.flatMap((m: AcademyModuleMeta) => m.lessons)[0] ?? lessons[0] ?? null;
  const [current, setCurrent] = useState<AcademyLessonMeta | null>(firstLesson);
  const [access, setAccess] = useState({ canWatch: false, isMaster: false });
  const [playback, setPlayback] = useState<{ kind: string | null; src: string | null } | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [quizTarget, setQuizTarget] = useState<QuizTarget | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [company, setCompany] = useState<{ title: string; companyName: string | null; moduleIds: string[] } | null>(
    null,
  );
  const lastSaved = useRef(0);

  useEffect(() => {
    if (!user) {
      setAccess({ canWatch: false, isMaster: false });
      return;
    }
    fetchAccess({ data: undefined as never })
      .then((r) => setAccess({ canWatch: r.canWatch, isMaster: r.isMaster }))
      .catch(() => setAccess({ canWatch: false, isMaster: false }));
    fetchCompanyTrack({ data: undefined as never })
      .then((r) =>
        setCompany(
          r.track ? { title: r.track.title, companyName: r.companyName, moduleIds: r.moduleIds } : null,
        ),
      )
      .catch(() => setCompany(null));
  }, [user, fetchAccess, fetchCompanyTrack]);

  const reloadProgress = useCallback(() => {
    if (!user) return;
    fetchProgress({ data: { courseId: course.id } })
      .then(setProgress)
      .catch(() => setProgress(null));
  }, [user, fetchProgress, course.id]);

  useEffect(() => {
    reloadProgress();
  }, [reloadProgress]);

  const isMaster = access.isMaster || isMasterEmail(user?.email);
  const locked = !access.canWatch && !isMaster;

  const isModuleUnlocked = (moduleId: string, index: number) => {
    if (isMaster) return true;
    if (!progress) return index === 0;
    return progress.unlockedModuleIds.includes(moduleId);
  };
  const lessonState = (lessonId: string) =>
    progress?.lessons.find((l) => l.lessonId === lessonId) ?? { percent: 0, completed: false };
  const isLessonUnlocked = (lessonId: string, moduleIndex: number, lessonIndex: number) => {
    if (isMaster) return true;
    if (!progress) return moduleIndex === 0 && lessonIndex === 0;
    return progress.unlockedLessonIds.includes(lessonId);
  };
  const moduleQuiz = (moduleId: string) =>
    progress?.quizzes.find((q) => q.scope === "module" && q.moduleId === moduleId);
  const lessonQuiz = (lessonId: string) =>
    progress?.quizzes.find((q) => q.scope === "lesson" && q.lessonId === lessonId);

  const currentModuleIndex = modules.findIndex((m: AcademyModuleMeta) =>
    m.lessons.some((l) => l.id === current?.id),
  );
  const currentModule = currentModuleIndex >= 0 ? modules[currentModuleIndex] : null;
  const currentLessonIndex = currentModule
    ? currentModule.lessons.findIndex((l) => l.id === current?.id)
    : -1;
  const currentLessonLocked =
    !!current &&
    !!currentModule &&
    (!isModuleUnlocked(currentModule.id, currentModuleIndex) ||
      !isLessonUnlocked(current.id, currentModuleIndex, currentLessonIndex));

  useEffect(() => {
    if (!current || locked || currentLessonLocked) {
      setPlayback(null);
      return;
    }
    setLoadingVideo(true);
    fetchPlayback({ data: { lessonId: current.id } })
      .then((r) => setPlayback({ kind: r.kind, src: r.src }))
      .catch(() => setPlayback(null))
      .finally(() => setLoadingVideo(false));
  }, [current, locked, currentLessonLocked, fetchPlayback]);

  const saveProgress = (watched: number, percent: number) => {
    if (!user || !current) return;
    persistProgress({ data: { lessonId: current.id, watchedSeconds: watched, percent } })
      .then((r) => {
        if (r.attemptsReset) toast.success("Tentativas do quiz liberadas novamente.");
        reloadProgress();
      })
      .catch(() => undefined);
  };

  const onTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    if (!el.duration || !Number.isFinite(el.duration)) return;
    const percent = Math.min(100, Math.round((el.currentTime / el.duration) * 100));
    if (Date.now() - lastSaved.current < 10000) return;
    lastSaved.current = Date.now();
    saveProgress(Math.round(el.currentTime), percent);
  };

  const openQuizForLesson = (lessonId: string) => {
    const st = lessonState(lessonId);
    if (!st.completed && st.percent < WATCHED_THRESHOLD && !isMaster) {
      toast.error("Assista a aula até o fim para liberar o quiz.");
      return;
    }
    setQuizTarget({ scope: "lesson", lessonId });
    setQuizOpen(true);
  };

  const openLessonQuiz = () => {
    if (!current) return;
    openQuizForLesson(current.id);
  };

  const downloadSummary = async () => {
    if (!current) return;
    try {
      const res = await fetchSummary({ data: { lessonId: current.id } });
      if (res.locked || !res.summary) {
        toast.error("Resumo não disponível para esta aula.");
        return;
      }
      await downloadLessonSummaryPdf({
        courseTitle: course.title,
        lessonTitle: res.title ?? current.title,
        summary: res.summary,
        references: res.references,
        images: res.images,
      });
    } catch {
      toast.error("Não foi possível gerar o PDF agora.");
    }
  };

  const currentState = current ? lessonState(current.id) : { percent: 0, completed: false };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={`mb-3 h-1.5 w-16 rounded-full ${course.accent}`} aria-hidden="true" />
            <h1 className="text-2xl font-bold text-royal sm:text-3xl">{course.title}</h1>
            {course.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{course.description}</p>
            )}
            {company && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                Trilha liberada por {company.companyName ?? "sua empresa"}: {company.title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isMaster && (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate({ to: "/academy/progresso" })}
                >
                  <ListChecks className="h-4 w-4" /> Progresso dos alunos
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    navigate({
                      to: "/academy/gerenciar/$courseSlug",
                      params: { courseSlug: course.slug },
                    })
                  }
                >
                  <Settings className="h-4 w-4" /> Gerenciar aulas
                </Button>
              </>
            )}
            <BackButton to="/academy" label="Voltar à Academy" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Player */}
          <div>
            <div className="overflow-hidden rounded-2xl border bg-navy" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="relative aspect-video w-full">
                {!current ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-navy-foreground/80">
                    <PlayCircle className="h-10 w-10" />
                    <p className="text-sm">As aulas desta trilha serão publicadas em breve.</p>
                  </div>
                ) : locked ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-navy-foreground">
                    <Lock className="h-9 w-9" />
                    <p className="max-w-sm text-sm">
                      {user
                        ? "As aulas em vídeo são liberadas pela sua empresa parceira ou pelo administrador."
                        : "Crie sua conta para assistir às aulas da Academy."}
                    </p>
                    {user ? (
                      <Button className="gap-2" onClick={() => setPlansOpen(true)}>
                        <Sparkles className="h-4 w-4" /> Saber como liberar
                      </Button>
                    ) : (
                      <Link to="/auth" search={{ mode: "signup" }}>
                        <Button className="gap-2">Criar minha conta</Button>
                      </Link>
                    )}
                  </div>
                ) : currentLessonLocked ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-navy-foreground">
                    <Lock className="h-9 w-9" />
                    <p className="max-w-sm text-sm">
                      Esta aula abre depois de concluir a aula anterior. Cada módulo é liberado após
                      concluir todas as aulas e o quiz do módulo anterior.
                    </p>
                  </div>
                ) : loadingVideo ? (
                  <div className="flex h-full items-center justify-center text-sm text-navy-foreground/80">
                    Carregando aula...
                  </div>
                ) : playback?.kind === "file" && playback.src ? (
                  <video
                    src={playback.src}
                    controls
                    controlsList="nodownload"
                    disablePictureInPicture
                    disableRemotePlayback
                    onContextMenu={(e) => e.preventDefault()}
                    onTimeUpdate={onTimeUpdate}
                    onPause={(e) => {
                      const el = e.currentTarget;
                      if (el.duration) {
                        saveProgress(
                          Math.round(el.currentTime),
                          Math.min(100, Math.round((el.currentTime / el.duration) * 100)),
                        );
                      }
                    }}
                    onEnded={() => {
                      saveProgress(0, 100);
                      openLessonQuiz();
                    }}
                    className="h-full w-full"
                  />
                ) : playback?.kind === "embed" && playback.src ? (
                  <iframe
                    src={toEmbedUrl(playback.src) ?? undefined}
                    title={current.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-center text-sm text-navy-foreground/80">
                    Vídeo ainda não disponível para esta aula.
                  </div>
                )}
              </div>
            </div>

            {current && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold">
                  {current.is_intro ? "Introdução" : `Aula ${current.position}`} — {current.title}
                </h2>
                {current.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>
                )}

                {user && !locked && !currentLessonLocked && (
                  <div className="mt-4 rounded-2xl border bg-card p-4">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>Progresso do vídeo</span>
                      <span>{currentState.percent}% assistido</span>
                    </div>
                    <Progress value={currentState.percent} className="mt-2 h-2" />

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {currentState.completed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          <CheckCircle2 className="h-4 w-4" /> Aula concluída
                        </span>
                      ) : null}
                      {playback?.kind === "embed" && !currentState.completed && (
                        <Button size="sm" variant="outline" onClick={() => saveProgress(0, 100)}>
                          Já assisti este vídeo
                        </Button>
                      )}
                      {current.has_summary && (
                        <Button size="sm" variant="outline" className="gap-2" onClick={downloadSummary}>
                          <FileDown className="h-4 w-4" /> Baixar resumo em PDF
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Módulos e aulas */}
          <aside className="flex flex-col gap-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Conteúdo da trilha
            </h2>
            {modules.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhuma aula publicada ainda.
              </div>
            ) : (
              modules.map((m: AcademyModuleMeta, mi: number) => {
                const unlocked = isModuleUnlocked(m.id, mi);
                const mq = moduleQuiz(m.id);
                const allLessonsDone =
                  m.lessons.length > 0 && m.lessons.every((l) => lessonState(l.id).completed);
                return (
                  <section key={m.id} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold">{m.title}</h3>
                        {m.description && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.description}</p>
                        )}
                      </div>
                      {!unlocked && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      {unlocked && progress?.completedModuleIds.includes(m.id) && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>

                    {!unlocked && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Conclua o módulo anterior para liberar este.
                      </p>
                    )}

                    <ul className="mt-3 flex flex-col gap-2">
                      {m.lessons.map((l, i) => {
                        const isCurrent = current?.id === l.id;
                        const st = lessonState(l.id);
                        const dur = formatDuration(l.duration_seconds);
                        const lessonOpen = unlocked && isLessonUnlocked(l.id, mi, i);
                        return (
                          <li key={l.id}>
                            <button
                              type="button"
                              disabled={!lessonOpen}
                              onClick={() => setCurrent(l)}
                              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                                isCurrent ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                              } ${lessonOpen ? "" : "cursor-not-allowed opacity-60"}`}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                                {l.is_intro ? "0" : i + (m.lessons[0]?.is_intro ? 0 : 1)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                  {l.is_intro ? "Introdução" : l.title}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {!lessonOpen
                                    ? "Conclua a aula anterior para liberar"
                                    : l.is_intro
                                      ? l.title
                                      : l.description ?? "Aula em vídeo"}
                                </span>
                                {user && lessonOpen && st.percent > 0 && !st.completed && (
                                  <Progress value={st.percent} className="mt-1.5 h-1" />
                                )}
                              </span>
                              {dur && (
                                <span className="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                                  {dur}
                                </span>
                              )}
                              {!lessonOpen ? (
                                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : st.completed ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                              ) : (
                                <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                              )}
                            </button>

                            {(() => {
                              const q = lessonQuiz(l.id);
                              if (!q || q.questionCount === 0) return null;
                              const canTakeQuiz = isMaster || st.completed || st.percent >= WATCHED_THRESHOLD;
                              return (
                                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2">
                                  <span className="text-xs text-muted-foreground">
                                    {q.passed
                                      ? "Quiz aprovado"
                                      : canTakeQuiz
                                        ? `Quiz · ${q.attemptsUsed}/${q.maxAttempts} tentativas`
                                        : "Assista a aula até o fim para liberar o quiz"}
                                  </span>
                                  {q.passed ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 gap-1.5 text-xs"
                                      disabled={!canTakeQuiz}
                                      onClick={() => openQuizForLesson(l.id)}
                                    >
                                      <ListChecks className="h-3.5 w-3.5" /> Fazer quiz
                                    </Button>
                                  )}
                                </div>
                              );
                            })()}
                          </li>
                        );
                      })}
                    </ul>

                    {unlocked && mq && mq.questionCount > 0 && (
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-dashed p-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium">Quiz final do módulo</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {mq.passed
                              ? "Aprovado"
                              : allLessonsDone
                                ? `${mq.questionCount} perguntas · ${mq.attemptsUsed}/${mq.maxAttempts} tentativas`
                                : "Conclua todas as aulas para liberar"}
                          </p>
                        </div>
                        {mq.passed ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!allLessonsDone}
                            onClick={() => {
                              setQuizTarget({ scope: "module", moduleId: m.id });
                              setQuizOpen(true);
                            }}
                          >
                            Fazer
                          </Button>
                        )}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </aside>
        </div>
      </main>

      <AcademyQuizDialog
        open={quizOpen}
        onOpenChange={setQuizOpen}
        target={quizTarget}
        contextTitle={course.title}
        onPassed={reloadProgress}
      />

      <PlansDialog
        open={plansOpen}
        onOpenChange={setPlansOpen}
        title="Como liberar as aulas"
        description="Fale com sua empresa parceira ou com o administrador da Connect-Academy."
      />
    </div>
  );
}
