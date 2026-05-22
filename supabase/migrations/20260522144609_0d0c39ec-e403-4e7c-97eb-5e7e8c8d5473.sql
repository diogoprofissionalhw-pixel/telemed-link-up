ALTER TABLE public.networks
  ADD COLUMN IF NOT EXISTS qualification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz;

ALTER TABLE public.networks
  DROP CONSTRAINT IF EXISTS networks_qualification_status_check;
ALTER TABLE public.networks
  ADD CONSTRAINT networks_qualification_status_check
  CHECK (qualification_status IN ('pending','qualified','unqualified'));

CREATE INDEX IF NOT EXISTS idx_networks_qualification_status ON public.networks(qualification_status);