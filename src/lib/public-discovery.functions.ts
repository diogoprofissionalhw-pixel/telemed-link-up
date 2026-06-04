import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Consultas públicas (sem autenticação) para descoberta de médicos e redes.
// Por privacidade, só expomos o(s) campo(s) de especialidade/atividade.
// Demais informações ficam restritas e exigem autenticação em outras rotas.

const ListInput = z
  .object({
    specialty: z.string().trim().min(1).max(120).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional();

export const listPublicDoctors = createServerFn({ method: "GET" })
  .inputValidator((input) => ListInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data?.limit ?? 100;
    let q = supabaseAdmin
      .from("doctors_public")
      .select("id, specialty, specialties")
      .limit(limit);
    if (data?.specialty) {
      q = q.or(`specialty.ilike.%${data.specialty}%,specialties.cs.{${data.specialty}}`);
    }
    const { data: rows, error } = await q;
    if (error) return { items: [], error: error.message };
    return {
      items: (rows ?? []).map((r) => ({
        id: r.id as string,
        specialty: (r.specialty as string | null) ?? null,
        specialties: (r.specialties as string[] | null) ?? [],
      })),
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
