-- Harden public exposure of networks: ensure only safe columns are readable
REVOKE SELECT ON public.networks FROM anon, authenticated;

REVOKE SELECT (cnpj, legal_name, address, cnae_code, cnpj_verified_at, qualification_status, qualified_at)
  ON public.networks FROM anon, authenticated;

GRANT SELECT (id, network_name, created_at, avatar_url, is_verified, cnpj_activity, city, state, linkedin_url, website_url, description)
  ON public.networks TO anon, authenticated;

-- Make the public policy explicit about its intent (column privileges enforce the safe subset)
DROP POLICY IF EXISTS networks_select_public_safe ON public.networks;
CREATE POLICY networks_select_public_safe
  ON public.networks
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON POLICY networks_select_public_safe ON public.networks IS
  'Public directory read. Sensitive columns (cnpj, legal_name, address, cnae_code, verification/qualification fields) are NOT granted to anon/authenticated; owners read them via public.get_my_network().';
