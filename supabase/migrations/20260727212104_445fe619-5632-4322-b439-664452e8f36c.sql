DROP FUNCTION IF EXISTS public.doctors_directory();

CREATE OR REPLACE FUNCTION public.doctors_directory()
 RETURNS TABLE(id uuid, public_id text, specialty text, specialties text[], crm text, crm_uf text, crm_status crm_status, avatar_url text, headline text, bio text, years_experience integer, consultation_fee numeric, city text, state text, country text, languages text, education text, certifications text, medical_experience text, linkedin_url text, lattes_url text, is_premium boolean, identity_verified boolean, created_at timestamp with time zone, timezone text, full_name text, cv_pdf_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, d.public_id, d.specialty, d.specialties, d.crm, d.crm_uf, d.crm_status,
         d.avatar_url, d.headline, d.bio, d.years_experience, d.consultation_fee,
         d.city, d.state, d.country, d.languages, d.education, d.certifications,
         d.medical_experience, d.linkedin_url, d.lattes_url, d.is_premium,
         d.identity_verified, d.created_at, d.timezone, p.full_name, d.cv_pdf_url
  FROM public.doctors d
  LEFT JOIN public.profiles p ON p.id = d.id
  WHERE auth.uid() IS NOT NULL;
$function$;

REVOKE EXECUTE ON FUNCTION public.doctors_directory() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.doctors_directory() TO authenticated;