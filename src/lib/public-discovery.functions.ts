import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Consultas públicas (sem autenticação) para descoberta de médicos e redes.
// Por privacidade, só expomos o(s) campo(s) de especialidade/atividade.
// Demais informações ficam restritas e exigem autenticação em outras rotas.

const ListInput = z
  .object({
    specialty: z.string().trim().min(1).max(120).optional(),
    activity: z.string().trim().min(1).max(120).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional(),
  })
  .optional();

export const listPublicDoctors = createServerFn({ method: "GET" })
  .inputValidator((input) => ListInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data?.limit ?? 12;
    const page = data?.page ?? 1;
    const offset = (page - 1) * limit;

    let base = supabaseAdmin.from("doctors_public").select("id, specialty, specialties");
    if (data?.specialty) {
      base = base.ilike("specialty", `%${data.specialty}%`);
    }
    if (data?.activity) {
      base = base.or(`specialties.cs.{${data.activity}}`);
    }

    const { data: rows, error } = await base.range(offset, offset + limit - 1).limit(limit);
    if (error) return { items: [], total: 0, error: error.message };

    let countQ = supabaseAdmin.from("doctors_public").select("*", { count: "exact", head: true });
    if (data?.specialty) {
      countQ = countQ.ilike("specialty", `%${data.specialty}%`);
    }
    if (data?.activity) {
      countQ = countQ.or(`specialties.cs.{${data.activity}}`);
    }
    const { count, error: countErr } = await countQ;

    if (countErr) return { items: [], total: 0, error: countErr.message };

    return {
      items: (rows ?? []).map((r) => ({
        id: r.id as string,
        specialty: (r.specialty as string | null) ?? null,
        specialties: (r.specialties as string[] | null) ?? [],
      })),
      total: count ?? 0,
      error: null,
    };
  });

export const listPublicNetworks = createServerFn({ method: "GET" })
  .inputValidator((input) => ListInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data?.limit ?? 100;
    let q = supabaseAdmin
      .from("networks_public")
      .select("id, cnpj_activity")
      .limit(limit);
    if (data?.specialty) {
      q = q.ilike("cnpj_activity", `%${data.specialty}%`);
    }
    const { data: rows, error } = await q;
    if (error) return { items: [], error: error.message };
    return {
      items: (rows ?? []).map((r) => ({
        id: r.id as string,
        activity: (r.cnpj_activity as string | null) ?? null,
      })),
      error: null,
    };
  });
