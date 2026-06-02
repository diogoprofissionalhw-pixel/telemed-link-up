-- Recria a função handle_new_user para também gravar qualified_at quando a rede vier qualificada.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  acct account_type := COALESCE((meta->>'account_type')::account_type, 'doctor');
  qstatus text := COALESCE(meta->>'qualification_status', 'pending');
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(meta->>'full_name', 'Usuário'),
    acct
  )
  ON CONFLICT (id) DO NOTHING;

  IF acct = 'doctor' THEN
    INSERT INTO public.doctors (
      id, crm, crm_uf, specialty, cpf, city, state, country, email
    ) VALUES (
      NEW.id,
      COALESCE(meta->>'crm', ''),
      COALESCE(meta->>'crm_uf', ''),
      COALESCE(meta->>'specialty', ''),
      meta->>'cpf',
      meta->>'city',
      meta->>'state',
      COALESCE(meta->>'country', 'Brasil'),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  ELSIF acct = 'network' THEN
    INSERT INTO public.networks (
      id, network_name, cnpj, legal_name, address, city, state,
      cnae_code, cnpj_activity, is_verified, cnpj_verified_at,
      qualification_status, qualified_at
    ) VALUES (
      NEW.id,
      COALESCE(meta->>'network_name', 'Rede'),
      COALESCE(meta->>'cnpj', ''),
      meta->>'legal_name',
      meta->>'address',
      meta->>'city',
      meta->>'state',
      meta->>'cnae_code',
      meta->>'cnpj_activity',
      COALESCE((meta->>'is_verified')::boolean, false),
      CASE WHEN meta ? 'cnpj_verified_at' THEN (meta->>'cnpj_verified_at')::timestamptz ELSE NULL END,
      qstatus,
      CASE WHEN qstatus IN ('qualified','unqualified') THEN now() ELSE NULL END
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END $function$;

-- Garante o gatilho em auth.users (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();