
-- USER BLOCKS
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_select_self" ON public.user_blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
CREATE POLICY "blocks_insert_self" ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocks_delete_self" ON public.user_blocks FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

CREATE INDEX idx_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.user_blocks(blocked_id);

-- Helper function: are two users blocked in either direction?
CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

-- DIRECT MESSAGES
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_dm_pair ON public.direct_messages(sender_id, recipient_id, created_at);
CREATE INDEX idx_dm_recipient ON public.direct_messages(recipient_id, created_at);

CREATE POLICY "dm_select_involved" ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "dm_insert_self" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT public.is_blocked_between(sender_id, recipient_id)
  );

CREATE POLICY "dm_update_recipient" ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;

-- USER CHAT SETTINGS (mute / hide-conversation per peer)
CREATE TABLE public.user_chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  peer_id uuid NOT NULL,
  muted_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, peer_id),
  CHECK (user_id <> peer_id)
);
ALTER TABLE public.user_chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ucs_select_self" ON public.user_chat_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ucs_insert_self" ON public.user_chat_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ucs_update_self" ON public.user_chat_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "ucs_delete_self" ON public.user_chat_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_ucs_updated_at BEFORE UPDATE ON public.user_chat_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notification trigger for new direct messages, respecting mute
CREATE OR REPLACE FUNCTION public.notify_new_direct_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sender_name text;
  preview text;
  is_muted boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_chat_settings
    WHERE user_id = NEW.recipient_id AND peer_id = NEW.sender_id AND muted_at IS NOT NULL
  ) INTO is_muted;
  IF is_muted THEN RETURN NEW; END IF;

  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  IF sender_name IS NULL THEN
    SELECT network_name INTO sender_name FROM networks WHERE id = NEW.sender_id;
  END IF;

  preview := CASE WHEN length(NEW.content) > 80
    THEN substring(NEW.content from 1 for 80) || '...'
    ELSE NEW.content END;

  INSERT INTO notifications(user_id, type, title, body)
  VALUES (NEW.recipient_id, 'new_direct_message',
    'Nova mensagem de ' || COALESCE(sender_name, 'usuário'), preview);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_new_direct_message AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_direct_message();
