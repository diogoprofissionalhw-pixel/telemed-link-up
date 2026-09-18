ALTER TABLE public.academy_company_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

ALTER TABLE public.academy_company_members
  DROP CONSTRAINT IF EXISTS academy_company_members_status_check;
ALTER TABLE public.academy_company_members
  ADD CONSTRAINT academy_company_members_status_check CHECK (status IN ('pending', 'accepted'));

GRANT UPDATE ON public.academy_company_members TO authenticated;

DROP POLICY IF EXISTS "Aluno responde convite" ON public.academy_company_members;
CREATE POLICY "Aluno responde convite" ON public.academy_company_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);