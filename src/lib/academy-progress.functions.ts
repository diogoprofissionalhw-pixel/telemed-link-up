import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMasterEmail } from "@/lib/master-access";

// Progresso do aluno, quizzes por aula e por módulo, e regra de liberação.
// Regra: a aula só é concluída após o quiz da aula ser aprovado (100% de acertos,
// até 3 tentativas). O módulo seguinte só abre quando todas as aulas do módulo
// anterior estão concluídas e o quiz do módulo foi aprovado.

function requireMaster(claims: Record<string, unknown>) {
  if (!isMasterEmail(claims["email"] as string | undefined)) {
    throw new Error("Acesso restrito à conta administradora.");
  }
}

export type QuizStatus = {
  quizId: string;
  scope: "lesson" | "module";
  lessonId: string | null;
  moduleId: string | null;
  questionCount: number;
  attemptsUsed: number;
  maxAttempts: number;
  passed: boolean;
};

export type CourseProgress = {
  lessons: { lessonId: string; percent: number; completed: boolean }[];
  quizzes: QuizStatus[];
  unlockedModuleIds: string[];
  completedModuleIds: string[];
  unlockedLessonIds: string[];
  courseCompleted: boolean;
};

/** % mínimo assistido para liberar o quiz da aula. */
export const WATCHED_THRESHOLD = 95;

async function loadCourseProgress(userId: string, courseId: string): Promise<CourseProgress> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabaseAdmin
      .from("academy_modules")
      .select("id, position")
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("academy_lessons")
      .select("id, module_id, position")
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("position", { ascending: true }),
  ]);

  const lessonIds = (lessons ?? []).map((l) => l.id);
  const moduleIds = (modules ?? []).map((m) => m.id);

  const [{ data: progress }, { data: quizzes }] = await Promise.all([
    lessonIds.length
      ? supabaseAdmin
          .from("academy_lesson_progress")
          .select("lesson_id, percent, completed_at")
          .eq("user_id", userId)
          .in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string; percent: number; completed_at: string | null }[] }),
    supabaseAdmin
      .from("academy_quizzes")
      .select("id, scope, lesson_id, module_id, max_attempts, academy_quiz_questions(id)")
      .eq("is_published", true),
  ]);

  const relevantQuizzes = (quizzes ?? []).filter(
    (q) =>
      (q.lesson_id && lessonIds.includes(q.lesson_id)) ||
      (q.module_id && moduleIds.includes(q.module_id)),
  );

  const quizIds = relevantQuizzes.map((q) => q.id);
  const { data: attempts } = quizIds.length
    ? await supabaseAdmin
        .from("academy_quiz_attempts")
        .select("quiz_id, passed")
        .eq("user_id", userId)
        .in("quiz_id", quizIds)
    : { data: [] as { quiz_id: string; passed: boolean }[] };

  const quizStatuses: QuizStatus[] = relevantQuizzes.map((q) => {
    const mine = (attempts ?? []).filter((a) => a.quiz_id === q.id);
    return {
      quizId: q.id,
      scope: q.scope as "lesson" | "module",
      lessonId: q.lesson_id,
      moduleId: q.module_id,
      questionCount: (q.academy_quiz_questions as { id: string }[] | null)?.length ?? 0,
      attemptsUsed: mine.length,
      maxAttempts: q.max_attempts,
      passed: mine.some((a) => a.passed),
    };
  });

  const lessonRows = (lessons ?? []).map((l) => {
    const p = (progress ?? []).find((row) => row.lesson_id === l.id);
    return {
      lessonId: l.id,
      moduleId: l.module_id,
      percent: p?.percent ?? 0,
      completed: Boolean(p?.completed_at),
    };
  });

  const completedModuleIds: string[] = [];
  const unlockedModuleIds: string[] = [];
  const unlockedLessonIds: string[] = [];
  let previousDone = true;

  for (const m of modules ?? []) {
    const moduleUnlocked = previousDone;
    if (moduleUnlocked) unlockedModuleIds.push(m.id);
    const moduleLessons = lessonRows.filter((l) => l.moduleId === m.id);

    // Aula seguinte só abre depois da anterior concluída.
    if (moduleUnlocked) {
      let previousLessonDone = true;
      for (const l of moduleLessons) {
        if (!previousLessonDone) break;
        unlockedLessonIds.push(l.lessonId);
        previousLessonDone = l.completed;
      }
    }

    // Módulo sem aulas publicadas não pode travar a progressão.
    const lessonsDone = moduleLessons.every((l) => l.completed);
    const moduleQuiz = quizStatuses.find((q) => q.scope === "module" && q.moduleId === m.id);
    const quizDone = !moduleQuiz || moduleQuiz.questionCount === 0 || moduleQuiz.passed;
    const done = lessonsDone && quizDone;
    if (done) completedModuleIds.push(m.id);
    previousDone = previousDone && done;
  }

  return {
    lessons: lessonRows.map(({ lessonId, percent, completed }) => ({ lessonId, percent, completed })),
    quizzes: quizStatuses,
    unlockedModuleIds,
    completedModuleIds,
    unlockedLessonIds,
    courseCompleted: (modules ?? []).length > 0 && completedModuleIds.length === (modules ?? []).length,
  };
}

