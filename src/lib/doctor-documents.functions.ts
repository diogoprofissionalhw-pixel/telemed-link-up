import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DoctorDocument {
  key: string;
  label: string;
  url: string;
}

// Extrai o caminho dentro do bucket a partir de uma URL pública/assinada ou de um path puro.
function toStoragePath(raw: string, bucket: string): string {
  const markers = [`/storage/v1/object/public/${bucket}/`, `/storage/v1/object/${bucket}/`, `/${bucket}/`];
  for (const marker of markers) {
    const idx = raw.indexOf(marker);
    if (idx >= 0) return raw.slice(idx + marker.length).split("?")[0];
  }
  return raw.replace(/^\/+/, "").split("?")[0];
}

/**
 * Retorna links temporários (1h) para a documentação do médico.
 * Só usuários autenticados na plataforma conseguem chamar; os arquivos ficam
 * em buckets privados e nunca são expostos publicamente.
 */
export const getDoctorDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ doctorId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<DoctorDocument[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: doctor, error } = await supabaseAdmin
      .from("doctors")
      .select("cv_pdf_url, diploma_url, crm_document_url")
      .eq("id", data.doctorId)
      .maybeSingle();

    if (error || !doctor) return [];

    const entries: { key: string; label: string; bucket: string; raw: string | null }[] = [
      { key: "cv", label: "Currículo (PDF)", bucket: "cvs", raw: doctor.cv_pdf_url },
      { key: "diploma", label: "Diploma de medicina", bucket: "documents", raw: doctor.diploma_url },
      { key: "crm", label: "Documento do CRM", bucket: "documents", raw: doctor.crm_document_url },
    ];

    const docs: DoctorDocument[] = [];
    for (const entry of entries) {
      if (!entry.raw) continue;
      const path = toStoragePath(entry.raw, entry.bucket);
      const { data: signed } = await supabaseAdmin.storage
        .from(entry.bucket)
        .createSignedUrl(path, 3600);
      if (signed?.signedUrl) {
        docs.push({ key: entry.key, label: entry.label, url: signed.signedUrl });
      }
    }

    return docs;
  });
