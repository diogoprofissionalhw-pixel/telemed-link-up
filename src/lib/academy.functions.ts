import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMasterEmail } from "@/lib/master-access";

// Connect-Academy: trilhas > módulos > aulas em vídeo.
// Leitura pública: apenas metadados (nunca a URL/caminho do vídeo).
// Reprodução: exige conta + plano Pro (ou conta mestre).
// Escrita: apenas a conta mestre.
//
// Backlog (próxima etapa): certificado de conclusão do curso e benefícios
// exclusivos para alunos pagantes — não implementados neste MVP.

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
  module_id: string | null;
  title: string;
  description: string | null;
  position: number;
  is_intro: boolean;
  duration_seconds: number | null;
  has_summary: boolean;
};

export type AcademyModuleMeta = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: AcademyLessonMeta[];
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

/** Trilha com os módulos e as aulas publicadas (somente metadados). */
export const getAcademyCourse = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().trim().min(1).max(160) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const empty = { course: null, modules: [] as AcademyModuleMeta[], lessons: [] as AcademyLessonMeta[] };

    const { data: course, error } = await supabaseAdmin
      .from("academy_courses")
      .select("id, slug, title, description, accent, position")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) return { ...empty, error: error.message };
    if (!course) return { ...empty, error: null };

    const [{ data: modules }, { data: lessons, error: lErr }] = await Promise.all([
      supabaseAdmin
        .from("academy_modules")
        .select("id, title, description, position")
        .eq("course_id", course.id)
        .eq("is_published", true)
        .order("position", { ascending: true }),
      supabaseAdmin
        .from("academy_lessons")
        .select("id, module_id, title, description, position, is_intro, duration_seconds, summary")
        .eq("course_id", course.id)
        .eq("is_published", true)
        .order("is_intro", { ascending: false })
        .order("position", { ascending: true }),
    ]);

    if (lErr) return { ...empty, course: course as AcademyCourse, error: lErr.message };

    const allLessons: AcademyLessonMeta[] = (lessons ?? []).map((l) => ({
      id: l.id,
      module_id: l.module_id,
      title: l.title,
      description: l.description,
      position: l.position,
      is_intro: l.is_intro,
      duration_seconds: l.duration_seconds,
      has_summary: Boolean(l.summary && l.summary.trim().length > 0),
    }));

    const grouped: AcademyModuleMeta[] = (modules ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      position: m.position,
      lessons: allLessons.filter((l) => l.module_id === m.id),
    }));

    const orphans = allLessons.filter((l) => !grouped.some((m) => m.id === l.module_id));
    if (orphans.length > 0) {
      grouped.push({
        id: "sem-modulo",
        title: "Outras aulas",
        description: null,
        position: 999,
        lessons: orphans,
      });
    }

    return {
      course: course as AcademyCourse,
      modules: grouped,
      lessons: allLessons,
      error: null,
    };
  });

// Acesso à Academy: basta estar autenticado (login).
async function hasProAccess(_context: {
  supabase: { from: (t: "doctors") => any };
  userId: string;
  claims: Record<string, unknown>;
}) {
  return true;
}

function requireMaster(claims: Record<string, unknown>) {
  if (!isMasterEmail(claims["email"] as string | undefined)) {
    throw new Error("Acesso restrito à conta administradora.");
  }
}

/** Retorna o link tocável da aula, ou locked quando o usuário não tem acesso. */
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

/** Conteúdo do resumo em PDF de uma aula (exige acesso). */
export const getLessonSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ lessonId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const allowed = await hasProAccess(context as never);
    if (!allowed) return { locked: true as const, summary: null, references: [], images: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lesson } = await supabaseAdmin
      .from("academy_lessons")
      .select("title, summary, summary_references, summary_images")
      .eq("id", data.lessonId)
      .maybeSingle();

    return {
      locked: false as const,
      title: lesson?.title ?? "",
      summary: lesson?.summary ?? null,
      references: (lesson?.summary_references ?? []) as string[],
      images: (lesson?.summary_images ?? []) as { url: string; caption?: string }[],
    };
  });

/* ------------------------------------------------------------------ */
/* Painel da conta mestre: módulos, aulas e resumos                    */
/* ------------------------------------------------------------------ */

const ModuleInput = z.object({
  id: z.string().uuid().optional(),
  courseId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  position: z.number().int().min(0).max(999),
  isPublished: z.boolean().optional(),
});

export const upsertAcademyModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ModuleInput.parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      course_id: data.courseId,
      title: data.title,
      description: data.description ?? null,
      position: data.position,
      is_published: data.isPublished ?? true,
    };

    const { error } = data.id
      ? await supabaseAdmin.from("academy_modules").update(row).eq("id", data.id)
      : await supabaseAdmin.from("academy_modules").insert(row);

    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

export const deleteAcademyModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("academy_modules").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

export const listModulesForManage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("academy_modules")
      .select("id, title, description, position, is_published")
      .eq("course_id", data.courseId)
      .order("position", { ascending: true });
    if (error) return { items: [], error: error.message };
    return { items: rows ?? [], error: null };
  });

const LessonInput = z.object({
  id: z.string().uuid().optional(),
  courseId: z.string().uuid(),
  moduleId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  position: z.number().int().min(0).max(999),
  isIntro: z.boolean(),
  durationSeconds: z.number().int().min(0).max(100000).optional().nullable(),
  sourceType: z.enum(["url", "upload"]),
  videoUrl: z.string().trim().max(500).optional().nullable(),
  videoPath: z.string().trim().max(500).optional().nullable(),
  isPublished: z.boolean().optional(),
  summary: z.string().trim().max(20000).optional().nullable(),
  references: z.array(z.string().trim().max(500)).max(50).optional(),
  images: z
    .array(z.object({ url: z.string().trim().max(700), caption: z.string().trim().max(200).optional() }))
    .max(20)
    .optional(),
});

export const upsertAcademyLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => LessonInput.parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      course_id: data.courseId,
      module_id: data.moduleId ?? null,
      title: data.title,
      description: data.description ?? null,
      position: data.position,
      is_intro: data.isIntro,
      duration_seconds: data.durationSeconds ?? null,
      source_type: data.sourceType,
      video_url: data.sourceType === "url" ? (data.videoUrl ?? null) : null,
      video_path: data.sourceType === "upload" ? (data.videoPath ?? null) : null,
      is_published: data.isPublished ?? true,
      summary: data.summary ?? null,
      summary_references: data.references ?? [],
      summary_images: data.images ?? [],
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
      .select(
        "id, module_id, title, description, position, is_intro, duration_seconds, source_type, video_url, video_path, is_published, summary, summary_references, summary_images",
      )
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
