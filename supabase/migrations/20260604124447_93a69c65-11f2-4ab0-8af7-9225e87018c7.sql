
-- 1) Make public views respect caller's RLS (fixes "Security Definer View" linter)
ALTER VIEW public.networks_public SET (security_invoker = on);
ALTER VIEW public.doctors_public SET (security_invoker = on);

-- 2) Restrict sensitive columns on networks to the owner via column-level GRANTs.
DROP POLICY IF EXISTS networks_select_anon_basic ON public.networks;
DROP POLICY IF EXISTS networks_select_authenticated ON public.networks;

CREATE POLICY networks_select_public_safe ON public.networks
  FOR SELECT TO anon, authenticated USING (true);

REVOKE SELECT ON public.networks FROM anon, authenticated;
GRANT SELECT (
  id, network_name, city, state, avatar_url, is_verified, cnpj_activity,
  linkedin_url, website_url, description, created_at, qualification_status, qualified_at
) ON public.networks TO anon, authenticated;

-- Owner reads full row via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.get_my_network()
RETURNS public.networks
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.networks WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_network() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_network() TO authenticated;

-- 3) Ratings: add WITH CHECK and immutable-field trigger
DROP POLICY IF EXISTS ratings_update_network ON public.ratings;
CREATE POLICY ratings_update_network ON public.ratings
  FOR UPDATE TO authenticated
  USING (auth.uid() = network_id)
  WITH CHECK (auth.uid() = network_id);

CREATE OR REPLACE FUNCTION public.ratings_prevent_immutable_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.network_id IS DISTINCT FROM OLD.network_id
     OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id THEN
    RAISE EXCEPTION 'Cannot modify network_id, doctor_id, or request_id on ratings';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ratings_prevent_immutable ON public.ratings;
CREATE TRIGGER trg_ratings_prevent_immutable
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.ratings_prevent_immutable_changes();

-- 4) shift_requests: add WITH CHECK and column-restriction trigger by role
DROP POLICY IF EXISTS requests_update_doctor_response ON public.shift_requests;
CREATE POLICY requests_update_doctor_response ON public.shift_requests
  FOR UPDATE TO authenticated
  USING ((auth.uid() = doctor_id) OR (auth.uid() = network_id))
  WITH CHECK ((auth.uid() = doctor_id) OR (auth.uid() = network_id));

CREATE OR REPLACE FUNCTION public.shift_requests_restrict_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Always immutable
  IF NEW.network_id IS DISTINCT FROM OLD.network_id
     OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify network_id, doctor_id, or created_at on shift_requests';
  END IF;

  -- Doctor (not network) can only update response-related fields
  IF uid IS NOT NULL AND uid = OLD.doctor_id AND uid <> OLD.network_id THEN
    IF NEW.shift_date IS DISTINCT FROM OLD.shift_date
       OR NEW.start_time IS DISTINCT FROM OLD.start_time
       OR NEW.end_time IS DISTINCT FROM OLD.end_time
       OR NEW.duration_hours IS DISTINCT FROM OLD.duration_hours
       OR NEW.shift_period IS DISTINCT FROM OLD.shift_period
       OR NEW.agreed_value IS DISTINCT FROM OLD.agreed_value
       OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Doctors cannot modify shift scheduling, value, or notes fields';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_shift_requests_restrict_updates ON public.shift_requests;
CREATE TRIGGER trg_shift_requests_restrict_updates
  BEFORE UPDATE ON public.shift_requests
  FOR EACH ROW EXECUTE FUNCTION public.shift_requests_restrict_updates();
