-- 1) Trigger functions must not be directly callable
REVOKE ALL ON FUNCTION public.ratings_prevent_immutable_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ratings_prevent_immutable_changes() FROM anon;
REVOKE ALL ON FUNCTION public.ratings_prevent_immutable_changes() FROM authenticated;
REVOKE ALL ON FUNCTION public.shift_requests_restrict_updates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shift_requests_restrict_updates() FROM anon;
REVOKE ALL ON FUNCTION public.shift_requests_restrict_updates() FROM authenticated;

-- 2) networks: column-level restriction so CNPJ / legal_name / address are never public
REVOKE SELECT ON public.networks FROM anon;
REVOKE SELECT ON public.networks FROM authenticated;
GRANT SELECT (
  id, network_name, city, state, avatar_url, is_verified,
  cnpj_activity, qualification_status, qualified_at,
  linkedin_url, website_url, description, created_at
) ON public.networks TO anon;
GRANT SELECT (
  id, network_name, city, state, avatar_url, is_verified,
  cnpj_activity, qualification_status, qualified_at,
  linkedin_url, website_url, description, created_at
) ON public.networks TO authenticated;
GRANT ALL ON public.networks TO service_role;

-- 3) Replace SECURITY DEFINER view with an authenticated-only function
DROP VIEW IF EXISTS public.doctors_directory;

CREATE OR REPLACE FUNCTION public.doctors_directory()
RETURNS TABLE (
  id uuid,
  public_id text,
  specialty text,
  specialties text[],
  crm text,
  crm_uf text,
  crm_status public.crm_status,
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
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.public_id, d.specialty, d.specialties, d.crm, d.crm_uf, d.crm_status,
         d.avatar_url, d.headline, d.bio, d.years_experience, d.consultation_fee,
         d.city, d.state, d.country, d.languages, d.education, d.certifications,
         d.medical_experience, d.linkedin_url, d.lattes_url, d.is_premium,
         d.identity_verified, d.created_at, d.timezone, p.full_name
  FROM public.doctors d
  LEFT JOIN public.profiles p ON p.id = d.id
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.doctors_directory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.doctors_directory() FROM anon;
GRANT EXECUTE ON FUNCTION public.doctors_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.doctors_directory() TO service_role;