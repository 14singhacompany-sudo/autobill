-- Track when tax invoices are sent to the print dialog.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS printed_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS print_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.invoices.printed_at IS 'Most recent time the user pressed Print';
COMMENT ON COLUMN public.invoices.print_count IS 'Number of times the user pressed Print';
