import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMasterEmail } from "@/lib/master-access";

// Connect-Academy: cursos (trilhas) e aulas em vídeo.
// Leitura pública: apenas metadados (nunca a URL/caminho do vídeo).
// Reprodução: exige conta + plano Pro (ou conta mestre).
// Escrita: apenas a conta mestre.

export type AcademyCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  accent: string;
  position: number;
};

export type AcademyLessonMeta = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_intro: boolean;
  duration_seconds: number | null;
};

export const listAcademyCourses = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("academy_courses")
    .select("id, slug, title, description, accent, position")
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (error) return { items: [] as AcademyCourse[], error: error.message };
  return { items: (data ?? []) as AcademyCourse[], error: null };
});

export const getAcademyCourse = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().trim().min(1).max(160) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: course, error } = await supabaseAdmin
      .from("academy_courses")
      .select("id, slug, title, description, accent, position")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) return { course: null, lessons: [] as AcademyLessonMeta[], error: error.message };
    if (!course) return { course: null, lessons: [] as AcademyLessonMeta[], error: null };

    const { data: lessons, error: lErr } = await supabaseAdmin
      .from("academy_lessons")
      .select("id, title, description, position, is_intro, duration_seconds")
      .eq("course_id", course.id)
      .eq("is_published", true)
      .order("is_intro", { ascending: false })
      .order("position", { ascending: true });

    if (lErr) return { course: course as AcademyCourse, lessons: [] as AcademyLessonMeta[], error: lErr.message };

    return {
      course: course as AcademyCourse,
      lessons: (lessons ?? []) as AcademyLessonMeta[],
      error: null,
    };
  });

async function hasProAccess(context: {
  supabase: { from: (t: "doctors") => any };
  userId: string;
  claims: Record<string, unknown>;
}) {
  if (isMasterEmail(context.claims["email"] as string | undefined)) return true;
  const { data } = await context.supabase
    .from("doctors")
    .select("is_premium")
    .eq("id", context.userId)
    .maybeSingle();
  return Boolean(data?.is_premium);
}

function requireMaster(claims: Record<string, unknown>) {
  if (!isMasterEmail(claims["email"] as string | undefined)) {
    throw new Error("Acesso restrito à conta administradora.");
  }
}

/** Retorna o link tocável da aula, ou locked quando o usuário não tem plano Pro. */
export const getLessonPlayback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ lessonId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const allowed = await hasProAccess(context as never);
    if (!allowed) return { locked: true as const, kind: null, src: null };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lesson, error } = await supabaseAdmin
      .from("academy_lessons")
      .select("source_type, video_url, video_path")
      .eq("id", data.lessonId)
      .maybeSingle();

    if (error || !lesson) return { locked: false as const, kind: null, src: null };

    if (lesson.source_type === "upload" && lesson.video_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("academy-videos")
        .createSignedUrl(lesson.video_path, 60 * 60);
      return { locked: false as const, kind: "file" as const, src: signed?.signedUrl ?? null };
    }

    return { locked: false as const, kind: "embed" as const, src: lesson.video_url ?? null };
  });

/** Informa se o usuário logado pode assistir e se é a conta administradora. */
export const getAcademyAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({
    canWatch: await hasProAccess(context as never),
    isMaster: isMasterEmail((context.claims as Record<string, unknown>)["email"] as string | undefined),
  }));

const LessonInput = z.object({
  id: z.string().uuid().optional(),
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  position: z.number().int().min(0).max(999),
  isIntro: z.boolean(),
  durationSeconds: z.number().int().min(0).max(100000).optional().nullable(),
  sourceType: z.enum(["url", "upload"]),
  videoUrl: z.string().trim().max(500).optional().nullable(),
  videoPath: z.string().trim().max(500).optional().nullable(),
  isPublished: z.boolean().optional(),
});

export const upsertAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => LessonInput.parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      course_id: data.courseId,
      title: data.title,
      description: data.description ?? null,
      position: data.position,
      is_intro: data.isIntro,
      duration_seconds: data.durationSeconds ?? null,
      source_type: data.sourceType,
      video_url: data.sourceType === "url" ? (data.videoUrl ?? null) : null,
      video_path: data.sourceType === "upload" ? (data.videoPath ?? null) : null,
      is_published: data.isPublished ?? true,
    };

    const q = data.id
      ? supabaseAdmin.from("academy_lessons").update(row).eq("id", data.id)
      : supabaseAdmin.from("academy_lessons").insert(row);

    const { error } = await q;
    if (error) return { ok: false, error: error.message };

    if (data.isIntro) {
      await supabaseAdmin
        .from("academy_lessons")
        .update({ is_intro: false })
        .eq("course_id", data.courseId)
        .neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    return { ok: true, error: null };
  });

export const deleteAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: lesson } = await supabaseAdmin
      .from("academy_lessons")
      .select("video_path")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("academy_lessons").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };

    if (lesson?.video_path) {
      await supabaseAdmin.storage.from("academy-videos").remove([lesson.video_path]);
    }
    return { ok: true, error: null };
  });

/** Lista completa das aulas (inclusive não publicadas) para o painel da conta mestre. */
export const listLessonsForManage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("academy_lessons")
      .select("id, title, description, position, is_intro, duration_seconds, source_type, video_url, video_path, is_published")
      .eq("course_id", data.courseId)
      .order("position", { ascending: true });
    if (error) return { items: [], error: error.message };
    return { items: rows ?? [], error: null };
  });

/** Gera uma URL assinada para envio do arquivo de vídeo direto do navegador. */
export const createVideoUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ courseId: z.string().uuid(), fileName: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const safe = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const path = `${data.courseId}/${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("academy-videos")
      .createSignedUploadUrl(path);

    if (error || !signed) return { path: null, token: null, error: error?.message ?? "Falha ao preparar envio" };
    return { path, token: signed.token, error: null };
  });
