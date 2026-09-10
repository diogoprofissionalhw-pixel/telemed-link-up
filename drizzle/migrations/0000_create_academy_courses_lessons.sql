CREATE TABLE public.academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  accent text NOT NULL DEFAULT 'bg-cat-orange',
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  is_intro boolean NOT NULL DEFAULT false,
  duration_seconds integer,
  source_type text NOT NULL DEFAULT 'url',
  video_url text,
  video_path text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_lessons_source_type_check CHECK (source_type IN ('url','upload'))
);

CREATE INDEX academy_lessons_course_idx ON public.academy_lessons(course_id, position);

GRANT SELECT ON public.academy_courses TO anon, authenticated;
GRANT SELECT ON public.academy_lessons TO anon, authenticated;
GRANT ALL ON public.academy_courses TO service_role;
GRANT ALL ON public.academy_lessons TO service_role;

ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses are readable" ON public.academy_courses
  FOR SELECT TO anon, authenticated USING (is_published = true);

CREATE POLICY "Published lessons are readable" ON public.academy_lessons
  FOR SELECT TO anon, authenticated USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM public.academy_courses c WHERE c.id = course_id AND c.is_published = true)
  );

CREATE TRIGGER trg_academy_courses_updated BEFORE UPDATE ON public.academy_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_academy_lessons_updated BEFORE UPDATE ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.academy_courses (slug, title, description, accent, position) VALUES
  ('ensino-medio-tecnico','Ensino Médio Técnico','Educação da base curricular do MEC e sólida formação técnica na área da saúde.','bg-cat-orange',1),
  ('curso-tecnico','Curso Técnico','As melhores metodologias e estrutura voltadas para a prática e a empregabilidade.','bg-cat-purple',2),
  ('pos-graduacao','Pós-Graduação','Tradição e pioneirismo junto com as mais modernas práticas em saúde.','bg-cat-sky',3),
  ('residencia-e-aprimoramento','Residência e Aprimoramento','Aprendizado em serviço, com estrutura de ponta e supervisão dos melhores especialistas.','bg-cat-green',4),
  ('cursos-de-atualizacao','Cursos de Atualização','Experiências inovadoras para aprimorar habilidades em diversas áreas.','bg-cat-lime',5),
  ('comunidade-e-mentoria','Comunidade e Mentoria','Conteúdo em alta transformação e conhecimento compartilhado entre profissionais.','bg-cat-gold',6),
  ('preparatorio-residencia','Preparatório Residência','Curso preparatório para conquistar vagas nas melhores residências médicas.','bg-cat-navy',7);