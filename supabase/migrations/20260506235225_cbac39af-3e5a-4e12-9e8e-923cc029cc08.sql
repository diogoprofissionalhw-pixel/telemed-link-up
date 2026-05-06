-- Allow anonymous (public) read access for the doctors directory on the landing page

-- Doctors
DROP POLICY IF EXISTS doctors_select_authenticated ON public.doctors;
CREATE POLICY doctors_select_public
  ON public.doctors FOR SELECT
  TO anon, authenticated
  USING (true);

-- Profiles (needed for full_name join)
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_public
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Ratings (needed for avg stars)
DROP POLICY IF EXISTS ratings_select_authenticated ON public.ratings;
CREATE POLICY ratings_select_public
  ON public.ratings FOR SELECT
  TO anon, authenticated
  USING (true);