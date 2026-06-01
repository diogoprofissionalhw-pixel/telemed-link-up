import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Connect-Med" },
      { name: "description", content: "Defina uma nova senha para sua conta Connect-Med." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não conferem",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Supabase processa o token de recovery automaticamente via onAuthStateChange.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Caso o hash já tenha sido processado antes do listener montar:
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      password: fd.get("password"),
      confirm: fd.get("confirm"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida com sucesso!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-12">
        <BackButton to="/auth" label="Voltar ao login" />
        <div className="mt-6 rounded-2xl border bg-card p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <h1 className="text-2xl font-bold">Redefinir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma nova senha para sua conta.
          </p>

          {!ready ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Aguardando link de recuperação… Abra o e-mail mais recente e clique no link enviado.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" name="password" type="password" required autoComplete="new-password" />
              </div>
              <div>
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input id="confirm" name="confirm" type="password" required autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
