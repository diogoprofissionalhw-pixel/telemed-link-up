DROP POLICY IF EXISTS networks_select_authenticated_safe ON public.networks;

CREATE POLICY networks_select_own
ON public.networks
FOR SELECT
TO authenticated
USING (auth.uid() = id);

GRANT SELECT ON public.networks TO authenticated;

CREATE OR REPLACE FUNCTION public.networks_directory()
RETURNS TABLE(
  id uuid,
  network_name text,
  city text,
  state text,
  avatar_url text,
  is_verified boolean,
  cnpj_activity text,
  linkedin_url text,
  website_url text,
  description text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT n.id, n.network_name, n.city, n.state, n.avatar_url, n.is_verified,
         n.cnpj_activity, n.linkedin_url, n.website_url, n.description, n.created_at
  FROM public.networks n
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.networks_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.networks_directory() TO authenticated, service_role;