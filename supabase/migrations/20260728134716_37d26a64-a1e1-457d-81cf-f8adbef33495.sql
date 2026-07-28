-- Remove full-table read access and grant only non-sensitive columns
REVOKE SELECT ON public.networks FROM anon, authenticated;

GRANT SELECT (
  id, network_name, city, state, avatar_url, is_verified,
  cnpj_activity, linkedin_url, website_url, description, created_at
) ON public.networks TO anon, authenticated;

GRANT ALL ON public.networks TO service_role;

-- Public/authenticated read of safe columns only (column privileges enforce the rest)
DROP POLICY IF EXISTS networks_select_public_safe ON public.networks;
CREATE POLICY networks_select_public_safe
  ON public.networks FOR SELECT
  TO anon, authenticated
  USING (true);
