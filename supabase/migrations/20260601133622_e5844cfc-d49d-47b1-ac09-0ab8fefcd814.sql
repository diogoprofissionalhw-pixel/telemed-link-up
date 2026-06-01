
ALTER TABLE public.networks
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS description text;

DROP VIEW IF EXISTS public.networks_public;

CREATE VIEW public.networks_public
WITH (security_invoker=on) AS
SELECT
  id,
  network_name,
  city,
  state,
  avatar_url,
  is_verified,
  cnpj_activity,
  linkedin_url,
  website_url,
  description,
  created_at
FROM public.networks;

GRANT SELECT ON public.networks_public TO anon, authenticated;
