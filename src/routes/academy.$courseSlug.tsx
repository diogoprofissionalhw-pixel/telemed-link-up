import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lock, PlayCircle, Settings, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { PlansDialog } from "@/components/plans-dialog";
import { useAuth } from "@/lib/auth-context";
import { isMasterEmail } from "@/lib/master-access";
import { toEmbedUrl, formatDuration } from "@/lib/video-embed";
import {
  getAcademyAccess,
  getAcademyCourse,
  getLessonPlayback,
  type AcademyLessonMeta,
} from "@/lib/academy.functions";

export const Route = createFileRoute("/academy/$courseSlug")({
  loader: async ({ params }) => {
    const res = await getAcademyCourse({ data: { slug: params.courseSlug } });
    if (res.error) throw new Error(res.error);
    if (!res.course) throw notFound();
    return { course: res.course, lessons: res.lessons };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.course
      ? `${loaderData.course.title} — Connect-Academy`
      : "Trilha — Connect-Academy";
    const description =
      loaderData?.course?.description ??
      "Assista às aulas em vídeo da trilha na Connect-Academy.";
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
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-destructive">Erro ao carregar a trilha: {error.message}</p>
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

function CoursePage() {
  const { course, lessons } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchAccess = useServerFn(getAcademyAccess);
  const fetchPlayback = useServerFn(getLessonPlayback);

  const [current, setCurrent] = useState<AcademyLessonMeta | null>(lessons[0] ?? null);
  const [access, setAccess] = useState<{ canWatch: boolean; isMaster: boolean }>({
    canWatch: false,
    isMaster: false,
  });
  const [playback, setPlayback] = useState<{ kind: string | null; src: string | null } | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setAccess({ canWatch: false, isMaster: false });
      return;
    }
    fetchAccess({ data: undefined as never })
      .then((r) => setAccess({ canWatch: r.canWatch, isMaster: r.isMaster }))
      .catch(() => setAccess({ canWatch: false, isMaster: false }));
  }, [user, fetchAccess]);

  useEffect(() => {
    if (!current || !access.canWatch) {
      setPlayback(null);
      return;
    }
    setLoadingVideo(true);
    fetchPlayback({ data: { lessonId: current.id } })
      .then((r) => setPlayback({ kind: r.kind, src: r.src }))
      .catch(() => setPlayback(null))
      .finally(() => setLoadingVideo(false));
  }, [current, access.canWatch, fetchPlayback]);

  const locked = !access.canWatch;

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
          </div>
          <div className="flex items-center gap-2">
            {access.isMaster && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  navigate({
                    to: "/academy/$courseSlug/gerenciar",
                    params: { courseSlug: course.slug },
                  })
                }
              >
                <Settings className="h-4 w-4" /> Gerenciar aulas
              </Button>
            )}
            <BackButton to="/academy" label="Voltar à Academy" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
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
                        ? "As aulas em vídeo fazem parte do plano Pro."
                        : "Crie sua conta e assine o plano Pro para assistir às aulas."}
                    </p>
                    {user ? (
                      <Button className="gap-2" onClick={() => setPlansOpen(true)}>
                        <Sparkles className="h-4 w-4" /> Ver planos
                      </Button>
                    ) : (
                      <Link to="/auth" search={{ mode: "signup" }}>
                        <Button className="gap-2">Criar minha conta</Button>
                      </Link>
                    )}
                  </div>
                ) : loadingVideo ? (
                  <div className="flex h-full items-center justify-center text-sm text-navy-foreground/80">
                    Carregando aula...
                  </div>
                ) : playback?.kind === "file" && playback.src ? (
                  <video src={playback.src} controls className="h-full w-full" />
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
              </div>
            )}
          </div>

          {/* Lista de aulas */}
          <aside>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Aulas da trilha
            </h2>
            {lessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhuma aula publicada ainda.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {lessons.map((l, i) => {
                  const isCurrent = current?.id === l.id;
                  const dur = formatDuration(l.duration_seconds);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setCurrent(l)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          isCurrent ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {l.is_intro ? "0" : i + (lessons[0]?.is_intro ? 0 : 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {l.is_intro ? "Introdução" : l.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {l.is_intro ? l.title : dur ? dur : "Aula em vídeo"}
                          </span>
                        </span>
                        {locked ? (
                          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      </main>

      <PlansDialog
        open={plansOpen}
        onOpenChange={setPlansOpen}
        title="Aulas em vídeo no plano Pro"
        description="Assine o plano Pro para assistir a todas as aulas das trilhas da Connect-Academy."
      />
    </div>
  );
}
