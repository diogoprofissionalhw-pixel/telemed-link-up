// E-mail coringa: serve como senha-mestra. Basta digitá-lo no campo de e-mail
// para entrar — o servidor gerencia a autenticação (senha gerada e rotacionada
// a cada login via masterSignIn server function).
import type { User } from "@supabase/supabase-js";

export const MASTER_EMAIL = "levi.macedo.140711@gmail.com";

export function isMasterEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === MASTER_EMAIL;
}

export function isMasterUser(user: { email?: string | null } | User | null | undefined): boolean {
  return isMasterEmail(user?.email);
}
