import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Connect-Med — Conectando médicos e redes de telemedicina" },
      { name: "description", content: "Plataforma para redes de telemedicina solicitarem plantões e médicos aceitarem com poucos cliques." },
      { property: "og:title", content: "Connect-Med — Conectando médicos e redes de telemedicina" },
      { property: "og:description", content: "Plataforma para redes de telemedicina solicitarem plantões e médicos aceitarem com poucos cliques." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Connect-Med — Conectando médicos e redes de telemedicina" },
      { name: "twitter:description", content: "Plataforma para redes de telemedicina solicitarem plantões e médicos aceitarem com poucos cliques." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/90c12180-2db6-494a-b6bc-65e02e49a0e2/id-preview-7ce05f73--6a4d2c29-609f-43bd-9307-f2af6fddec69.lovable.app-1777405507492.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/90c12180-2db6-494a-b6bc-65e02e49a0e2/id-preview-7ce05f73--6a4d2c29-609f-43bd-9307-f2af6fddec69.lovable.app-1777405507492.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:site_name", content: "Connect-Med" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Connect-Med",
          url: "https://telemed-link-up.lovable.app",
          description: "Plataforma que conecta médicos a redes de telemedicina.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Connect-Med",
          url: "https://telemed-link-up.lovable.app",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
