
CREATE OR REPLACE VIEW public.networks_public
WITH (security_invoker = on) AS
SELECT id, network_name, city, state, avatar_url, is_verified, cnpj_activity, created_at
FROM public.networks;

GRANT SELECT ON public.networks_public TO anon, authenticated;

DROP POLICY IF EXISTS networks_select_public_basic ON public.networks;
CREATE POLICY networks_select_public_basic ON public.networks
  FOR SELECT TO anon
  USING (true);
