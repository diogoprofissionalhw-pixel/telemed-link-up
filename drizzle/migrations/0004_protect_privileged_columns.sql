CREATE OR REPLACE FUNCTION public.protect_doctor_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin','supabase_auth_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.crm_status = 'verified' THEN NEW.crm_status := 'pending'; END IF;
    IF NEW.cfm_status = 'verified' THEN NEW.cfm_status := 'pending'; END IF;
    NEW.is_premium := false; NEW.premium_since := NULL; NEW.premium_until := NULL;
    NEW.identity_verified := false; NEW.identity_verified_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.crm_status = 'verified' AND OLD.crm_status IS DISTINCT FROM 'verified' THEN NEW.crm_status := OLD.crm_status; END IF;
  IF NEW.cfm_status = 'verified' AND OLD.cfm_status IS DISTINCT FROM 'verified' THEN NEW.cfm_status := OLD.cfm_status; END IF;
  IF NEW.is_premium AND NOT COALESCE(OLD.is_premium,false) THEN NEW.is_premium := OLD.is_premium; END IF;
  IF NEW.premium_since IS DISTINCT FROM OLD.premium_since THEN NEW.premium_since := OLD.premium_since; END IF;
  IF NEW.premium_until IS NOT NULL AND NEW.premium_until IS DISTINCT FROM OLD.premium_until THEN NEW.premium_until := OLD.premium_until; END IF;
  IF NEW.identity_verified IS DISTINCT FROM OLD.identity_verified THEN NEW.identity_verified := OLD.identity_verified; END IF;
  IF NEW.identity_verified_at IS DISTINCT FROM OLD.identity_verified_at THEN NEW.identity_verified_at := OLD.identity_verified_at; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_doctor_privileged ON public.doctors;
CREATE TRIGGER trg_protect_doctor_privileged BEFORE INSERT OR UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.protect_doctor_privileged_columns();

CREATE OR REPLACE FUNCTION public.protect_network_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin','supabase_auth_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_verified := false; NEW.cnpj_verified_at := NULL; NEW.qualified_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN NEW.is_verified := OLD.is_verified; END IF;
  IF NEW.cnpj_verified_at IS DISTINCT FROM OLD.cnpj_verified_at THEN NEW.cnpj_verified_at := OLD.cnpj_verified_at; END IF;
  IF NEW.cnpj_activity IS DISTINCT FROM OLD.cnpj_activity THEN NEW.cnpj_activity := OLD.cnpj_activity; END IF;
  IF NEW.qualification_status IS DISTINCT FROM OLD.qualification_status THEN NEW.qualification_status := OLD.qualification_status; END IF;
  IF NEW.qualified_at IS DISTINCT FROM OLD.qualified_at THEN NEW.qualified_at := OLD.qualified_at; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_network_privileged ON public.networks;
CREATE TRIGGER trg_protect_network_privileged BEFORE INSERT OR UPDATE ON public.networks
FOR EACH ROW EXECUTE FUNCTION public.protect_network_privileged_columns();