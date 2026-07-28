ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS cfm text,
  ADD COLUMN IF NOT EXISTS cfm_uf text;