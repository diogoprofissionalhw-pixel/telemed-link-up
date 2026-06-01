
-- Drop the SECURITY DEFINER view (linter ERROR)
DROP VIEW IF EXISTS public.networks_public;

-- Use a security_invoker view (default & safe)
CREATE VIEW public.networks_public
WITH (security_invoker = on) AS
SELECT id, network_name, city, state, avatar_url, is_verified, cnpj_activity, created_at
FROM public.networks;

GRANT SELECT ON public.networks_public TO anon, authenticated;

-- Allow anon to SELECT rows from networks (RLS)
CREATE POLICY networks_select_anon_basic ON public.networks
  FOR SELECT TO anon
  USING (true);

-- Revoke anon's table-level SELECT, then grant only safe columns
REVOKE SELECT ON public.networks FROM anon;
GRANT SELECT (id, network_name, city, state, avatar_url, is_verified, cnpj_activity, created_at)
  ON public.networks TO anon;
