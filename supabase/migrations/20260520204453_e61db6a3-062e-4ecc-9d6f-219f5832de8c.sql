
-- 1. Networks: verification fields
ALTER TABLE public.networks
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cnpj_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS cnpj_activity text;

-- 2. Doctors: public_id + identity verification
CREATE SEQUENCE IF NOT EXISTS public.doctor_public_id_seq START 8800;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS public_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS identity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS id_document_url text;

CREATE OR REPLACE FUNCTION public.assign_doctor_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := nextval('public.doctor_public_id_seq')::text;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_doctor_public_id ON public.doctors;
CREATE TRIGGER trg_assign_doctor_public_id
BEFORE INSERT ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.assign_doctor_public_id();

-- Backfill existing rows
UPDATE public.doctors SET public_id = nextval('public.doctor_public_id_seq')::text WHERE public_id IS NULL;

-- 3. Helper: is the current user a verified network?
CREATE OR REPLACE FUNCTION public.is_verified_network(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.networks WHERE id = _uid AND is_verified = true);
$$;
