import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Login master sem senha foi desativado por segurança: qualquer pessoa que
// soubesse o e-mail conseguia entrar. A conta master entra com senha normal.
export const masterSignIn = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ email: z.string().email().max(255) }).parse(input))
  .handler(async (): Promise<{ password: string }> => {
    throw new Error("Acesso especial desativado. Entre com sua senha.");
  });
