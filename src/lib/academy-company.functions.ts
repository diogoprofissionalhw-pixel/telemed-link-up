import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { collectProgressRows, type StudentProgressRow } from "@/lib/academy-progress.functions";

// Acesso da empresa parceira: acompanha a jornada dos profissionais vinculados
// e monta uma trilha personalizada (módulos liberados para a equipe).
// O médico só vê conteúdo de empresa quando ela o habilita.

async function assertNetwork(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("profiles")
    .select("account_type")
    .eq("id", context.userId)
    .maybeSingle();
  if (data?.account_type !== "network") {
    throw new Error("Este painel é exclusivo das empresas parceiras.");
  }
}

export type CompanyMember = {
  doctorId: string;
  name: string;
  specialty: string | null;
  status: "pending" | "accepted";
};

export const getCompanyPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ courseId: z.string().uuid().optional().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertNetwork(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members } = await supabaseAdmin
      .from("academy_company_members")
      .select("doctor_id, status")
      .eq("network_id", context.userId);
    const memberIds = (members ?? []).map((m) => m.doctor_id);
    const acceptedIds = (members ?? []).filter((m) => m.status === "accepted").map((m) => m.doctor_id);

    const [{ data: profiles }, { data: doctors }] = await Promise.all([
      memberIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name").in("id", memberIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
      memberIds.length
        ? supabaseAdmin.from("doctors").select("id, specialty").in("id", memberIds)
        : Promise.resolve({ data: [] as { id: string; specialty: string }[] }),
    ]);

    const roster: CompanyMember[] = (members ?? []).map((m) => ({
      doctorId: m.doctor_id,
      name: (profiles ?? []).find((p) => p.id === m.doctor_id)?.full_name ?? "Profissional",
      specialty: (doctors ?? []).find((d) => d.id === m.doctor_id)?.specialty ?? null,
      status: m.status as "pending" | "accepted",
    }));

    const { data: track } = await supabaseAdmin
      .from("academy_company_tracks")
      .select("id, title, description")
      .eq("network_id", context.userId)
      .maybeSingle();

    const { data: items } = track
      ? await supabaseAdmin
          .from("academy_company_track_items")
          .select("id, course_id, module_id, position")
          .eq("track_id", track.id)
          .order("position", { ascending: true })
      : { data: [] as { id: string; course_id: string; module_id: string | null; position: number }[] };

    const progress: StudentProgressRow[] = data.courseId
      ? await collectProgressRows(supabaseAdmin, data.courseId, acceptedIds)
      : [];

    return { roster, track: track ?? null, items: items ?? [], progress };
  });

export const setCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ doctorId: z.string().uuid(), linked: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertNetwork(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.linked) {
      const { data: existing } = await supabaseAdmin
        .from("academy_company_members")
        .select("status")
        .eq("network_id", context.userId)
        .eq("doctor_id", data.doctorId)
        .maybeSingle();
      if (existing?.status === "accepted") {
        return { ok: false, error: "Este profissional já faz parte da sua equipe." };
      }

      const { error } = await supabaseAdmin
        .from("academy_company_members")
        .upsert(
          {
            network_id: context.userId,
            doctor_id: data.doctorId,
            status: "pending",
            invited_at: new Date().toISOString(),
            responded_at: null,
          },
          { onConflict: "network_id,doctor_id" },
        );
      if (error) return { ok: false, error: error.message };

      const { data: network } = await supabaseAdmin
        .from("networks")
        .select("network_name")
        .eq("id", context.userId)
        .maybeSingle();
      await supabaseAdmin.from("notifications").insert({
        user_id: data.doctorId,
        type: "academy_invite",
        title: "Convite para a equipe da Connect-Academy",
        body: `A empresa ${network?.network_name ?? "parceira"} convidou você para a equipe dela na Connect-Academy. Abra a Academy para aceitar ou recusar.`,
      });
    } else {
      const { error } = await supabaseAdmin
        .from("academy_company_members")
        .delete()
        .eq("network_id", context.userId)
        .eq("doctor_id", data.doctorId);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true, error: null };
  });

