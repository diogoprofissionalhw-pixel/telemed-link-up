CREATE OR REPLACE VIEW public.doctors_directory AS
SELECT d.id, d.public_id, d.specialty, d.specialties, d.crm, d.crm_uf, d.crm_status,
       d.avatar_url, d.headline, d.bio, d.years_experience, d.consultation_fee,
       d.city, d.state, d.country, d.languages, d.education, d.certifications,
       d.medical_experience, d.linkedin_url, d.lattes_url, d.is_premium,
       d.identity_verified, d.created_at, d.timezone, p.full_name
FROM public.doctors d
LEFT JOIN public.profiles p ON p.id = d.id;

ALTER VIEW public.doctors_directory SET (security_invoker = off);
REVOKE ALL ON public.doctors_directory FROM anon;
GRANT SELECT ON public.doctors_directory TO authenticated;
GRANT ALL ON public.doctors_directory TO service_role;