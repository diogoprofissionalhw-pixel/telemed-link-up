-- 1. Expandir currículo do médico
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS certifications text,
  ADD COLUMN IF NOT EXISTS languages text;

-- 2. Mensagens (chat ligado a uma solicitação)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.shift_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_request ON public.messages(request_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_involved ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY messages_insert_self ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.shift_requests r
      WHERE r.id = request_id
        AND (auth.uid() = r.doctor_id OR auth.uid() = r.network_id)
        AND ((r.doctor_id = recipient_id AND r.network_id = sender_id)
          OR (r.network_id = recipient_id AND r.doctor_id = sender_id))
    )
  );

CREATE POLICY messages_update_recipient ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 3. Avaliações (rede avalia médico após plantão aceito)
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.shift_requests(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  network_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_doctor ON public.ratings(doctor_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- todos autenticados veem (currículo público para redes/médicos)
CREATE POLICY ratings_select_authenticated ON public.ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ratings_insert_network ON public.ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = network_id
    AND EXISTS (
      SELECT 1 FROM public.shift_requests r
      WHERE r.id = request_id
        AND r.network_id = auth.uid()
        AND r.doctor_id = ratings.doctor_id
        AND r.status = 'accepted'
    )
  );

CREATE POLICY ratings_update_network ON public.ratings
  FOR UPDATE TO authenticated
  USING (auth.uid() = network_id);