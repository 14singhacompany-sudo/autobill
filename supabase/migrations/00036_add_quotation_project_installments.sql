ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS project_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_installments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.billing_invoices
  ADD COLUMN IF NOT EXISTS source_quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_installment_index integer,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.billing_invoices
SET paid_at = COALESCE(updated_at, created_at, now())
WHERE status = 'paid' AND paid_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS billing_invoices_source_installment_unique
  ON public.billing_invoices (source_quotation_id, source_installment_index)
  WHERE source_quotation_id IS NOT NULL AND source_installment_index IS NOT NULL
    AND status <> 'cancelled';

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS source_billing_invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_billing_invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS receipts_source_billing_invoice_unique
  ON public.receipts (source_billing_invoice_id)
  WHERE source_billing_invoice_id IS NOT NULL AND status <> 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS invoices_source_billing_invoice_unique
  ON public.invoices (source_billing_invoice_id)
  WHERE source_billing_invoice_id IS NOT NULL AND status <> 'cancelled';

UPDATE public.plans
SET features = features || '["แบ่งงวดงานสูงสุด 2 งวด"]'::jsonb
WHERE name = 'free' AND NOT features @> '["แบ่งงวดงานสูงสุด 2 งวด"]'::jsonb;

UPDATE public.plans
SET features = features || '["แจ้งเตือนงวดในวันที่ครบกำหนด"]'::jsonb
WHERE name = 'free' AND NOT features @> '["แจ้งเตือนงวดในวันที่ครบกำหนด"]'::jsonb;

UPDATE public.plans
SET features = features || '["แบ่งงวดงานสูงสุด 5 งวด"]'::jsonb
WHERE name = 'solo' AND NOT features @> '["แบ่งงวดงานสูงสุด 5 งวด"]'::jsonb;

UPDATE public.plans
SET features = features || '["แจ้งเตือนงวดล่วงหน้า 3 วัน"]'::jsonb
WHERE name = 'solo' AND NOT features @> '["แจ้งเตือนงวดล่วงหน้า 3 วัน"]'::jsonb;

UPDATE public.plans
SET features = features || '["แบ่งงวดงานไม่จำกัด"]'::jsonb
WHERE name = 'pro' AND NOT features @> '["แบ่งงวดงานไม่จำกัด"]'::jsonb;

UPDATE public.plans
SET features = features || '["แจ้งเตือนงวดล่วงหน้า 7 วัน"]'::jsonb
WHERE name = 'pro' AND NOT features @> '["แจ้งเตือนงวดล่วงหน้า 7 วัน"]'::jsonb;
