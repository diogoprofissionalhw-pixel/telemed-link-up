import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "Connect-Academy — Educação e Capacitação Médica" },
      { name: "description", content: "Cursos, treinamentos e capacitação para médicos e redes de telemedicina." },
      { property: "og:title", content: "Connect-Academy — Educação e Capacitação Médica" },
      { property: "og:description", content: "Cursos, treinamentos e capacitação para médicos e redes de telemedicina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcademyPage,
});

function AcademyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent mb-6">
          <GraduationCap className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Connect-Academy</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Em breve: cursos, trilhas de capacitação e conteúdo especializado para médicos e redes de telemedicina.
        </p>
        <div className="mt-8">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Connect-Med
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
