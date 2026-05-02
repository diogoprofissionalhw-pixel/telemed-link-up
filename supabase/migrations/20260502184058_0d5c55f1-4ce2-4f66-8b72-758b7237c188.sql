CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  preview TEXT;
  existing_id UUID;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  IF sender_name IS NULL THEN
    SELECT network_name INTO sender_name FROM networks WHERE id = NEW.sender_id;
  END IF;

  preview := CASE
    WHEN length(NEW.content) > 80 THEN substring(NEW.content from 1 for 80) || '...'
    ELSE NEW.content
  END;

  -- Se já existe notificação não lida do mesmo chat, atualiza ao invés de duplicar
  SELECT id INTO existing_id
  FROM notifications
  WHERE user_id = NEW.recipient_id
    AND request_id = NEW.request_id
    AND type = 'new_message'
    AND read_at IS NULL
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE notifications
    SET title = 'Nova mensagem de ' || COALESCE(sender_name, 'usuário'),
        body = preview,
        created_at = now()
    WHERE id = existing_id;
  ELSE
    INSERT INTO notifications(user_id, request_id, type, title, body)
    VALUES (
      NEW.recipient_id,
      NEW.request_id,
      'new_message',
      'Nova mensagem de ' || COALESCE(sender_name, 'usuário'),
      preview
    );
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();