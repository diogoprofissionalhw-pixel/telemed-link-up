DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfm_status') THEN
    CREATE TYPE public.cfm_status AS ENUM ('verified', 'pending', 'invalid');
  END IF;
END $$;

ALTER TABLE public.doctors
ADD COLUMN IF NOT EXISTS cfm_status public.cfm_status NOT NULL DEFAULT 'pending';

DROP FUNCTION IF EXISTS public.doctors_directory();

CREATE OR REPLACE FUNCTION public.doctors_directory()
 RETURNS TABLE(
   id uuid,
   public_id text,
   specialty text,
   specialties text[],
   crm text,
   crm_uf text,
   crm_status public.crm_status,
   cfm_status public.cfm_status,
   avatar_url text,
   headline text,
   bio text,
   years_experience integer,
   consultation_fee numeric,
   city text,
   state text,
   country text,
   languages text,
   education text,
   certifications text,
   medical_experience text,
   linkedin_url text,
   lattes_url text,
   is_premium boolean,
   identity_verified boolean,
   created_at timestamptz,
   timezone text,
   full_name text,
   cv_pdf_url text
 )
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT d.id, d.public_id, d.specialty, d.specialties, d.crm, d.crm_uf, d.crm_status, d.cfm_status,
         d.avatar_url, d.headline, d.bio, d.years_experience, d.consultation_fee,
         d.city, d.state, d.country, d.languages, d.education, d.certifications,
         d.medical_experience, d.linkedin_url, d.lattes_url, d.is_premium,
         d.identity_verified, d.created_at, d.timezone, p.full_name, d.cv_pdf_url
  FROM public.doctors d
  LEFT JOIN public.profiles p ON p.id = d.id
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.doctors_directory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.doctors_directory() FROM anon;
GRANT EXECUTE ON FUNCTION public.doctors_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.doctors_directory() TO service_role;