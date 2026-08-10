-- Persist both document-level discounts for receipts and billing invoices.
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS discount1_type text DEFAULT 'fixed';
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS discount1_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS discount1_amount numeric(15,2) DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS discount2_type text DEFAULT 'fixed';
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS discount2_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS discount2_amount numeric(15,2) DEFAULT 0;

ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS discount1_type text DEFAULT 'fixed';
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS discount1_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS discount1_amount numeric(15,2) DEFAULT 0;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS discount2_type text DEFAULT 'fixed';
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS discount2_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS discount2_amount numeric(15,2) DEFAULT 0;
