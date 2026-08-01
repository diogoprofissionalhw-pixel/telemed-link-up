-- Public reads move to the safe view only; base table becomes authenticated-only
DROP POLICY IF EXISTS networks_select_public_safe ON public.networks;

CREATE POLICY networks_select_authenticated_safe
  ON public.networks
  FOR SELECT
  TO authenticated
  USING (true);

-- Remove all anon access to the base table
REVOKE ALL ON public.networks FROM anon;

-- Recreate the public view bypassing RLS, exposing only non-sensitive columns
DROP VIEW IF EXISTS public.networks_public;
CREATE VIEW public.networks_public
WITH (security_invoker = off) AS
  SELECT id, network_name, city, state, avatar_url, is_verified,
         cnpj_activity, linkedin_url, website_url, description, created_at
  FROM public.networks;

ALTER VIEW public.networks_public OWNER TO postgres;
GRANT SELECT ON public.networks_public TO anon, authenticated;