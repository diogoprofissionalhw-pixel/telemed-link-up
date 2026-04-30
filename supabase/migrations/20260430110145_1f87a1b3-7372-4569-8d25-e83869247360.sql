
-- 1. Add personal fields to doctors
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil';

-- 2. Add shift type and agreed value to shift_requests
DO $$ BEGIN
  CREATE TYPE shift_period AS ENUM ('morning','night','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.shift_requests
  ADD COLUMN IF NOT EXISTS shift_period shift_period NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS agreed_value NUMERIC(10,2);

-- 3. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_self ON public.notifications;
CREATE POLICY notifications_select_self ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_self ON public.notifications;
CREATE POLICY notifications_update_self ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS notifications_delete_self ON public.notifications;
CREATE POLICY notifications_delete_self ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 4. Trigger: when shift_requests status changes, create notifications
CREATE OR REPLACE FUNCTION public.notify_request_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  doctor_name TEXT;
  network_name_val TEXT;
BEGIN
  SELECT full_name INTO doctor_name FROM profiles WHERE id = NEW.doctor_id;
  SELECT network_name INTO network_name_val FROM networks WHERE id = NEW.network_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications(user_id, request_id, type, title, body)
    VALUES (NEW.doctor_id, NEW.id, 'new_request',
      'Nova solicitação de plantão',
      COALESCE(network_name_val,'Uma rede') || ' enviou uma solicitação para ' || to_char(NEW.shift_date,'DD/MM'));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'declined' THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.network_id, NEW.id, 'declined',
        'Solicitação recusada',
        'Dr(a). ' || COALESCE(doctor_name,'Médico') || ' recusou o plantão de ' || to_char(NEW.shift_date,'DD/MM'));
    ELSIF NEW.status = 'accepted' THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.network_id, NEW.id, 'accepted',
        'Solicitação aceita',
        'Dr(a). ' || COALESCE(doctor_name,'Médico') || ' aceitou o plantão de ' || to_char(NEW.shift_date,'DD/MM'));
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.doctor_id, NEW.id, 'cancelled',
        'Solicitação cancelada',
        COALESCE(network_name_val,'A rede') || ' cancelou o plantão de ' || to_char(NEW.shift_date,'DD/MM'));
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.doctor_id, NEW.id, 'completed',
        'Plantão concluído',
        'O plantão de ' || to_char(NEW.shift_date,'DD/MM') || ' foi finalizado.');
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.network_id, NEW.id, 'completed',
        'Plantão concluído',
        'O plantão com Dr(a). ' || COALESCE(doctor_name,'Médico') || ' foi finalizado.');
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_request_status ON public.shift_requests;
CREATE TRIGGER trg_notify_request_status
AFTER INSERT OR UPDATE ON public.shift_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_request_status_change();

-- 5. Add 'completed' to request_status enum if missing
DO $$ BEGIN
  ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'completed';
EXCEPTION WHEN others THEN NULL; END $$;

-- 6. Function: auto-complete finished shifts and clean expired ones
CREATE OR REPLACE FUNCTION public.auto_finalize_shifts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Mark accepted shifts as completed once their end datetime passed
  UPDATE shift_requests
  SET status = 'completed', updated_at = now()
  WHERE status = 'accepted'
    AND (
      (end_time > start_time AND (shift_date::timestamp + end_time::interval) < now())
      OR (end_time <= start_time AND (shift_date::timestamp + interval '1 day' + end_time::interval) < now())
    );

  -- Auto-cancel pending requests whose shift_date passed without response
  UPDATE shift_requests
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'pending'
    AND shift_date < (now() - interval '1 day')::date;
END $$;

-- Schedule via pg_cron if available
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('auto-finalize-shifts');
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.schedule('auto-finalize-shifts', '*/10 * * * *', $cron$ SELECT public.auto_finalize_shifts(); $cron$);
EXCEPTION WHEN others THEN NULL; END $$;

-- 7. Update handle_new_user to capture extra fields from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'account_type')::account_type, 'doctor')
  );
  RETURN NEW;
END $$;

-- Ensure trigger exists on auth.users
DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
