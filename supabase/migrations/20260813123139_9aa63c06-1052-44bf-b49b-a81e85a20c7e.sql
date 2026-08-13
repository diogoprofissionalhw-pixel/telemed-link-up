DROP POLICY IF EXISTS ndt_select_self ON public.network_doctor_tags;
CREATE POLICY ndt_select_self ON public.network_doctor_tags FOR SELECT TO authenticated USING (auth.uid() = network_id);

DROP POLICY IF EXISTS docs_select_self ON storage.objects;
DROP POLICY IF EXISTS docs_insert_self ON storage.objects;
DROP POLICY IF EXISTS docs_update_self ON storage.objects;
DROP POLICY IF EXISTS docs_delete_self ON storage.objects;

CREATE POLICY docs_select_self ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1] AND array_length(storage.foldername(name), 1) = 1 AND owner = auth.uid());

CREATE POLICY docs_insert_self ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1] AND array_length(storage.foldername(name), 1) = 1 AND owner = auth.uid());

CREATE POLICY docs_update_self ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1] AND owner = auth.uid())
WITH CHECK (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1] AND array_length(storage.foldername(name), 1) = 1 AND owner = auth.uid());

CREATE POLICY docs_delete_self ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1] AND owner = auth.uid());