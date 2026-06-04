
-- Switch public views to security_definer (security_invoker=off) so they don't depend
-- on the caller (anon/authenticated) having SELECT on the underlying base tables.
-- Views only expose non-sensitive columns; sensitive data remains protected by RLS on base tables.

ALTER VIEW public.doctors_public SET (security_invoker = off);
ALTER VIEW public.networks_public SET (security_invoker = off);

-- Ensure the Data API can reach the views for both anon and authenticated.
GRANT SELECT ON public.doctors_public TO anon, authenticated;
GRANT SELECT ON public.networks_public TO anon, authenticated;