export const getMyCourseProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => loadCourseProgress(context.userId, data.courseId));

/** Salva o % assistido da aula. Não conclui a aula: isso depende do quiz. */
export const saveLessonProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        lessonId: z.string().uuid(),
        watchedSeconds: z.number().int().min(0).max(200000),
        percent: z.number().int().min(0).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("academy_lesson_progress")
      .select("id, percent, watched_seconds")
      .eq("user_id", context.userId)
      .eq("lesson_id", data.lessonId)
      .maybeSingle();

    const percent = Math.max(existing?.percent ?? 0, data.percent);
    const watched = Math.max(existing?.watched_seconds ?? 0, data.watchedSeconds);

    if (existing) {
      await supabaseAdmin
        .from("academy_lesson_progress")
        .update({ percent, watched_seconds: watched })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("academy_lesson_progress").insert({
        user_id: context.userId,
        lesson_id: data.lessonId,
        percent,
        watched_seconds: watched,
      });
    }

    // Ao rever a aula quase toda, as tentativas esgotadas do quiz são liberadas.
    let attemptsReset = false;
    if (percent >= 95) {
      const { data: quiz } = await supabaseAdmin
        .from("academy_quizzes")
        .select("id, max_attempts")
        .eq("lesson_id", data.lessonId)
        .maybeSingle();
      if (quiz) {
        const { data: rows } = await supabaseAdmin
          .from("academy_quiz_attempts")
          .select("id, passed")
          .eq("user_id", context.userId)
          .eq("quiz_id", quiz.id);
        const used = rows ?? [];
        if (used.length >= quiz.max_attempts && !used.some((a) => a.passed)) {
          await supabaseAdmin
            .from("academy_quiz_attempts")
            .delete()
            .eq("user_id", context.userId)
            .eq("quiz_id", quiz.id);
          attemptsReset = true;
        }
      }
    }

    return { ok: true, percent, attemptsReset };
  });

export type QuizForStudent = {
  quizId: string;
  title: string;
  maxAttempts: number;
  attemptsUsed: number;
  passed: boolean;
  questions: { id: string; prompt: string; options: { id: string; label: string }[] }[];
};

