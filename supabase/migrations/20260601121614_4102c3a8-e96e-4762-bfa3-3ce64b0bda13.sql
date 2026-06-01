
ALTER VIEW public.doctors_public SET (security_invoker = on);

REVOKE EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_verified_network(uuid)      FROM PUBLIC, anon;
