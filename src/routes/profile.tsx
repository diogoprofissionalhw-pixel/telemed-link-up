import { createFileRoute, redirect } from "@tanstack/react-router";

// Redireciona /profile (rota antiga) para /perfil (nova).
export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    throw redirect({ to: "/perfil" });
  },
});
