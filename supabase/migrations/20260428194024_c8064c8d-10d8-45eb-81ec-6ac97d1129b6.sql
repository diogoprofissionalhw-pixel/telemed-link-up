-- Enum para tipo de conta
CREATE TYPE public.account_type AS ENUM ('doctor', 'network');
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- Profiles (1 por usuário)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  account_type account_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dados específicos médico
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  crm TEXT NOT NULL,
  crm_uf TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dados específicos rede
CREATE TABLE public.networks (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  network_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solicitações de plantão
CREATE TABLE public.shift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(5,2) NOT NULL,
  notes TEXT,
  status request_status NOT NULL DEFAULT 'pending',
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_requests_doctor ON public.shift_requests(doctor_id, status);
CREATE INDEX idx_shift_requests_network ON public.shift_requests(network_id, status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shift_requests_updated BEFORE UPDATE ON public.shift_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Habilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_requests ENABLE ROW LEVEL SECURITY;

-- PROFILES: usuário vê/edita o seu, todos autenticados podem visualizar (para listagem)
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- DOCTORS
CREATE POLICY "doctors_select_authenticated" ON public.doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "doctors_insert_self" ON public.doctors FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "doctors_update_self" ON public.doctors FOR UPDATE TO authenticated USING (auth.uid() = id);

-- NETWORKS
CREATE POLICY "networks_select_authenticated" ON public.networks FOR SELECT TO authenticated USING (true);
CREATE POLICY "networks_insert_self" ON public.networks FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "networks_update_self" ON public.networks FOR UPDATE TO authenticated USING (auth.uid() = id);

-- SHIFT_REQUESTS
CREATE POLICY "requests_select_involved" ON public.shift_requests FOR SELECT TO authenticated
  USING (auth.uid() = network_id OR auth.uid() = doctor_id);
CREATE POLICY "requests_insert_network" ON public.shift_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = network_id);
CREATE POLICY "requests_update_doctor_response" ON public.shift_requests FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id OR auth.uid() = network_id);

-- Trigger: criar profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'account_type')::account_type, 'doctor')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();