import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { formatDuration } from "@/lib/video-embed";
import {
  createVideoUploadUrl,
  deleteAcademyLesson,
  getAcademyCourse,
  listLessonsForManage,
  upsertAcademyLesson,
} from "@/lib/academy.functions";

type ManagedLesson = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_intro: boolean;
  duration_seconds: number | null;
  source_type: string;
  video_url: string | null;
  video_path: string | null;
  is_published: boolean;
};

export const Route = createFileRoute("/academy/gerenciar/$courseSlug")({
  loader: async ({ params }) => {
    const res = await getAcademyCourse({ data: { slug: params.courseSlug } });
    if (res.error) throw new Error(res.error);
    if (!res.course) throw notFound();
    return { course: res.course };
  },
  head: () => ({
    meta: [
      { title: "Gerenciar aulas — Connect-Academy" },
      { name: "description", content: "Painel de publicação das aulas em vídeo da Connect-Academy." },
      { property: "og:title", content: "Gerenciar aulas — Connect-Academy" },
      { property: "og:description", content: "Publique e organize as aulas em vídeo das trilhas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-destructive">{error.message}</p>
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">Trilha não encontrada.</main>
    </div>
  ),
  component: ManageLessonsPage,
});

function ManageLessonsPage() {
  const { course } = Route.useLoaderData();
  const { user, loading } = useAuth();
  const isMaster = isMasterEmail(user?.email);

  const listFn = useServerFn(listLessonsForManage);
  const upsertFn = useServerFn(upsertAcademyLesson);
  const deleteFn = useServerFn(deleteAcademyLesson);
  const uploadUrlFn = useServerFn(createVideoUploadUrl);

  const [lessons, setLessons] = useState<ManagedLesson[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    id: "" as string,
    title: "",
    description: "",
    position: 1,
    isIntro: false,
    durationMinutes: "",
    sourceType: "url" as "url" | "upload",
    videoUrl: "",
    videoPath: "",
  });

  const reload = () => {
    listFn({ data: { courseId: course.id } })
      .then((r) => {
        if (r.error) toast.error(r.error);
        else setLessons((r.items ?? []) as ManagedLesson[]);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar aulas"));
  };

  useEffect(() => {
    if (isMaster) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaster, course.id]);

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
      title: "",
      description: "",
      position: lessons.length + 1,
      isIntro: false,
      durationMinutes: "",
      sourceType: "url",
      videoUrl: "",
      videoPath: "",
    });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const prep = await uploadUrlFn({ data: { courseId: course.id, fileName: file.name } });
      if (prep.error || !prep.path || !prep.token) throw new Error(prep.error ?? "Falha ao preparar envio");
      const { error } = await supabase.storage
        .from("academy-videos")
        .uploadToSignedUrl(prep.path, prep.token, file);
      if (error) throw error;
      setForm((f) => ({ ...f, sourceType: "upload", videoPath: prep.path!, videoUrl: "" }));
      toast.success("Vídeo enviado. Agora salve a aula.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no envio do vídeo");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
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
      const minutes = Number(form.durationMinutes);
      const res = await upsertFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          courseId: course.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          position: Number(form.position) || 0,
          isIntro: form.isIntro,
          durationSeconds: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : null,
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

  const edit = (l: ManagedLesson) =>
    setForm({
      id: l.id,
      title: l.title,
      description: l.description ?? "",
      position: l.position,
      isIntro: l.is_intro,
      durationMinutes: l.duration_seconds ? String(Math.round(l.duration_seconds / 60)) : "",
      sourceType: l.source_type === "upload" ? "upload" : "url",
      videoUrl: l.video_url ?? "",
      videoPath: l.video_path ?? "",
    });

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const res = await deleteFn({ data: { id } });
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

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-royal">Gerenciar aulas</h1>
            <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
          </div>
          <BackButton to="/academy" label="Voltar à Academy" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Formulário */}
          <section className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {form.id ? "Editar aula" : "Nova aula"}
            </h2>

            <div className="flex flex-col gap-4">
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

              <div className="grid gap-4 sm:grid-cols-2">
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
                <div>
                  <Label htmlFor="dur">Duração (minutos)</Label>
                  <Input
                    id="dur"
                    type="number"
                    min={0}
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                  />
                </div>
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
                        <Upload className="h-3 w-3" /> Vídeo pronto para salvar.
                      </>
                    ) : (
                      "Até 500 MB por arquivo."
                    )}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={save} disabled={busy || uploading} className="gap-2">
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

          {/* Lista */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Aulas cadastradas ({lessons.length})
            </h2>
            {lessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhuma aula cadastrada nesta trilha.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {lessons.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {l.is_intro ? "0" : l.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {l.title} {l.is_intro && <span className="text-xs text-primary">(introdução)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.source_type === "upload" ? "Arquivo enviado" : "Link externo"}
                        {formatDuration(l.duration_seconds) ? ` · ${formatDuration(l.duration_seconds)}` : ""}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => edit(l)} disabled={busy}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover aula"
                      onClick={() => remove(l.id)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