export const saveCompanyTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(1000).optional().nullable(),
        modules: z.array(z.object({ courseId: z.string().uuid(), moduleId: z.string().uuid() })).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertNetwork(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: track, error } = await supabaseAdmin
      .from("academy_company_tracks")
      .upsert(
        {
          network_id: context.userId,
          title: data.title,
          description: data.description ?? null,
        },
        { onConflict: "network_id" },
      )
      .select("id")
      .maybeSingle();
    if (error || !track) return { ok: false, error: error?.message ?? "Erro ao salvar trilha" };

    await supabaseAdmin.from("academy_company_track_items").delete().eq("track_id", track.id);
    if (data.modules.length > 0) {
      const rows = data.modules.map((m, i) => ({
        track_id: track.id,
        course_id: m.courseId,
        module_id: m.moduleId,
        position: i + 1,
      }));
      const { error: itemsErr } = await supabaseAdmin.from("academy_company_track_items").insert(rows);
      if (itemsErr) return { ok: false, error: itemsErr.message };
    }
    return { ok: true, error: null };
  });

/** Lista médicos vinculáveis (verificados) para a empresa montar sua equipe. */
export const listLinkableDoctors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertNetwork(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: doctors } = await supabaseAdmin
      .from("doctors")
      .select("id, specialty")
      .eq("crm_status", "verified")
      .limit(200);
    const ids = (doctors ?? []).map((d) => d.id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string }[] };

    return {
      items: ids.map((id) => ({
        doctorId: id,
        name: (profiles ?? []).find((p) => p.id === id)?.full_name ?? "Profissional",
        specialty: (doctors ?? []).find((d) => d.id === id)?.specialty ?? null,
      })),
    };
  });

export type CompanyStudentOverview = {
  doctorId: string;
  name: string;
  specialty: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  quizzesPassed: number;
  percent: number;
  coursesCompleted: number;
};

/**
 * Resumo do progresso na Academy de todos os profissionais vinculados pela
 * empresa, somando todas as trilhas publicadas. Usado no painel da empresa.
 */
export const getCompanyAcademyOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertNetwork(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members } = await supabaseAdmin
      .from("academy_company_members")
      .select("doctor_id")
      .eq("network_id", context.userId)
      .eq("status", "accepted");
    const memberIds = (members ?? []).map((m) => m.doctor_id);
    if (memberIds.length === 0) return { items: [] as CompanyStudentOverview[] };

    const [{ data: profiles }, { data: doctors }, { data: courses }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name").in("id", memberIds),
      supabaseAdmin.from("doctors").select("id, specialty").in("id", memberIds),
      supabaseAdmin.from("academy_courses").select("id").eq("is_published", true),
    ]);

    const courseIds = (courses ?? []).map((c) => c.id);
    const { data: lessons } = courseIds.length
      ? await supabaseAdmin
          .from("academy_lessons")
          .select("id, course_id")
          .in("course_id", courseIds)
          .eq("is_published", true)
      : { data: [] as { id: string; course_id: string }[] };

    const lessonIds = (lessons ?? []).map((l) => l.id);
    const { data: progress } = lessonIds.length
      ? await supabaseAdmin
          .from("academy_lesson_progress")
          .select("user_id, lesson_id, completed_at")
          .in("lesson_id", lessonIds)
          .in("user_id", memberIds)
      : { data: [] as { user_id: string; lesson_id: string; completed_at: string | null }[] };

    const { data: quizzes } = await supabaseAdmin.from("academy_quizzes").select("id");
    const quizIds = (quizzes ?? []).map((q) => q.id);
    const { data: attempts } = quizIds.length
      ? await supabaseAdmin
          .from("academy_quiz_attempts")
          .select("user_id, quiz_id, passed")
          .in("quiz_id", quizIds)
          .in("user_id", memberIds)
      : { data: [] as { user_id: string; quiz_id: string; passed: boolean }[] };

    const lessonsTotal = lessonIds.length;
    const items: CompanyStudentOverview[] = memberIds.map((id) => {
      const doneLessonIds = new Set(
        (progress ?? []).filter((p) => p.user_id === id && p.completed_at).map((p) => p.lesson_id),
      );
      const passed = new Set(
        (attempts ?? []).filter((a) => a.user_id === id && a.passed).map((a) => a.quiz_id),
      ).size;
      const coursesCompleted = courseIds.filter((cid) => {
        const ids = (lessons ?? []).filter((l) => l.course_id === cid).map((l) => l.id);
        return ids.length > 0 && ids.every((lid) => doneLessonIds.has(lid));
      }).length;

      return {
        doctorId: id,
        name: (profiles ?? []).find((p) => p.id === id)?.full_name ?? "Profissional",
        specialty: (doctors ?? []).find((d) => d.id === id)?.specialty ?? null,
        lessonsCompleted: doneLessonIds.size,
        lessonsTotal,
        quizzesPassed: passed,
        percent: lessonsTotal > 0 ? Math.round((doneLessonIds.size / lessonsTotal) * 100) : 0,
        coursesCompleted,
      };
    });

    items.sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, "pt-BR"));
    return { items };
  });

