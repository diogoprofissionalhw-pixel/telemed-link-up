-- Cria enum para status do CRM
DO $$ BEGIN
  CREATE TYPE public.crm_status AS ENUM ('verified', 'pending', 'invalid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Adiciona coluna se não existir
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS crm_status public.crm_status NOT NULL DEFAULT 'pending';

-- Função para auto-validar formato do CRM
CREATE OR REPLACE FUNCTION public.auto_validate_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.crm IS NULL OR NEW.crm_uf IS NULL
     OR NOT (NEW.crm ~ '^[0-9]{4,7}$')
     OR NOT (NEW.crm_uf ~ '^[A-Z]{2}$') THEN
    NEW.crm_status := 'invalid';
  ELSE
    -- Mantém 'verified' se já estava; caso contrário marca como pending para análise
    IF NEW.crm_status = 'invalid' OR NEW.crm_status IS NULL THEN
      NEW.crm_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_validate_crm ON public.doctors;
CREATE TRIGGER trg_auto_validate_crm
BEFORE INSERT OR UPDATE OF crm, crm_uf ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.auto_validate_crm();

-- Recalcula status existente
UPDATE public.doctors
SET crm_status = CASE
  WHEN crm ~ '^[0-9]{4,7}$' AND crm_uf ~ '^[A-Z]{2}$' THEN COALESCE(crm_status, 'pending')
  ELSE 'invalid'
END;