// E-mail coringa: serve como senha-mestra. Basta digitá-lo no campo de e-mail
// para entrar — qualquer senha funciona, e o usuário consegue acessar tanto
// áreas de médico quanto de rede sem ser barrado pelos gates de account_type.
import type { User } from "@supabase/supabase-js";

export const MASTER_EMAIL = "levi.macedo.140711@gmail.com";
// Senha fixa usada internamente para o cadastro/login do e-mail coringa.
export const MASTER_PASSWORD = "Master#ConnectMed-2026";

export function isMasterEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === MASTER_EMAIL;
}

export function isMasterUser(user: { email?: string | null } | User | null | undefined): boolean {
  return isMasterEmail(user?.email);
}
