-- Track tax withheld by the customer without reducing the legal document total.
-- The withholding base is amount_before_vat; net_amount is the expected cash receipt.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['quotations', 'billing_invoices', 'receipts', 'invoices']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS withholding_tax_rate numeric(5,2) NOT NULL DEFAULT 0', table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS withholding_tax_amount numeric(15,2) NOT NULL DEFAULT 0', table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS net_amount numeric(15,2) NOT NULL DEFAULT 0', table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS withholding_certificate_status text NOT NULL DEFAULT ''not_applicable''', table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS withholding_certificate_received_at timestamptz', table_name);
  END LOOP;
END $$;

UPDATE public.quotations SET net_amount = total_amount WHERE net_amount = 0 AND total_amount <> 0;
UPDATE public.billing_invoices SET net_amount = total_amount WHERE net_amount = 0 AND total_amount <> 0;
UPDATE public.receipts SET net_amount = total_amount WHERE net_amount = 0 AND total_amount <> 0;
UPDATE public.invoices SET net_amount = total_amount WHERE net_amount = 0 AND total_amount <> 0;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['quotations', 'billing_invoices', 'receipts', 'invoices']
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', table_name, table_name || '_withholding_rate_check');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (withholding_tax_rate >= 0 AND withholding_tax_rate <= 100)', table_name, table_name || '_withholding_rate_check');
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', table_name, table_name || '_withholding_status_check');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (withholding_certificate_status IN (''not_applicable'', ''waiting'', ''received''))', table_name, table_name || '_withholding_status_check');
  END LOOP;
END $$;

COMMENT ON COLUMN public.invoices.withholding_tax_amount IS 'Tax expected to be withheld by the customer; document total remains unchanged';
