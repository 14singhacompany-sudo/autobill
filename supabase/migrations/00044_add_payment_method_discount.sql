ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS payment_method_discount_amount numeric(15,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.invoices.payment_method_discount_amount IS
'Discount funded by a payment method promotion; does not reduce VAT base';