async function loadQuiz(
  userId: string,
  filter: { lessonId?: string; moduleId?: string },
): Promise<QuizForStudent | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("academy_quizzes")
    .select("id, title, max_attempts")
    .eq("is_published", true);
  query = filter.lessonId
    ? query.eq("lesson_id", filter.lessonId)
    : query.eq("module_id", filter.moduleId as string);

  const { data: quiz } = await query.maybeSingle();
  if (!quiz) return null;

  const { data: questions } = await supabaseAdmin
    .from("academy_quiz_questions")
    .select("id, prompt, position, academy_quiz_options(id, label, position)")
    .eq("quiz_id", quiz.id)
    .order("position", { ascending: true });

  const { data: attempts } = await supabaseAdmin
    .from("academy_quiz_attempts")
    .select("passed")
    .eq("user_id", userId)
    .eq("quiz_id", quiz.id);

  const items = (questions ?? []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: ((q.academy_quiz_options ?? []) as { id: string; label: string; position: number }[])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ id: o.id, label: o.label })),
  }));

  if (items.length === 0) return null;

  return {
    quizId: quiz.id,
    title: quiz.title,
    maxAttempts: quiz.max_attempts,
    attemptsUsed: (attempts ?? []).length,
    passed: (attempts ?? []).some((a) => a.passed),
    questions: items,
  };
}

export const getQuizForLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ lessonId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => ({
    quiz: await loadQuiz(context.userId, { lessonId: data.lessonId }),
  }));

export const getQuizForModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ moduleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => ({
    quiz: await loadQuiz(context.userId, { moduleId: data.moduleId }),
  }));

/** Corrige o quiz no servidor. Aprovado só com 100% de acertos. */
export const submitQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        quizId: z.string().uuid(),
        answers: z
          .array(z.object({ questionId: z.string().uuid(), optionId: z.string().uuid() }))
          .min(1)
          .max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: quiz } = await supabaseAdmin
      .from("academy_quizzes")
      .select("id, scope, lesson_id, module_id, max_attempts")
      .eq("id", data.quizId)
      .maybeSingle();
    if (!quiz) return { ok: false as const, error: "Quiz não encontrado.", passed: false };

    // Quiz da aula só pode ser respondido depois de assistir a aula até o fim.
    if (quiz.scope === "lesson" && quiz.lesson_id) {
      const { data: row } = await supabaseAdmin
        .from("academy_lesson_progress")
        .select("percent, completed_at")
        .eq("user_id", context.userId)
        .eq("lesson_id", quiz.lesson_id)
        .maybeSingle();
      const watched = row?.percent ?? 0;
      if (!row?.completed_at && watched < WATCHED_THRESHOLD) {
        return {
          ok: false as const,
          error: "Assista a aula até o fim para liberar o quiz.",
          passed: false,
        };
      }
    }


    // Quiz de módulo só pode ser respondido com todas as aulas do módulo concluídas.
    if (quiz.scope === "module" && quiz.module_id) {
      const { data: moduleLessons } = await supabaseAdmin
        .from("academy_lessons")
        .select("id")
        .eq("module_id", quiz.module_id)
        .eq("is_published", true);
      const ids = (moduleLessons ?? []).map((l) => l.id);
      if (ids.length > 0) {
        const { data: done } = await supabaseAdmin
          .from("academy_lesson_progress")
          .select("lesson_id")
          .eq("user_id", context.userId)
          .in("lesson_id", ids)
          .not("completed_at", "is", null);
        if ((done ?? []).length < ids.length) {
          return {
            ok: false as const,
            error: "Conclua todas as aulas do módulo antes do quiz final.",
            passed: false,
          };
        }
      }
    }

    const { data: attempts } = await supabaseAdmin
      .from("academy_quiz_attempts")
      .select("id, passed")
      .eq("user_id", context.userId)
      .eq("quiz_id", quiz.id);
    const used = attempts ?? [];
    if (used.some((a) => a.passed)) {
      return { ok: true as const, error: null, passed: true, correctCount: 0, totalCount: 0, attemptsLeft: 0 };
    }
    if (used.length >= quiz.max_attempts) {
      return {
        ok: false as const,
        error: "Tentativas esgotadas. Reveja a aula para liberar novas tentativas.",
        passed: false,
        attemptsLeft: 0,
      };
    }

    const { data: questions } = await supabaseAdmin
      .from("academy_quiz_questions")
      .select("id, academy_quiz_options(id, is_correct)")
      .eq("quiz_id", quiz.id);

    const total = (questions ?? []).length;
    let correct = 0;
    for (const q of questions ?? []) {
      const answer = data.answers.find((a) => a.questionId === q.id);
      const options = (q.academy_quiz_options ?? []) as { id: string; is_correct: boolean }[];
      if (answer && options.some((o) => o.id === answer.optionId && o.is_correct)) correct += 1;
    }
    const passed = total > 0 && correct === total;

    await supabaseAdmin.from("academy_quiz_attempts").insert({
      user_id: context.userId,
      quiz_id: quiz.id,
      attempt_no: used.length + 1,
      correct_count: correct,
      total_count: total,
      passed,
    });

    if (passed && quiz.scope === "lesson" && quiz.lesson_id) {
      const { data: existing } = await supabaseAdmin
        .from("academy_lesson_progress")
        .select("id")
        .eq("user_id", context.userId)
        .eq("lesson_id", quiz.lesson_id)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("academy_lesson_progress")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("academy_lesson_progress").insert({
          user_id: context.userId,
          lesson_id: quiz.lesson_id,
          percent: 100,
          watched_seconds: 0,
          completed_at: new Date().toISOString(),
        });
      }
    }

    return {
      ok: true as const,
      error: null,
      passed,
      correctCount: correct,
      totalCount: total,
      attemptsLeft: Math.max(0, quiz.max_attempts - (used.length + 1)),
    };
  });

