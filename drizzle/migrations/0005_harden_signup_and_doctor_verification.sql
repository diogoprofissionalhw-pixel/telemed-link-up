CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  acct account_type := COALESCE((meta->>'account_type')::account_type, 'doctor');
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (NEW.id, COALESCE(meta->>'full_name', 'Usuário'), acct)
  ON CONFLICT (id) DO NOTHING;

  IF acct = 'doctor' THEN
    INSERT INTO public.doctors (id, crm, crm_uf, specialty, cpf, city, state, country, email,
      crm_status, cfm_status, identity_verified, identity_verified_at, is_premium)
    VALUES (NEW.id, COALESCE(meta->>'crm',''), COALESCE(meta->>'crm_uf',''), COALESCE(meta->>'specialty',''),
      meta->>'cpf', meta->>'city', meta->>'state', COALESCE(meta->>'country','Brasil'), NEW.email,
      'pending', 'pending', false, NULL, false)
    ON CONFLICT (id) DO NOTHING;
  ELSIF acct = 'network' THEN
    INSERT INTO public.networks (id, network_name, cnpj, legal_name, address, city, state,
      cnae_code, cnpj_activity, is_verified, cnpj_verified_at, qualification_status, qualified_at)
    VALUES (NEW.id, COALESCE(meta->>'network_name','Rede'), COALESCE(meta->>'cnpj',''),
      meta->>'legal_name', meta->>'address', meta->>'city', meta->>'state',
      meta->>'cnae_code', meta->>'cnpj_activity', false, NULL, 'pending', NULL)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

-- Column-level privilege: clients cannot write verification columns at all.
REVOKE UPDATE (cfm_status, crm_status, identity_verified, identity_verified_at, is_premium, premium_since, premium_until) ON public.doctors FROM authenticated, anon;
REVOKE INSERT (cfm_status, crm_status, identity_verified, identity_verified_at, is_premium, premium_since, premium_until) ON public.doctors FROM authenticated, anon;
REVOKE UPDATE (is_verified, cnpj_verified_at, qualification_status, qualified_at) ON public.networks FROM authenticated, anon;
REVOKE INSERT (is_verified, cnpj_verified_at, qualification_status, qualified_at) ON public.networks FROM authenticated, anon;