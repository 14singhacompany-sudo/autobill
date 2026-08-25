-- A platform-funded discount reduces the buyer's payment but not the VAT base.
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS platform_discount_amount numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS platform_discount_amount numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS platform_discount_amount numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS platform_discount_amount numeric(15,2) NOT NULL DEFAULT 0;

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS shopee_coin_discount_amount numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shopee_coin_discount_amount numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS shopee_coin_discount_amount numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.billing_invoices ADD COLUMN IF NOT EXISTS shopee_coin_discount_amount numeric(15,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.quotations.platform_discount_amount IS 'Discount funded by platform; does not reduce VAT base';
COMMENT ON COLUMN public.invoices.platform_discount_amount IS 'Discount funded by platform; does not reduce VAT base';
COMMENT ON COLUMN public.receipts.platform_discount_amount IS 'Discount funded by platform; does not reduce VAT base';
COMMENT ON COLUMN public.billing_invoices.platform_discount_amount IS 'Discount funded by platform; does not reduce VAT base';
COMMENT ON COLUMN public.quotations.shopee_coin_discount_amount IS 'Shopee Coin discount; does not reduce VAT base';
COMMENT ON COLUMN public.invoices.shopee_coin_discount_amount IS 'Shopee Coin discount; does not reduce VAT base';
COMMENT ON COLUMN public.receipts.shopee_coin_discount_amount IS 'Shopee Coin discount; does not reduce VAT base';
COMMENT ON COLUMN public.billing_invoices.shopee_coin_discount_amount IS 'Shopee Coin discount; does not reduce VAT base';
