CREATE OR REPLACE FUNCTION public.is_network(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.networks WHERE id = _uid);
$$;
REVOKE EXECUTE ON FUNCTION public.is_network(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_network(uuid) TO authenticated;

DROP POLICY IF EXISTS course_select_auth ON public.doctor_courses;
CREATE POLICY course_select_scoped ON public.doctor_courses FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR public.is_network(auth.uid()));
DROP POLICY IF EXISTS pub_select_auth ON public.doctor_publications;
CREATE POLICY pub_select_scoped ON public.doctor_publications FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR public.is_network(auth.uid()));
DROP POLICY IF EXISTS exp_select_auth ON public.doctor_experiences;
CREATE POLICY exp_select_scoped ON public.doctor_experiences FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR public.is_network(auth.uid()));
DROP POLICY IF EXISTS cert_select_auth ON public.doctor_certifications;
CREATE POLICY cert_select_scoped ON public.doctor_certifications FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR public.is_network(auth.uid()));
DROP POLICY IF EXISTS wavail_select_auth ON public.doctor_weekly_availability;
CREATE POLICY wavail_select_scoped ON public.doctor_weekly_availability FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR public.is_network(auth.uid()));
DROP POLICY IF EXISTS availabilities_select_authenticated ON public.doctor_availabilities;
CREATE POLICY availabilities_select_scoped ON public.doctor_availabilities FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR public.is_network(auth.uid()));

DROP POLICY IF EXISTS ratings_select_public ON public.ratings;
CREATE POLICY ratings_select_scoped ON public.ratings FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR auth.uid() = network_id OR public.is_network(auth.uid()));

DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.is_network(auth.uid())
    OR public.is_network(id)
    OR EXISTS (SELECT 1 FROM public.direct_messages dm
               WHERE (dm.sender_id = auth.uid() AND dm.recipient_id = profiles.id)
                  OR (dm.recipient_id = auth.uid() AND dm.sender_id = profiles.id))
  );

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_owner_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = (select auth.uid()::text));