-- Doctors: novos campos
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_agency TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS diploma_url TEXT,
  ADD COLUMN IF NOT EXISTS crm_document_url TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Experiências profissionais
CREATE TABLE IF NOT EXISTS public.doctor_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  role TEXT NOT NULL,
  institution TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp_select_auth" ON public.doctor_experiences FOR SELECT TO authenticated USING (true);
CREATE POLICY "exp_insert_self" ON public.doctor_experiences FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "exp_update_self" ON public.doctor_experiences FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "exp_delete_self" ON public.doctor_experiences FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- Disponibilidade semanal recorrente
CREATE TABLE IF NOT EXISTS public.doctor_weekly_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL UNIQUE,
  weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_weekly_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wavail_select_auth" ON public.doctor_weekly_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "wavail_insert_self" ON public.doctor_weekly_availability FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "wavail_update_self" ON public.doctor_weekly_availability FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "wavail_delete_self" ON public.doctor_weekly_availability FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- Bucket de documentos privados
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "docs_select_self" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "docs_insert_self" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "docs_update_self" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "docs_delete_self" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;