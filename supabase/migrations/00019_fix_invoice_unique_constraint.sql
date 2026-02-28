-- Migration: Fix unique constraints for multi-tenancy
-- Allow same invoice/quotation numbers across different companies

-- Drop existing constraints FIRST (constraints depend on indexes)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_quotation_number_key;

-- Then drop indexes if they still exist separately
DROP INDEX IF EXISTS invoices_invoice_number_key;
DROP INDEX IF EXISTS quotations_quotation_number_key;

-- Create composite unique constraints (company_id + number)
-- This allows different companies to have same invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_company_number
    ON public.invoices(company_id, invoice_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_company_number
    ON public.quotations(company_id, quotation_number);

-- Add comment for documentation
COMMENT ON INDEX idx_invoices_company_number IS 'Unique invoice number per company';
COMMENT ON INDEX idx_quotations_company_number IS 'Unique quotation number per company';
