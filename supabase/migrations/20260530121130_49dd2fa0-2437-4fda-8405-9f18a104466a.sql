
-- =====================================================================
-- 1) DOCTORS: hide sensitive PII from anonymous users
-- =====================================================================
-- Public-safe view (excludes cpf, email, phone, whatsapp, pix_*, bank_*,
-- *_document_url, selfie_url). Uses SECURITY DEFINER (security_invoker=off)
-- so that anon can read only the projected columns, while the base table
-- becomes inaccessible to anon.
DROP VIEW IF EXISTS public.doctors_public;
CREATE VIEW public.doctors_public
WITH (security_invoker = off) AS
SELECT
  d.id,
  d.public_id,
  d.specialty,
  d.specialties,
  d.crm,
  d.crm_uf,
  d.crm_status,
  d.avatar_url,
  d.headline,
  d.bio,
  d.years_experience,
  d.consultation_fee,
  d.city,
  d.state,
  d.country,
  d.languages,
  d.education,
  d.certifications,
  d.medical_experience,
  d.linkedin_url,
  d.lattes_url,
  d.is_premium,
  d.premium_since,
  d.premium_until,
  d.identity_verified,
  d.identity_verified_at,
  d.created_at,
  d.cv_pdf_url,
  d.timezone,
  d.payment_method,
  p.full_name
FROM public.doctors d
LEFT JOIN public.profiles p ON p.id = d.id;

ALTER VIEW public.doctors_public OWNER TO postgres;
GRANT SELECT ON public.doctors_public TO anon, authenticated;

-- Replace the over-permissive SELECT policy on the base table:
-- - drop anon access
-- - keep authenticated access (RLS still applies for all other CRUD)
DROP POLICY IF EXISTS doctors_select_public ON public.doctors;
CREATE POLICY doctors_select_authenticated
  ON public.doctors
  FOR SELECT
  TO authenticated
  USING (true);

-- Revoke anon SELECT on the base table (was implicitly granted)
REVOKE SELECT ON public.doctors FROM anon;

-- =====================================================================
-- 2) NOTIFICATIONS: prevent users from inserting notifications for others
-- =====================================================================
-- The DB triggers (notify_*) are SECURITY DEFINER and bypass RLS, so they
-- continue to work. Direct client inserts must target only the current user.
DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_self
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 3) REALTIME: block broadcast/presence subscriptions
-- =====================================================================
-- The app only uses postgres_changes (which already respects RLS on the
-- underlying tables). Lock down realtime.messages so no client can use
-- Broadcast or Presence channels.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_deny_all_select" ON realtime.messages;
CREATE POLICY "realtime_deny_all_select"
  ON realtime.messages
  FOR SELECT
  TO authenticated, anon
  USING (false);

DROP POLICY IF EXISTS "realtime_deny_all_insert" ON realtime.messages;
CREATE POLICY "realtime_deny_all_insert"
  ON realtime.messages
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);
