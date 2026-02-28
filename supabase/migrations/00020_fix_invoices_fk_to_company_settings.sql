-- Migration: Fix invoices.company_id FK to reference company_settings instead of companies
-- This is needed because the app uses company_settings.id as the company identifier

-- Drop existing FK constraint
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_company_id_fkey;

-- Add new FK constraint referencing company_settings
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.company_settings(id) ON DELETE CASCADE;

-- Do the same for quotations if it has similar issue
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_company_id_fkey;

ALTER TABLE public.quotations
ADD CONSTRAINT quotations_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.company_settings(id) ON DELETE CASCADE;

-- Also fix products if needed
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_company_id_fkey;

ALTER TABLE public.products
ADD CONSTRAINT products_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.company_settings(id) ON DELETE CASCADE;
