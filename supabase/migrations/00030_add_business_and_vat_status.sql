-- Separate legal form from VAT registration. Only VAT-registered businesses may issue tax invoices.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS vat_registered boolean,
  ADD COLUMN IF NOT EXISTS vat_registration_date date;

ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_entity_type_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_entity_type_check
  CHECK (entity_type IS NULL OR entity_type IN ('individual', 'juristic', 'partnership'));

COMMENT ON COLUMN public.company_settings.entity_type IS 'individual, juristic, or partnership';
COMMENT ON COLUMN public.company_settings.vat_registered IS 'Confirmed VAT registration status; NULL means not confirmed yet';

CREATE OR REPLACE FUNCTION public.enforce_vat_registration_for_tax_invoice()
RETURNS trigger AS $$
DECLARE
  is_vat_registered boolean;
BEGIN
  SELECT vat_registered INTO is_vat_registered
  FROM public.company_settings
  WHERE id = NEW.company_id;

  IF is_vat_registered IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'VAT registration is required to issue a tax invoice';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_vat_registration_for_tax_invoice ON public.invoices;
CREATE TRIGGER enforce_vat_registration_for_tax_invoice
  BEFORE INSERT OR UPDATE OF status ON public.invoices
  FOR EACH ROW
  WHEN (NEW.status <> 'draft')
  EXECUTE FUNCTION public.enforce_vat_registration_for_tax_invoice();