/** Módulos liberados pela empresa para o médico logado (conteúdo de empresa). */
export const getMyCompanyTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("academy_company_members")
      .select("network_id")
      .eq("doctor_id", context.userId)
      .eq("status", "accepted")
      .maybeSingle();
    if (!link) return { track: null, moduleIds: [] as string[], companyName: null };

    const [{ data: track }, { data: network }] = await Promise.all([
      supabaseAdmin
        .from("academy_company_tracks")
        .select("id, title, description")
        .eq("network_id", link.network_id)
        .maybeSingle(),
      supabaseAdmin.from("networks").select("network_name").eq("id", link.network_id).maybeSingle(),
    ]);
    if (!track) return { track: null, moduleIds: [] as string[], companyName: network?.network_name ?? null };

    const { data: items } = await supabaseAdmin
      .from("academy_company_track_items")
      .select("module_id")
      .eq("track_id", track.id);

    return {
      track: { title: track.title, description: track.description },
      moduleIds: (items ?? []).map((i) => i.module_id).filter((v): v is string => Boolean(v)),
      companyName: network?.network_name ?? null,
    };
  });

export type AcademyInvite = { networkId: string; companyName: string; invitedAt: string | null };

/** Convites pendentes de equipe da Academy para o médico logado. */
export const listMyAcademyInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invites } = await supabaseAdmin
      .from("academy_company_members")
      .select("network_id, invited_at")
      .eq("doctor_id", context.userId)
      .eq("status", "pending");
    const networkIds = (invites ?? []).map((i) => i.network_id);
    const { data: networks } = networkIds.length
      ? await supabaseAdmin.from("networks").select("id, network_name").in("id", networkIds)
      : { data: [] as { id: string; network_name: string }[] };

    return {
      items: (invites ?? []).map((i) => ({
        networkId: i.network_id,
        companyName:
          (networks ?? []).find((n) => n.id === i.network_id)?.network_name ?? "Empresa parceira",
        invitedAt: i.invited_at,
      })) as AcademyInvite[],
    };
  });

/** Médico responde ao convite: aceita (entra na equipe) ou recusa (convite removido). */
export const respondAcademyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ networkId: z.string().uuid(), accept: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("academy_company_members")
      .select("id, status")
      .eq("network_id", data.networkId)
      .eq("doctor_id", context.userId)
      .maybeSingle();
    if (!invite || invite.status !== "pending") {
      return { ok: false, error: "Convite não encontrado ou já respondido." };
    }

    if (data.accept) {
      const { error } = await supabaseAdmin
        .from("academy_company_members")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin
        .from("academy_company_members")
        .delete()
        .eq("id", invite.id);
      if (error) return { ok: false, error: error.message };
    }

    const [{ data: profile }, { data: network }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle(),
      supabaseAdmin.from("networks").select("network_name").eq("id", data.networkId).maybeSingle(),
    ]);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.networkId,
      type: "academy_invite_response",
      title: data.accept ? "Convite da Academy aceito" : "Convite da Academy recusado",
      body: `${profile?.full_name ?? "O profissional"} ${data.accept ? "aceitou" : "recusou"} o convite para a equipe da ${network?.network_name ?? "sua empresa"} na Connect-Academy.`,
    });

    return { ok: true, error: null };
  });
