import type { ErrorComponentProps } from "@tanstack/react-router";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Clock3, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isMasterEmail } from "@/lib/master-access";
import { formatDuration, formatTrackDuration } from "@/lib/video-embed";
import {
  createVideoUploadUrl,
  deleteAcademyLesson,
  deleteAcademyModule,
  getAcademyCourse,
  listLessonsForManage,
  listModulesForManage,
  upsertAcademyLesson,
  upsertAcademyModule,
} from "@/lib/academy.functions";
import { getQuizForManage, saveQuiz } from "@/lib/academy-progress.functions";

type ManagedLesson = {
  id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  position: number;
  is_intro: boolean;
  duration_seconds: number | null;
  source_type: string;
  video_url: string | null;
  video_path: string | null;
  is_published: boolean;
  summary: string | null;
  summary_references: string[];
  summary_images: { url: string; caption?: string }[];
};

type ManagedModule = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_published: boolean;
};

type QuestionDraft = { prompt: string; options: { label: string; isCorrect: boolean }[] };

export const Route = createFileRoute("/academy/gerenciar/$courseSlug")({
  loader: async ({ params }) => {
    const res = await getAcademyCourse({ data: { slug: params.courseSlug } });
    if (res.error) throw new Error(res.error);
    if (!res.course) throw notFound();
    return { course: res.course };
  },
  head: () => ({
    meta: [
      { title: "Gerenciar trilha — Connect-Academy" },
      { name: "description", content: "Painel de módulos, aulas, quizzes e resumos da Connect-Academy." },
      { property: "og:title", content: "Gerenciar trilha — Connect-Academy" },
      { property: "og:description", content: "Publique módulos, aulas em vídeo, quizzes e resumos em PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }: ErrorComponentProps) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-destructive">{(error instanceof Error ? error.message : String(error))}</p>
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">Trilha não encontrada.</main>
    </div>
  ),
  component: ManageCoursePage,
});

function ManageCoursePage() {
  const { course } = Route.useLoaderData();
  const { user, loading } = useAuth();
  const isMaster = isMasterEmail(user?.email);

  const listLessonsFn = useServerFn(listLessonsForManage);
  const listModulesFn = useServerFn(listModulesForManage);
  const upsertLessonFn = useServerFn(upsertAcademyLesson);
  const deleteLessonFn = useServerFn(deleteAcademyLesson);
  const upsertModuleFn = useServerFn(upsertAcademyModule);
  const deleteModuleFn = useServerFn(deleteAcademyModule);
  const uploadUrlFn = useServerFn(createVideoUploadUrl);
  const saveQuizFn = useServerFn(saveQuiz);
  const getQuizFn = useServerFn(getQuizForManage);

  const [lessons, setLessons] = useState<ManagedLesson[]>([]);
  const [modules, setModules] = useState<ManagedModule[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [moduleForm, setModuleForm] = useState({ id: "", title: "", description: "", position: 1 });

  const [form, setForm] = useState({
    id: "",
    moduleId: "",
    title: "",
    description: "",
    position: 1,
    isIntro: false,
    durationSeconds: null as number | null,
    sourceType: "url" as "url" | "upload",
    videoUrl: "",
    videoPath: "",
  });

  const [quizScope, setQuizScope] = useState<"lesson" | "module">("lesson");
  const [quizTargetId, setQuizTargetId] = useState("");
  const [quizTitle, setQuizTitle] = useState("Quiz da aula");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  const [summaryLessonId, setSummaryLessonId] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [summaryRefs, setSummaryRefs] = useState("");
  const [summaryImages, setSummaryImages] = useState("");

  const reload = useCallback(() => {
    listLessonsFn({ data: { courseId: course.id } })
      .then((r) => {
        if (r.error) toast.error(r.error);
        else setLessons((r.items ?? []) as ManagedLesson[]);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar aulas"));
    listModulesFn({ data: { courseId: course.id } })
      .then((r) => setModules((r.items ?? []) as ManagedModule[]))
      .catch(() => undefined);
  }, [listLessonsFn, listModulesFn, course.id]);

  useEffect(() => {
    if (isMaster) reload();
  }, [isMaster, reload]);

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

  if (!isMaster) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-xl font-bold">Área restrita</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este painel está disponível apenas para a conta administradora.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/academy/$courseSlug" params={{ courseSlug: course.slug }}>
              <Button>Ver a trilha</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const resetForm = () =>
    setForm({
      id: "",
      moduleId: modules[0]?.id ?? "",
      title: "",
      description: "",
      position: lessons.length + 1,
      isIntro: false,
      durationSeconds: null,
      sourceType: "url",
      videoUrl: "",
      videoPath: "",
    });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const durationSeconds = await new Promise<number | null>((resolve) => {
        const video = document.createElement("video");
        const objectUrl = URL.createObjectURL(file);
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
          URL.revokeObjectURL(objectUrl);
          resolve(duration);
        };
        video.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        video.src = objectUrl;
      });
      const prep = await uploadUrlFn({ data: { courseId: course.id, fileName: file.name } });
      if (prep.error || !prep.path || !prep.token) throw new Error(prep.error ?? "Falha ao preparar envio");
      const { error } = await supabase.storage
        .from("academy-videos")
        .uploadToSignedUrl(prep.path, prep.token, file);
      if (error) throw error;
      setForm((f) => ({
        ...f,
        sourceType: "upload",
        videoPath: prep.path ?? "",
        videoUrl: "",
        durationSeconds,
      }));
      toast.success("Vídeo enviado. Agora salve a aula.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no envio do vídeo");
    } finally {
      setUploading(false);
    }
  };

  const saveLesson = async () => {
    if (!form.title.trim()) {
      toast.error("Informe o título da aula.");
      return;
    }
    if (form.sourceType === "url" && !form.videoUrl.trim()) {
      toast.error("Cole o link do vídeo (YouTube ou Vimeo).");
      return;
    }
    if (form.sourceType === "upload" && !form.videoPath) {
      toast.error("Envie o arquivo de vídeo.");
      return;
    }
    setBusy(true);
    try {
      const res = await upsertLessonFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          courseId: course.id,
          moduleId: form.moduleId || null,
          title: form.title.trim(),
          description: form.description.trim() || null,
          position: Number(form.position) || 0,
          isIntro: form.isIntro,
          durationSeconds: form.durationSeconds,
          sourceType: form.sourceType,
          videoUrl: form.sourceType === "url" ? form.videoUrl.trim() : null,
          videoPath: form.sourceType === "upload" ? form.videoPath : null,
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Erro ao salvar");
      toast.success(form.id ? "Aula atualizada." : "Aula publicada.");
      resetForm();
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar aula");
    } finally {
      setBusy(false);
    }
  };

  const editLesson = (l: ManagedLesson) =>
    setForm({
      id: l.id,
      moduleId: l.module_id ?? "",
      title: l.title,
      description: l.description ?? "",
      position: l.position,
      isIntro: l.is_intro,
      durationSeconds: l.duration_seconds,
      sourceType: l.source_type === "upload" ? "upload" : "url",
      videoUrl: l.video_url ?? "",
      videoPath: l.video_path ?? "",
    });

  const removeLesson = async (id: string) => {
    setBusy(true);
    try {
      const res = await deleteLessonFn({ data: { id } });
      if (!res.ok) throw new Error(res.error ?? "Erro ao remover");
      toast.success("Aula removida.");
      if (form.id === id) resetForm();
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover aula");
    } finally {
      setBusy(false);
    }
  };

  const saveModule = async () => {
    if (!moduleForm.title.trim()) {
      toast.error("Informe o título do módulo.");
      return;
    }
    setBusy(true);
    try {
      const res = await upsertModuleFn({
        data: {
          ...(moduleForm.id ? { id: moduleForm.id } : {}),
          courseId: course.id,
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim() || null,
          position: Number(moduleForm.position) || 1,
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Erro ao salvar módulo");
      toast.success(moduleForm.id ? "Módulo atualizado." : "Módulo criado.");
      setModuleForm({ id: "", title: "", description: "", position: modules.length + 2 });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar módulo");
    } finally {
      setBusy(false);
    }
  };

  const removeModule = async (id: string) => {
    setBusy(true);
    try {
      const res = await deleteModuleFn({ data: { id } });
      if (!res.ok) throw new Error(res.error ?? "Erro ao remover módulo");
      toast.success("Módulo removido.");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover módulo");
    } finally {
      setBusy(false);
    }
  };

  const loadQuiz = async (scope: "lesson" | "module", targetId: string) => {
    if (!targetId) return;
    try {
      const res = await getQuizFn({
        data: {
          scope,
          lessonId: scope === "lesson" ? targetId : null,
          moduleId: scope === "module" ? targetId : null,
        },
      });
      if (res.quiz) {
        setQuizTitle(res.quiz.title);
        setQuestions(res.quiz.questions);
      } else {
        setQuizTitle(scope === "lesson" ? "Quiz da aula" : "Quiz final do módulo");
        setQuestions([]);
      }
    } catch {
      setQuestions([]);
    }
  };

  const persistQuiz = async () => {
    if (!quizTargetId) {
      toast.error("Escolha a aula ou o módulo do quiz.");
      return;
    }
    if (questions.length === 0) {
      toast.error("Adicione ao menos uma pergunta.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveQuizFn({
        data: {
          scope: quizScope,
          lessonId: quizScope === "lesson" ? quizTargetId : null,
          moduleId: quizScope === "module" ? quizTargetId : null,
          title: quizTitle.trim() || "Quiz",
          maxAttempts: 3,
          questions: questions.map((q) => ({
            prompt: q.prompt.trim(),
            options: q.options.map((o) => ({ label: o.label.trim(), isCorrect: o.isCorrect })),
          })),
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Erro ao salvar quiz");
      toast.success("Quiz salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar quiz");
    } finally {
      setBusy(false);
    }
  };

  const loadSummary = (lessonId: string) => {
    setSummaryLessonId(lessonId);
    const l = lessons.find((x) => x.id === lessonId);
    setSummaryText(l?.summary ?? "");
    setSummaryRefs((l?.summary_references ?? []).join("\n"));
    setSummaryImages((l?.summary_images ?? []).map((i) => i.url).join("\n"));
  };

  const persistSummary = async () => {
    const l = lessons.find((x) => x.id === summaryLessonId);
    if (!l) {
      toast.error("Escolha a aula.");
      return;
    }
    setBusy(true);
    try {
      const res = await upsertLessonFn({
        data: {
          id: l.id,
          courseId: course.id,
          moduleId: l.module_id,
          title: l.title,
          description: l.description,
          position: l.position,
          isIntro: l.is_intro,
          durationSeconds: l.duration_seconds,
          sourceType: l.source_type === "upload" ? "upload" : "url",
          videoUrl: l.video_url,
          videoPath: l.video_path,
          summary: summaryText.trim() || null,
          references: summaryRefs
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          images: summaryImages
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((url) => ({ url })),
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Erro ao salvar resumo");
      toast.success("Resumo salvo. Os alunos já podem baixar o PDF.");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar resumo");
    } finally {
      setBusy(false);
    }
  };

  const totalDuration = formatTrackDuration(
    lessons.reduce((total, lesson) => total + (lesson.duration_seconds ?? 0), 0),
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royal">Gerenciar trilha</h1>
            <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
            {totalDuration && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Clock3 className="h-4 w-4" /> Duração total da trilha: {totalDuration}
              </p>
            )}
          </div>
          <BackButton to="/academy" label="Voltar à Academy" />
        </div>

        <Tabs defaultValue="aulas">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="modulos">Módulos</TabsTrigger>
            <TabsTrigger value="aulas">Aulas</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="resumo">Resumo em PDF</TabsTrigger>
          </TabsList>

          {/* Módulos */}
          <TabsContent value="modulos">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border bg-card p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {moduleForm.id ? "Editar módulo" : "Novo módulo"}
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="mtitle">Título</Label>
                    <Input
                      id="mtitle"
                      value={moduleForm.title}
                      onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ex.: Módulo 1 — Fundamentos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mdesc">Descrição</Label>
                    <Textarea
                      id="mdesc"
                      rows={2}
                      value={moduleForm.description}
                      onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mpos">Ordem</Label>
                    <Input
                      id="mpos"
                      type="number"
                      min={1}
                      value={moduleForm.position}
                      onChange={(e) => setModuleForm((f) => ({ ...f, position: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveModule} disabled={busy} className="gap-2">
                      <Plus className="h-4 w-4" /> {moduleForm.id ? "Salvar" : "Criar módulo"}
                    </Button>
                    {moduleForm.id && (
                      <Button
                        variant="outline"
                        onClick={() => setModuleForm({ id: "", title: "", description: "", position: modules.length + 1 })}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Módulos ({modules.length})
                </h2>
                <ul className="flex flex-col gap-2">
                  {modules.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {m.position}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lessons.filter((l) => l.module_id === m.id).length} aula(s)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setModuleForm({
                            id: m.id,
                            title: m.title,
                            description: m.description ?? "",
                            position: m.position,
                          })
                        }
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover módulo"
                        onClick={() => removeModule(m.id)}
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </TabsContent>

          {/* Aulas */}
          <TabsContent value="aulas">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
              <section className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {form.id ? "Editar aula" : "Nova aula"}
                </h2>

                <div className="flex flex-col gap-4">
                  <div>
                    <Label>Módulo</Label>
                    <Select
                      value={form.moduleId}
                      onValueChange={(v) => setForm((f) => ({ ...f, moduleId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ex.: Boas-vindas à trilha"
                    />
                  </div>

                  <div>
                    <Label htmlFor="desc">Descrição</Label>
                    <Textarea
                      id="desc"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pos">Ordem</Label>
                    <Input
                      id="pos"
                      type="number"
                      min={0}
                      value={form.position}
                      onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Aula de introdução</p>
                      <p className="text-xs text-muted-foreground">Aparece em destaque no topo da lista.</p>
                    </div>
                    <Switch
                      checked={form.isIntro}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, isIntro: v }))}
                    />
                  </div>

                  <div>
                    <Label>Origem do vídeo</Label>
                    <Select
                      value={form.sourceType}
                      onValueChange={(v) => setForm((f) => ({ ...f, sourceType: v as "url" | "upload" }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="url">Link do YouTube ou Vimeo</SelectItem>
                        <SelectItem value="upload">Enviar arquivo de vídeo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.sourceType === "url" ? (
                    <div>
                      <Label htmlFor="url">Link do vídeo</Label>
                      <Input
                        id="url"
                        value={form.videoUrl}
                        onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="file">Arquivo de vídeo</Label>
                      <Input
                        id="file"
                        type="file"
                        accept="video/*"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(file);
                        }}
                      />
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        {uploading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Enviando vídeo...
                          </>
                        ) : form.videoPath ? (
                          <>
                            <Upload className="h-3 w-3" /> Vídeo pronto para salvar
                            {formatDuration(form.durationSeconds)
                              ? ` · duração detectada: ${formatDuration(form.durationSeconds)}`
                              : ""}
                          </>
                        ) : (
                          "Até 500 MB por arquivo."
                        )}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={saveLesson} disabled={busy || uploading} className="gap-2">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {form.id ? "Salvar alterações" : "Publicar aula"}
                    </Button>
                    {form.id && (
                      <Button variant="outline" onClick={resetForm} disabled={busy}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Aulas cadastradas ({lessons.length})
                </h2>
                {lessons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Nenhuma aula cadastrada nesta trilha.
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {[
                      ...modules.map((m) => ({ id: m.id as string | null, title: m.title })),
                      { id: null as string | null, title: "Sem módulo" },
                    ]
                      .map((group) => ({
                        ...group,
                        items: lessons
                          .filter((l) => (l.module_id ?? null) === group.id)
                          .slice()
                          .sort(
                            (a, b) =>
                              Number(b.is_intro) - Number(a.is_intro) || a.position - b.position,
                          ),
                      }))
                      .filter((group) => group.items.length > 0)
                      .map((group) => (
                        <div key={group.id ?? "sem-modulo"}>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-royal">{group.title}</h3>
                            <span className="text-xs text-muted-foreground">
                              {group.items.length} aula{group.items.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <ul className="flex flex-col gap-2">
                            {group.items.map((l) => (
                              <li key={l.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                                  {l.is_intro ? "0" : l.position}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {l.title}{" "}
                                    {l.is_intro && <span className="text-xs text-primary">(introdução)</span>}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {l.source_type === "upload" ? "Arquivo enviado" : "Link externo"}
                                    {formatDuration(l.duration_seconds)
                                      ? ` · ${formatDuration(l.duration_seconds)}`
                                      : ""}
                                  </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => editLesson(l)} disabled={busy}>
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Remover aula"
                                  onClick={() => removeLesson(l.id)}
                                  disabled={busy}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </div>
          </TabsContent>

          {/* Quizzes */}
          <TabsContent value="quizzes">
            <section className="rounded-2xl border bg-card p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Tipo de quiz</Label>
                  <Select
                    value={quizScope}
                    onValueChange={(v) => {
                      setQuizScope(v as "lesson" | "module");
                      setQuizTargetId("");
                      setQuestions([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lesson">Curto, por aula</SelectItem>
                      <SelectItem value="module">Final, por módulo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{quizScope === "lesson" ? "Aula" : "Módulo"}</Label>
                  <Select
                    value={quizTargetId}
                    onValueChange={(v) => {
                      setQuizTargetId(v);
                      void loadQuiz(quizScope, v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {(quizScope === "lesson" ? lessons : modules).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="qtitle">Título do quiz</Label>
                  <Input id="qtitle" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                O aluno precisa acertar todas as perguntas e tem até 3 tentativas. Marque a alternativa correta
                em cada pergunta.
              </p>

              <div className="mt-5 flex flex-col gap-4">
                {questions.map((q, qi) => (
                  <div key={qi} className="rounded-xl border p-4">
                    <div className="flex items-start gap-2">
                      <Textarea
                        rows={2}
                        value={q.prompt}
                        placeholder={`Pergunta ${qi + 1}`}
                        onChange={(e) =>
                          setQuestions((list) =>
                            list.map((item, i) => (i === qi ? { ...item, prompt: e.target.value } : item)),
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover pergunta"
                        onClick={() => setQuestions((list) => list.filter((_, i) => i !== qi))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {q.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={o.isCorrect}
                            aria-label={`Alternativa correta ${oi + 1}`}
                            onChange={() =>
                              setQuestions((list) =>
                                list.map((item, i) =>
                                  i === qi
                                    ? {
                                        ...item,
                                        options: item.options.map((opt, j) => ({
                                          ...opt,
                                          isCorrect: j === oi,
                                        })),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                          <Input
                            value={o.label}
                            placeholder={`Alternativa ${oi + 1}`}
                            onChange={(e) =>
                              setQuestions((list) =>
                                list.map((item, i) =>
                                  i === qi
                                    ? {
                                        ...item,
                                        options: item.options.map((opt, j) =>
                                          j === oi ? { ...opt, label: e.target.value } : opt,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    setQuestions((list) => [
                      ...list,
                      {
                        prompt: "",
                        options: [
                          { label: "", isCorrect: true },
                          { label: "", isCorrect: false },
                          { label: "", isCorrect: false },
                          { label: "", isCorrect: false },
                        ],
                      },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" /> Adicionar pergunta
                </Button>
                <Button onClick={persistQuiz} disabled={busy} className="gap-2">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar quiz
                </Button>
              </div>
            </section>
          </TabsContent>

          {/* Resumo em PDF */}
          <TabsContent value="resumo">
            <section className="rounded-2xl border bg-card p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Aula</Label>
                  <Select value={summaryLessonId} onValueChange={loadSummary}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar aula" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <Label htmlFor="sum">Resumo em linguagem acessível</Label>
                  <Textarea
                    id="sum"
                    rows={10}
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    placeholder="Texto que será impresso no PDF, com a logo da Academy."
                  />
                </div>
                <div>
                  <Label htmlFor="imgs">Imagens e organogramas (um link por linha)</Label>
                  <Textarea
                    id="imgs"
                    rows={3}
                    value={summaryImages}
                    onChange={(e) => setSummaryImages(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="refs">Referências bibliográficas (uma por linha)</Label>
                  <Textarea
                    id="refs"
                    rows={4}
                    value={summaryRefs}
                    onChange={(e) => setSummaryRefs(e.target.value)}
                  />
                </div>
                <Button onClick={persistSummary} disabled={busy || !summaryLessonId} className="gap-2 self-start">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar resumo
                </Button>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
