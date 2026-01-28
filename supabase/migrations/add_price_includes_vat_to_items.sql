-- Add price_includes_vat column to invoice_items
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS price_includes_vat BOOLEAN NOT NULL DEFAULT false;

-- Add price_includes_vat column to quotation_items
ALTER TABLE public.quotation_items
ADD COLUMN IF NOT EXISTS price_includes_vat BOOLEAN NOT NULL DEFAULT false;
