ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS pix_key_type text,
  ADD COLUMN IF NOT EXISTS bank_account_type text,
  ADD COLUMN IF NOT EXISTS bank_account_digit text,
  ADD COLUMN IF NOT EXISTS rg_document_url text;