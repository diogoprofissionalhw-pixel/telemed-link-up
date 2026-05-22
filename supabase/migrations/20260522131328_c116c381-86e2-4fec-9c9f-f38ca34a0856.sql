ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_since timestamptz,
  ADD COLUMN IF NOT EXISTS premium_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_doctors_is_premium ON public.doctors (is_premium);