DROP POLICY IF EXISTS networks_update_self ON public.networks;
CREATE POLICY networks_update_self ON public.networks
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);