-- Additive reference table for exact Thai juristic-person lookups.
-- Deliberately separate from public.companies (the existing authenticated tenant table).
CREATE TABLE IF NOT EXISTS public.thai_company_registry (
  tax_id VARCHAR(13) PRIMARY KEY CHECK (tax_id ~ '^[0-9]{13}$'),
  name_th TEXT NOT NULL,
  company_type TEXT,
  status TEXT,
  address TEXT,
  registration_date DATE,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.thai_company_registry ENABLE ROW LEVEL SECURITY;

-- The app route still authenticates the user and performs an exact primary-key lookup.
CREATE POLICY "Authenticated users can lookup Thai companies"
  ON public.thai_company_registry FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.update_thai_company_registry_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_thai_company_registry_updated_at
  BEFORE UPDATE ON public.thai_company_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_thai_company_registry_updated_at();

COMMENT ON TABLE public.thai_company_registry IS
  'Read-only Thai juristic-person reference data; not customer or tenant data.';

-- Rollback (manual):
-- DROP TRIGGER IF EXISTS update_thai_company_registry_updated_at ON public.thai_company_registry;
-- DROP FUNCTION IF EXISTS public.update_thai_company_registry_updated_at();
-- DROP TABLE IF EXISTS public.thai_company_registry;
