
-- Certifications
CREATE TABLE public.doctor_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT,
  issued_year INTEGER,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_select_auth" ON public.doctor_certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "cert_insert_self" ON public.doctor_certifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "cert_update_self" ON public.doctor_certifications FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "cert_delete_self" ON public.doctor_certifications FOR DELETE TO authenticated USING (auth.uid() = doctor_id);
CREATE INDEX idx_cert_doctor ON public.doctor_certifications(doctor_id);

-- Courses
CREATE TABLE public.doctor_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  title TEXT NOT NULL,
  institution TEXT,
  hours INTEGER,
  completed_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_select_auth" ON public.doctor_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "course_insert_self" ON public.doctor_courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "course_update_self" ON public.doctor_courses FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "course_delete_self" ON public.doctor_courses FOR DELETE TO authenticated USING (auth.uid() = doctor_id);
CREATE INDEX idx_course_doctor ON public.doctor_courses(doctor_id);

-- Publications
CREATE TABLE public.doctor_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  title TEXT NOT NULL,
  journal TEXT,
  year INTEGER,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_select_auth" ON public.doctor_publications FOR SELECT TO authenticated USING (true);
CREATE POLICY "pub_insert_self" ON public.doctor_publications FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "pub_update_self" ON public.doctor_publications FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "pub_delete_self" ON public.doctor_publications FOR DELETE TO authenticated USING (auth.uid() = doctor_id);
CREATE INDEX idx_pub_doctor ON public.doctor_publications(doctor_id);

-- Multicriteria in ratings
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS punctuality SMALLINT CHECK (punctuality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS care_quality SMALLINT CHECK (care_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS communication SMALLINT CHECK (communication BETWEEN 1 AND 5);

-- Network qualification tags for doctors
CREATE TABLE public.network_doctor_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (network_id, doctor_id)
);
ALTER TABLE public.network_doctor_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ndt_select_self" ON public.network_doctor_tags FOR SELECT TO authenticated USING (auth.uid() = network_id OR auth.uid() = doctor_id);
CREATE POLICY "ndt_insert_self" ON public.network_doctor_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() = network_id);
CREATE POLICY "ndt_update_self" ON public.network_doctor_tags FOR UPDATE TO authenticated USING (auth.uid() = network_id);
CREATE POLICY "ndt_delete_self" ON public.network_doctor_tags FOR DELETE TO authenticated USING (auth.uid() = network_id);
CREATE INDEX idx_ndt_network ON public.network_doctor_tags(network_id);
CREATE INDEX idx_ndt_doctor ON public.network_doctor_tags(doctor_id);
CREATE TRIGGER trg_ndt_updated BEFORE UPDATE ON public.network_doctor_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
