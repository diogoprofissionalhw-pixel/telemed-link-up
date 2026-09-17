-- 1) Módulos dentro das trilhas
CREATE TABLE public.academy_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_modules TO anon, authenticated;
GRANT ALL ON public.academy_modules TO service_role;
ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Módulos publicados são públicos" ON public.academy_modules
  FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE TRIGGER academy_modules_updated_at BEFORE UPDATE ON public.academy_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Aulas passam a pertencer a um módulo + campos do resumo em PDF
ALTER TABLE public.academy_lessons
  ADD COLUMN module_id uuid REFERENCES public.academy_modules(id) ON DELETE SET NULL,
  ADD COLUMN summary text,
  ADD COLUMN summary_references text[] NOT NULL DEFAULT '{}',
  ADD COLUMN summary_images jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO public.academy_modules (course_id, title, description, position)
SELECT c.id, 'Módulo 1', 'Conteúdo inicial da trilha', 1
FROM public.academy_courses c;

UPDATE public.academy_lessons l
SET module_id = m.id
FROM public.academy_modules m
WHERE m.course_id = l.course_id AND l.module_id IS NULL;

CREATE INDEX academy_lessons_module_idx ON public.academy_lessons(module_id);

-- 3) Quizzes (conteúdo gerenciado só via server functions com a conta mestre)
CREATE TABLE public.academy_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('lesson', 'module')),
  lesson_id uuid REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Quiz',
  max_attempts integer NOT NULL DEFAULT 3,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX academy_quizzes_lesson_key ON public.academy_quizzes(lesson_id) WHERE lesson_id IS NOT NULL;
CREATE UNIQUE INDEX academy_quizzes_module_key ON public.academy_quizzes(module_id) WHERE module_id IS NOT NULL;
GRANT ALL ON public.academy_quizzes TO service_role;
ALTER TABLE public.academy_quizzes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER academy_quizzes_updated_at BEFORE UPDATE ON public.academy_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.academy_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.academy_quizzes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.academy_quiz_questions TO service_role;
ALTER TABLE public.academy_quiz_questions ENABLE ROW LEVEL SECURITY;

-- is_correct nunca é exposto ao cliente: sem GRANT para anon/authenticated.
CREATE TABLE public.academy_quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.academy_quiz_questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 1
);
GRANT ALL ON public.academy_quiz_options TO service_role;
ALTER TABLE public.academy_quiz_options ENABLE ROW LEVEL SECURITY;

-- 4) Progresso por aula e tentativas de quiz
CREATE TABLE public.academy_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  watched_seconds integer NOT NULL DEFAULT 0,
  percent integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE ON public.academy_lesson_progress TO authenticated;
GRANT ALL ON public.academy_lesson_progress TO service_role;
ALTER TABLE public.academy_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno vê seu progresso" ON public.academy_lesson_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Aluno cria seu progresso" ON public.academy_lesson_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Aluno atualiza seu progresso" ON public.academy_lesson_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER academy_lesson_progress_updated_at BEFORE UPDATE ON public.academy_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.academy_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL REFERENCES public.academy_quizzes(id) ON DELETE CASCADE,
  attempt_no integer NOT NULL DEFAULT 1,
  correct_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_quiz_attempts TO authenticated;
GRANT ALL ON public.academy_quiz_attempts TO service_role;
ALTER TABLE public.academy_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno vê suas tentativas" ON public.academy_quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5) Empresa parceira: alunos vinculados e trilha personalizada
CREATE TABLE public.academy_company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network_id, doctor_id)
);
GRANT SELECT, INSERT, DELETE ON public.academy_company_members TO authenticated;
GRANT ALL ON public.academy_company_members TO service_role;
ALTER TABLE public.academy_company_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa e aluno veem o vínculo" ON public.academy_company_members
  FOR SELECT TO authenticated USING (auth.uid() = network_id OR auth.uid() = doctor_id);
CREATE POLICY "Empresa vincula alunos" ON public.academy_company_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = network_id);
CREATE POLICY "Empresa remove vínculos" ON public.academy_company_members
  FOR DELETE TO authenticated USING (auth.uid() = network_id);

CREATE TABLE public.academy_company_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL UNIQUE REFERENCES public.networks(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Trilha da empresa',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.academy_company_tracks TO authenticated;
GRANT ALL ON public.academy_company_tracks TO service_role;
ALTER TABLE public.academy_company_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa e alunos vinculados veem a trilha" ON public.academy_company_tracks
  FOR SELECT TO authenticated USING (
    auth.uid() = network_id
    OR EXISTS (
      SELECT 1 FROM public.academy_company_members m
      WHERE m.network_id = academy_company_tracks.network_id AND m.doctor_id = auth.uid()
    )
  );
CREATE POLICY "Empresa cria sua trilha" ON public.academy_company_tracks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = network_id);
CREATE POLICY "Empresa edita sua trilha" ON public.academy_company_tracks
  FOR UPDATE TO authenticated USING (auth.uid() = network_id) WITH CHECK (auth.uid() = network_id);
CREATE TRIGGER academy_company_tracks_updated_at BEFORE UPDATE ON public.academy_company_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.academy_company_track_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.academy_company_tracks(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX academy_company_track_items_key
  ON public.academy_company_track_items(track_id, course_id, COALESCE(module_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, DELETE ON public.academy_company_track_items TO authenticated;
GRANT ALL ON public.academy_company_track_items TO service_role;
ALTER TABLE public.academy_company_track_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa e alunos vinculados veem os itens" ON public.academy_company_track_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.academy_company_tracks t
      WHERE t.id = academy_company_track_items.track_id
        AND (
          t.network_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.academy_company_members m
            WHERE m.network_id = t.network_id AND m.doctor_id = auth.uid()
          )
        )
    )
  );
CREATE POLICY "Empresa adiciona itens" ON public.academy_company_track_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.academy_company_tracks t WHERE t.id = track_id AND t.network_id = auth.uid())
  );
CREATE POLICY "Empresa remove itens" ON public.academy_company_track_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.academy_company_tracks t WHERE t.id = track_id AND t.network_id = auth.uid())
  );