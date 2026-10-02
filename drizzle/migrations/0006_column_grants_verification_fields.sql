DO $$
DECLARE cols text;
BEGIN
  REVOKE INSERT, UPDATE ON public.doctors FROM authenticated, anon;
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols FROM information_schema.columns
   WHERE table_schema='public' AND table_name='doctors'
     AND column_name NOT IN ('cfm_status','crm_status','identity_verified','identity_verified_at','is_premium','premium_since','premium_until');
  EXECUTE format('GRANT INSERT (%s), UPDATE (%s) ON public.doctors TO authenticated', cols, cols);

  REVOKE INSERT, UPDATE ON public.networks FROM authenticated, anon;
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols FROM information_schema.columns
   WHERE table_schema='public' AND table_name='networks'
     AND column_name NOT IN ('is_verified','cnpj_verified_at','qualification_status','qualified_at','cnpj_activity');
  EXECUTE format('GRANT INSERT (%s), UPDATE (%s) ON public.networks TO authenticated', cols, cols);
END $$;