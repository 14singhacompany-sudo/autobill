-- Billing invoices use the same sales-channel fields as quotations, invoices,
-- and receipts. Older production databases were created before this column
-- was added to the billing-invoice form.
ALTER TABLE public.billing_invoices
  ADD COLUMN IF NOT EXISTS sales_channel text;

COMMENT ON COLUMN public.billing_invoices.sales_channel IS
  'Sales channel: shopee, lazada, facebook, tiktok, or custom text';

-- Make PostgREST notice the new column immediately after running this file.
NOTIFY pgrst, 'reload schema';
