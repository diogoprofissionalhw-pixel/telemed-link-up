import { createFileRoute, redirect } from "@tanstack/react-router";

// Para redes, "Perfil da empresa" usa /perfil-empresa que apenas redireciona
// para a rota unificada /perfil (que detecta o tipo de conta).
export const Route = createFileRoute("/perfil-empresa")({
  beforeLoad: () => {
    throw redirect({ to: "/perfil" });
  },
});
