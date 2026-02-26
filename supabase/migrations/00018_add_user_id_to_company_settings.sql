-- Migration: Add user_id to company_settings for multi-tenancy
-- This fixes the issue where users see other users' company data

-- Add user_id column to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to link to their owner
-- (This assumes company_settings.id is referenced by customers.company_id,
-- and customers are linked through invoices/quotations which have company_id from the companies table)
UPDATE public.company_settings cs
SET user_id = c.user_id
FROM public.companies c
WHERE cs.user_id IS NULL
AND EXISTS (
    SELECT 1 FROM public.customers cust
    WHERE cust.company_id = cs.id
    AND EXISTS (
        SELECT 1 FROM public.invoices inv
        WHERE inv.company_id = c.id
    )
);

-- For any company_settings without user_id, try to match by name or just assign first user
-- This is a fallback - in production you'd want to manually verify these
UPDATE public.company_settings cs
SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
WHERE cs.user_id IS NULL;

-- Make user_id NOT NULL after migration (optional - uncomment if needed)
-- ALTER TABLE public.company_settings ALTER COLUMN user_id SET NOT NULL;

-- Create unique constraint: one company_settings per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_user_id ON public.company_settings(user_id);

-- Enable RLS on company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can insert own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can delete own company settings" ON public.company_settings;

-- Create RLS policies for company_settings
CREATE POLICY "Users can view own company settings"
    ON public.company_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company settings"
    ON public.company_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company settings"
    ON public.company_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company settings"
    ON public.company_settings FOR DELETE
    USING (auth.uid() = user_id);

-- Admin policy: Admins can view all company settings
CREATE POLICY "Admins can view all company settings"
    ON public.company_settings FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );
