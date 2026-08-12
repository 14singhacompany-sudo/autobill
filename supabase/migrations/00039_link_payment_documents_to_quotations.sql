-- Allow a paid cash sale to go directly from quotation to its final payment document.
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS source_quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_one_active_per_quotation
  ON public.receipts (source_quotation_id)
  WHERE source_quotation_id IS NOT NULL AND status <> 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_one_active_per_quotation
  ON public.invoices (quotation_id)
  WHERE quotation_id IS NOT NULL AND status <> 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_invoices_one_full_active_per_quotation
  ON public.billing_invoices (source_quotation_id)
  WHERE source_quotation_id IS NOT NULL
    AND source_installment_index IS NULL
    AND status <> 'cancelled';
