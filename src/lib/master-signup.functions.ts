import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { MASTER_EMAIL, MASTER_PASSWORD } from "./master-access";

// Cria (ou garante a existência de) o usuário master com e-mail já confirmado,
// para que o login não exija verificação por e-mail.
export const ensureMasterUser = createServerFn({ method: "POST" }).handler(async () => {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email: MASTER_EMAIL,
    password: MASTER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: "Acesso Master",
      account_type: "doctor",
      crm: "111111",
      crm_uf: "SP",
      specialty: "Clínica Médica",
      cpf: "39053344705",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
    },
  });

  if (error) {
    // Já existe — tudo certo, segue o jogo.
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: true, created: false };
    }
    throw new Error(error.message);
  }
  return { ok: true, created: true, id: data.user?.id };
});
