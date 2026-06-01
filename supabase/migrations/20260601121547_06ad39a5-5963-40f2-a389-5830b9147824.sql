
-- 1) Restrict direct SELECT on public.doctors to the doctor themselves.
--    Public listings/queries must go through the public.doctors_public view
--    (which excludes CPF, email, phone, bank details, document URLs, etc.).
DROP POLICY IF EXISTS doctors_select_authenticated ON public.doctors;
DROP POLICY IF EXISTS doctors_select_public ON public.doctors;

CREATE POLICY doctors_select_self
  ON public.doctors
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2) Lock down SECURITY DEFINER functions that should only run from
--    triggers or scheduled jobs (not callable via the API).
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_shift_reminders()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_finalize_shifts()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_request_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_message()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_direct_message()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_validate_crm()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_doctor_public_id()      FROM PUBLIC, anon, authenticated;

-- 3) Make the 'cvs' storage bucket private and replace the public read
--    policy with an owner-only policy. CV PDFs must be served via short-lived
--    signed URLs from now on.
UPDATE storage.buckets SET public = false WHERE id = 'cvs';

DROP POLICY IF EXISTS cvs_public_read ON storage.objects;

CREATE POLICY cvs_owner_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
