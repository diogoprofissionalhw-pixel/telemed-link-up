ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS medical_experience TEXT,
  ADD COLUMN IF NOT EXISTS lattes_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;