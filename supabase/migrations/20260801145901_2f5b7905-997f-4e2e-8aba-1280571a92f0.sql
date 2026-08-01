DROP VIEW IF EXISTS public.networks_public;
CREATE VIEW public.networks_public
WITH (security_invoker = on) AS
  SELECT id, network_name, city, state, avatar_url, is_verified,
         cnpj_activity, linkedin_url, website_url, description, created_at
  FROM public.networks;

REVOKE ALL ON public.networks_public FROM anon;
GRANT SELECT ON public.networks_public TO authenticated;
GRANT ALL ON public.networks_public TO service_role;