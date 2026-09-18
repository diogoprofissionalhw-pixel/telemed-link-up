import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import {
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Hospital,
  PointerIcon,
  ScrollText,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import logoAcademy from "@/assets/connect-academy-logo-v5.png.asset.json";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { AcademyInvitesCard } from "@/components/academy-invites-card";
import { useAuth } from "@/lib/auth-context";
import { isMasterEmail } from "@/lib/master-access";


export const Route = createFileRoute("/academy/")({
  head: () => ({
    meta: [
      { title: "Connect-Academy — Formação e Capacitação em Saúde" },
      {
        name: "description",
        content:
          "Trilhas de ensino técnico, pós-graduação, residência e cursos de atualização para profissionais de saúde na Connect-Academy.",
      },
      { property: "og:title", content: "Connect-Academy — Formação e Capacitação em Saúde" },
      {
        property: "og:description",
        content:
          "Ensino técnico, pós-graduação, residência e atualização para toda a sua jornada profissional em saúde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcademyPage,
});

interface TrackCard {
  title: string;
  slug: string;
  description: string;
  icon: LucideIcon;
  bar: string;
  photo: string;
}

const tracks: TrackCard[] = [
  {
    title: "Ensino Médio Técnico",
    slug: "ensino-medio-tecnico",
    description: "Educação da base curricular do MEC e sólida formação técnica na área da saúde.",
    icon: BookOpen,
    bar: "bg-cat-orange",
    photo: "from-cat-orange/70 to-navy",
  },
  {
    title: "Curso Técnico",
    slug: "curso-tecnico",
    description: "As melhores metodologias e estrutura voltadas para a prática e a empregabilidade.",
    icon: GraduationCap,
    bar: "bg-cat-purple",
    photo: "from-cat-purple/70 to-navy",
  },
  {
    title: "Pós-Graduação",
    slug: "pos-graduacao",
    description: "Tradição e pioneirismo junto com as mais modernas práticas em saúde.",
    icon: ScrollText,
    bar: "bg-cat-sky",
    photo: "from-cat-sky/70 to-navy",
  },
  {
    title: "Residência e Aprimoramento",
    slug: "residencia-e-aprimoramento",
    description: "Aprendizado em serviço, com estrutura de ponta e supervisão dos melhores especialistas.",
    icon: Hospital,
    bar: "bg-cat-green",
    photo: "from-cat-green/70 to-navy",
  },
  {
    title: "Cursos de Atualização",
    slug: "cursos-de-atualizacao",
    description: "Experiências inovadoras para aprimorar habilidades em diversas áreas.",
    icon: Award,
    bar: "bg-cat-lime",
    photo: "from-cat-lime/70 to-navy",
  },
  {
    title: "Comunidade e Mentoria",
    slug: "comunidade-e-mentoria",
    description: "Conteúdo em alta transformação e conhecimento compartilhado entre profissionais.",
    icon: Users,
    bar: "bg-cat-gold",
    photo: "from-cat-gold/70 to-navy",
  },
  {
    title: "Preparatório Residência",
    slug: "preparatorio-residencia",
    description: "Curso preparatório para conquistar vagas nas melhores residências médicas.",
    icon: Stethoscope,
    bar: "bg-cat-navy",
    photo: "from-cat-navy/70 to-navy",
  },
];


function AcademyPage() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();


  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-6">
          <BackButton to="/" label="Voltar ao Connect-Med" />
          <div className="flex flex-wrap gap-2">
            {profile?.account_type === "network" && (
              <Link to="/academy/empresa">
                <Button variant="outline">Painel da minha empresa</Button>
              </Link>
            )}
          </div>
        </div>


        {/* Hero */}
        <section className="bg-muted/60 px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex justify-center">
              <img src={logoAcademy.url} alt="Connect-Academy" className="h-44 w-auto drop-shadow-lg sm:h-52" />
            </div>
            <h1
              className="text-center text-3xl font-bold leading-[1.15] tracking-tight text-primary sm:text-4xl md:text-5xl"
              style={{ fontFamily: "'Quicksand', sans-serif" }}
            >
              O Ensino Connect
              <br className="hidden md:block" /> em toda a sua
              <br className="hidden md:block" /> jornada profissional
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
              Trilhas de formação para cada etapa da carreira em saúde — da base técnica à especialização.
            </p>
          </div>
        </section>

        {/* Carrossel */}
        <section className="relative py-10">
          <div className="mx-auto mb-4 flex max-w-6xl items-center justify-between gap-4 px-4">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Nossas trilhas</h2>
            <div className="hidden shrink-0 gap-2 sm:flex">
              <Button variant="outline" size="icon" aria-label="Anterior" onClick={() => scrollBy(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Próximo" onClick={() => scrollBy(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6"
          >
            {tracks.map((t) => (
              <article
                key={t.title}
                className="flex w-[80%] shrink-0 snap-center flex-col sm:w-[46%] lg:w-[31%]"
              >
                <div className="overflow-hidden rounded-2xl shadow-[var(--shadow-card)]">
                  <div className={`aspect-square w-full bg-gradient-to-br ${t.photo}`} aria-hidden="true" />
                  <div className={`h-1.5 w-full ${t.bar}`} aria-hidden="true" />
                  <div className="flex flex-col gap-3 bg-navy p-5 text-navy-foreground">
                    <div className="flex min-w-0 items-center gap-2">
                      <t.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                      <h3 className="min-w-0 text-sm font-bold uppercase tracking-wide">{t.title}</h3>
                    </div>
                    <div className="h-px w-full bg-navy-foreground/25" />
                    <p className="text-sm leading-relaxed text-navy-foreground/85">{t.description}</p>
                  </div>
                </div>
                <Link
                  to="/academy/$courseSlug"
                  params={{ courseSlug: t.slug }}
                  className="mt-3"
                >
                  <Button className="w-full rounded-full bg-navy text-navy-foreground hover:bg-navy/90">
                    Conhecer
                  </Button>
                </Link>

              </article>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground sm:hidden">
            <ChevronLeft className="h-4 w-4" />
            <PointerIcon className="h-5 w-5" />
            <ChevronRight className="h-4 w-4" />
            <span className="text-xs">arraste para o lado</span>
          </div>
        </section>

        {/* Explicação institucional */}
        <section className="bg-muted/40 px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 text-center text-xl font-bold text-royal sm:text-2xl">
              Por que escolher a Connect-Academy?
            </h2>
            <p className="text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              Nossa metodologia une teoria e prática desde o primeiro dia de aula. Com corpo docente formado por
              especialistas atuantes e infraestrutura inspirada nos grandes centros de saúde, preparamos o aluno para
              os desafios reais da profissão. Aqui, cada trilha de ensino é desenhada para acompanhar o estudante em
              cada fase da carreira — da formação técnica à vida profissional.
            </p>
            <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              Em breve você confere datas, investimentos, grade curricular e informações detalhadas de cada curso.
            </p>
          </div>
        </section>

        <section className="px-4 pb-16 text-center">
          <BackButton to="/" label="Voltar ao Connect-Med" className="mx-auto" />
        </section>
      </main>
    </div>
  );
}
