-- VAT document verification (Por.Por.20) with private storage.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS vat_document_path text,
  ADD COLUMN IF NOT EXISTS vat_verification_status text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS vat_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS vat_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS vat_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vat_rejection_reason text;

ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_vat_verification_status_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_vat_verification_status_check
  CHECK (vat_verification_status IN ('not_submitted', 'pending', 'verified', 'rejected'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vat-documents',
  'vat-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own VAT documents" ON storage.objects;
CREATE POLICY "Users upload own VAT documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vat-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users view own VAT documents" ON storage.objects;
CREATE POLICY "Users view own VAT documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vat-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own VAT documents" ON storage.objects;
CREATE POLICY "Users update own VAT documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vat-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own VAT documents" ON storage.objects;
CREATE POLICY "Users delete own VAT documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vat-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.enforce_vat_registration_for_tax_invoice()
RETURNS trigger AS $$
DECLARE
  settings_record record;
BEGIN
  SELECT vat_registered, vat_verification_status
  INTO settings_record
  FROM public.company_settings
  WHERE id = NEW.company_id;

  IF settings_record.vat_registered IS DISTINCT FROM TRUE
     OR settings_record.vat_verification_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Verified VAT registration is required to issue a tax invoice';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.reset_vat_verification_on_business_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.tax_id IS DISTINCT FROM NEW.tax_id
     OR OLD.branch_code IS DISTINCT FROM NEW.branch_code
     OR OLD.entity_type IS DISTINCT FROM NEW.entity_type
     OR OLD.vat_registered IS DISTINCT FROM NEW.vat_registered
     OR OLD.vat_registration_date IS DISTINCT FROM NEW.vat_registration_date THEN
    NEW.vat_verification_status := CASE WHEN NEW.vat_document_path IS NULL THEN 'not_submitted' ELSE 'pending' END;
    NEW.vat_verified_at := NULL;
    NEW.vat_verified_by := NULL;
    NEW.vat_rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reset_vat_verification_on_business_change ON public.company_settings;
CREATE TRIGGER reset_vat_verification_on_business_change
  BEFORE UPDATE OF tax_id, branch_code, entity_type, vat_registered, vat_registration_date
  ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.reset_vat_verification_on_business_change();