/* ------------------------------------------------------------------ */
/* Painel da conta mestre: quizzes e progresso dos alunos              */
/* ------------------------------------------------------------------ */

const QuizInput = z.object({
  scope: z.enum(["lesson", "module"]),
  lessonId: z.string().uuid().optional().nullable(),
  moduleId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  questions: z
    .array(
      z.object({
        prompt: z.string().trim().min(1).max(1000),
        options: z
          .array(z.object({ label: z.string().trim().min(1).max(400), isCorrect: z.boolean() }))
          .min(2)
          .max(6),
      }),
    )
    .min(1)
    .max(30),
});

/** Regrava o quiz inteiro (perguntas e alternativas) da aula ou do módulo. */
export const saveQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => QuizInput.parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const q of data.questions) {
      if (q.options.filter((o) => o.isCorrect).length !== 1) {
        return { ok: false, error: "Cada pergunta precisa de exatamente uma alternativa correta." };
      }
    }

    const key = data.scope === "lesson" ? "lesson_id" : "module_id";
    const keyValue = data.scope === "lesson" ? data.lessonId : data.moduleId;
    if (!keyValue) return { ok: false, error: "Selecione a aula ou o módulo do quiz." };

    const { data: existing } = await supabaseAdmin
      .from("academy_quizzes")
      .select("id")
      .eq(key, keyValue)
      .maybeSingle();

    let quizId = existing?.id ?? null;
    if (quizId) {
      await supabaseAdmin
        .from("academy_quizzes")
        .update({ title: data.title, max_attempts: data.maxAttempts ?? 3 })
        .eq("id", quizId);
      await supabaseAdmin.from("academy_quiz_questions").delete().eq("quiz_id", quizId);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("academy_quizzes")
        .insert({
          scope: data.scope,
          lesson_id: data.scope === "lesson" ? keyValue : null,
          module_id: data.scope === "module" ? keyValue : null,
          title: data.title,
          max_attempts: data.maxAttempts ?? 3,
        })
        .select("id")
        .maybeSingle();
      if (error || !created) return { ok: false, error: error?.message ?? "Erro ao criar quiz" };
      quizId = created.id;
    }

    for (const [i, q] of data.questions.entries()) {
      const { data: question, error } = await supabaseAdmin
        .from("academy_quiz_questions")
        .insert({ quiz_id: quizId, prompt: q.prompt, position: i + 1 })
        .select("id")
        .maybeSingle();
      if (error || !question) return { ok: false, error: error?.message ?? "Erro ao salvar pergunta" };

      const options = q.options.map((o, j) => ({
        question_id: question.id,
        label: o.label,
        is_correct: o.isCorrect,
        position: j + 1,
      }));
      const { error: optErr } = await supabaseAdmin.from("academy_quiz_options").insert(options);
      if (optErr) return { ok: false, error: optErr.message };
    }

    return { ok: true, error: null };
  });

