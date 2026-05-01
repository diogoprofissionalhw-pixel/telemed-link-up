-- 1. Adiciona campo de motivo de cancelamento
ALTER TABLE public.shift_requests
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Habilita realtime para shift_requests e messages (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shift_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_requests;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

ALTER TABLE public.shift_requests REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 3. Atualiza trigger de notificação para incluir motivo de cancelamento
CREATE OR REPLACE FUNCTION public.notify_request_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doctor_name TEXT;
  network_name_val TEXT;
  reason_suffix TEXT;
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
      reason_suffix := CASE WHEN NEW.cancellation_reason IS NOT NULL AND length(trim(NEW.cancellation_reason)) > 0
                            THEN '. Motivo: ' || NEW.cancellation_reason ELSE '' END;
      -- Notifica ambas as partes
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.doctor_id, NEW.id, 'cancelled',
        'Plantão cancelado',
        COALESCE(network_name_val,'A rede') || ' cancelou o plantão de ' || to_char(NEW.shift_date,'DD/MM') || reason_suffix);
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.network_id, NEW.id, 'cancelled',
        'Plantão cancelado',
        'O plantão de ' || to_char(NEW.shift_date,'DD/MM') || ' foi cancelado' || reason_suffix);
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
END $function$;

-- 4. Garante que o trigger esteja conectado
DROP TRIGGER IF EXISTS trg_notify_request_status_change ON public.shift_requests;
CREATE TRIGGER trg_notify_request_status_change
AFTER INSERT OR UPDATE ON public.shift_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_request_status_change();