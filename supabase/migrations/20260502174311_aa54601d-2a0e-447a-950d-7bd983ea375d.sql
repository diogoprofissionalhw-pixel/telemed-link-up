-- 1) Evitar notificações duplicadas: índice único parcial por (user_id, request_id, type)
-- remove duplicatas existentes mantendo a mais antiga
DELETE FROM public.notifications a
USING public.notifications b
WHERE a.ctid > b.ctid
  AND a.user_id = b.user_id
  AND a.request_id IS NOT DISTINCT FROM b.request_id
  AND a.type = b.type;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_idx
  ON public.notifications (user_id, request_id, type)
  WHERE request_id IS NOT NULL;

-- 2) Atualiza função de notificação para usar ON CONFLICT DO NOTHING (anti-duplicata)
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
      COALESCE(network_name_val,'Uma rede') || ' enviou uma solicitação para ' || to_char(NEW.shift_date,'DD/MM'))
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'declined' THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.network_id, NEW.id, 'declined',
        'Solicitação recusada',
        'Dr(a). ' || COALESCE(doctor_name,'Médico') || ' recusou o plantão de ' || to_char(NEW.shift_date,'DD/MM'))
      ON CONFLICT DO NOTHING;
    ELSIF NEW.status = 'accepted' THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.network_id, NEW.id, 'accepted',
        'Solicitação aceita',
        'Dr(a). ' || COALESCE(doctor_name,'Médico') || ' aceitou o plantão de ' || to_char(NEW.shift_date,'DD/MM'))
      ON CONFLICT DO NOTHING;
    ELSIF NEW.status = 'cancelled' THEN
      reason_suffix := CASE WHEN NEW.cancellation_reason IS NOT NULL AND length(trim(NEW.cancellation_reason)) > 0
                            THEN '. Motivo: ' || NEW.cancellation_reason ELSE '' END;
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.doctor_id, NEW.id, 'cancelled',
        'Plantão cancelado',
        COALESCE(network_name_val,'A rede') || ' cancelou o plantão de ' || to_char(NEW.shift_date,'DD/MM') || reason_suffix)
      ON CONFLICT DO NOTHING;
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.network_id, NEW.id, 'cancelled',
        'Plantão cancelado',
        'O plantão de ' || to_char(NEW.shift_date,'DD/MM') || ' foi cancelado' || reason_suffix)
      ON CONFLICT DO NOTHING;
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.doctor_id, NEW.id, 'completed',
        'Plantão concluído',
        'O plantão de ' || to_char(NEW.shift_date,'DD/MM') || ' foi finalizado.')
      ON CONFLICT DO NOTHING;
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (NEW.network_id, NEW.id, 'completed',
        'Plantão concluído',
        'O plantão com Dr(a). ' || COALESCE(doctor_name,'Médico') || ' foi finalizado.')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END $function$;

-- 3) Função de lembretes de plantão (1h e 15min antes do início)
-- Tipos: 'reminder_1h' e 'reminder_15m' — únicos por (user_id, request_id, type)
CREATE OR REPLACE FUNCTION public.send_shift_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  shift_start TIMESTAMPTZ;
  mins_until NUMERIC;
  network_name_val TEXT;
  doctor_name TEXT;
BEGIN
  FOR r IN
    SELECT id, doctor_id, network_id, shift_date, start_time
    FROM shift_requests
    WHERE status = 'accepted'
      AND (shift_date::timestamp + start_time::interval) BETWEEN now() AND now() + interval '70 minutes'
  LOOP
    shift_start := (r.shift_date::timestamp + r.start_time::interval);
    mins_until := EXTRACT(EPOCH FROM (shift_start - now())) / 60;

    SELECT network_name INTO network_name_val FROM networks WHERE id = r.network_id;
    SELECT full_name INTO doctor_name FROM profiles WHERE id = r.doctor_id;

    -- Lembrete de 1 hora (entre 50 e 70 min antes)
    IF mins_until BETWEEN 50 AND 70 THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (r.doctor_id, r.id, 'reminder_1h',
        'Seu plantão vai começar em breve',
        'O plantão com ' || COALESCE(network_name_val,'a rede') || ' começa em cerca de 1 hora (' || to_char(shift_start, 'DD/MM HH24:MI') || ').')
      ON CONFLICT DO NOTHING;
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (r.network_id, r.id, 'reminder_1h',
        'Plantão começa em breve',
        'O plantão com Dr(a). ' || COALESCE(doctor_name,'Médico') || ' começa em cerca de 1 hora.')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Lembrete de 15 minutos (entre 5 e 20 min antes)
    IF mins_until BETWEEN 5 AND 20 THEN
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (r.doctor_id, r.id, 'reminder_15m',
        'Seu plantão vai começar em breve',
        'O plantão com ' || COALESCE(network_name_val,'a rede') || ' começa em cerca de 15 minutos.')
      ON CONFLICT DO NOTHING;
      INSERT INTO notifications(user_id, request_id, type, title, body)
      VALUES (r.network_id, r.id, 'reminder_15m',
        'Plantão começa em breve',
        'O plantão com Dr(a). ' || COALESCE(doctor_name,'Médico') || ' começa em cerca de 15 minutos.')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $function$;

-- 4) Agendar via pg_cron a cada 5 minutos
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-shift-reminders') THEN
    PERFORM cron.unschedule('send-shift-reminders');
  END IF;
  PERFORM cron.schedule('send-shift-reminders', '*/5 * * * *', $cron$SELECT public.send_shift_reminders();$cron$);

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-finalize-shifts') THEN
    PERFORM cron.unschedule('auto-finalize-shifts');
  END IF;
  PERFORM cron.schedule('auto-finalize-shifts', '*/10 * * * *', $cron$SELECT public.auto_finalize_shifts();$cron$);
END $$;