export const getQuizForManage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        scope: z.enum(["lesson", "module"]),
        lessonId: z.string().uuid().optional().nullable(),
        moduleId: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const key = data.scope === "lesson" ? "lesson_id" : "module_id";
    const keyValue = data.scope === "lesson" ? data.lessonId : data.moduleId;
    if (!keyValue) return { quiz: null };

    const { data: quiz } = await supabaseAdmin
      .from("academy_quizzes")
      .select("id, title, max_attempts")
      .eq(key, keyValue)
      .maybeSingle();
    if (!quiz) return { quiz: null };

    const { data: questions } = await supabaseAdmin
      .from("academy_quiz_questions")
      .select("id, prompt, position, academy_quiz_options(id, label, is_correct, position)")
      .eq("quiz_id", quiz.id)
      .order("position", { ascending: true });

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        maxAttempts: quiz.max_attempts,
        questions: (questions ?? []).map((q) => ({
          prompt: q.prompt,
          options: ((q.academy_quiz_options ?? []) as { label: string; is_correct: boolean; position: number }[])
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((o) => ({ label: o.label, isCorrect: o.is_correct })),
        })),
      },
    };
  });

export type StudentProgressRow = {
  userId: string;
  name: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  quizzesPassed: number;
  percent: number;
  courseCompleted: boolean;
};

/** Visão administrativa: progresso e conclusão dos alunos em uma trilha. */
export const listStudentsProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    requireMaster(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = await collectProgressRows(supabaseAdmin, data.courseId, null);
    return { items: rows };
  });

/** Reutilizado pelo painel da empresa parceira (lista restrita de alunos). */
export async function collectProgressRows(
  admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  courseId: string,
  onlyUserIds: string[] | null,
): Promise<StudentProgressRow[]> {
  const { data: lessons } = await admin
    .from("academy_lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("is_published", true);
  const lessonIds = (lessons ?? []).map((l) => l.id);
  if (lessonIds.length === 0) return [];

  let progressQuery = admin
    .from("academy_lesson_progress")
    .select("user_id, lesson_id, percent, completed_at")
    .in("lesson_id", lessonIds);
  if (onlyUserIds) {
    if (onlyUserIds.length === 0) return [];
    progressQuery = progressQuery.in("user_id", onlyUserIds);
  }
  const { data: progress } = await progressQuery;

  const userIds = [...new Set((progress ?? []).map((p) => p.user_id))];
  const targetIds = onlyUserIds ? [...new Set([...onlyUserIds])] : userIds;
  if (targetIds.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", targetIds);

  const { data: quizzes } = await admin.from("academy_quizzes").select("id, lesson_id, module_id");
  const quizIds = (quizzes ?? []).map((q) => q.id);
  const { data: attempts } = quizIds.length
    ? await admin
        .from("academy_quiz_attempts")
        .select("user_id, quiz_id, passed")
        .in("quiz_id", quizIds)
        .in("user_id", targetIds)
    : { data: [] as { user_id: string; quiz_id: string; passed: boolean }[] };

  return targetIds.map((userId) => {
    const mine = (progress ?? []).filter((p) => p.user_id === userId);
    const completed = mine.filter((p) => p.completed_at).length;
    const passed = (attempts ?? []).filter((a) => a.user_id === userId && a.passed).length;
    return {
      userId,
      name: (profiles ?? []).find((p) => p.id === userId)?.full_name ?? "Aluno",
      lessonsCompleted: completed,
      lessonsTotal: lessonIds.length,
      quizzesPassed: passed,
      percent: Math.round((completed / lessonIds.length) * 100),
      courseCompleted: completed === lessonIds.length,
    };
  });
}
