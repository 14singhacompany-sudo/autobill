-- Migration: Create Plans and Subscriptions tables
-- Created: 2024

-- =====================================================
-- PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,              -- 'free', 'solo', 'pro', 'trial'
    display_name TEXT NOT NULL,             -- 'FREE', 'SOLO', 'PRO'
    description TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,  -- ราคาต่อเดือน (บาท)
    price_yearly DECIMAL(10,2),             -- ราคาต่อปี (บาท) - ถ้ามี discount
    invoice_limit INTEGER,                  -- จำนวนบิลต่อเดือน (NULL = unlimited)
    quotation_limit INTEGER,                -- จำนวนใบเสนอราคาต่อเดือน (NULL = unlimited)
    features JSONB DEFAULT '[]'::jsonb,     -- รายการ features ที่ได้
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.plans (name, display_name, description, price_monthly, invoice_limit, quotation_limit, features, sort_order) VALUES
('free', 'FREE', 'แพ็คเกจฟรีสำหรับเริ่มต้น', 0, 20, 20,
 '["ออกใบกำกับภาษี 20 ใบ/เดือน", "ออกใบเสนอราคา 20 ใบ/เดือน", "1 ผู้ใช้"]'::jsonb, 1),
('solo', 'SOLO', 'สำหรับ Freelancer และธุรกิจขนาดเล็ก', 149, 100, 100,
 '["ออกใบกำกับภาษี 100 ใบ/เดือน", "ออกใบเสนอราคา 100 ใบ/เดือน", "ดาวน์โหลด PDF", "ส่งอีเมล", "1 ผู้ใช้"]'::jsonb, 2),
('pro', 'PRO', 'สำหรับธุรกิจที่ต้องการความยืดหยุ่น', 249, NULL, NULL,
 '["ออกบิลไม่จำกัด", "AI Extract ข้อมูล", "รายงานสรุป", "ลูกค้าไม่จำกัด", "1 ผู้ใช้"]'::jsonb, 3)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'trial',   -- 'trial', 'active', 'cancelled', 'expired', 'past_due'
    trial_ends_at TIMESTAMPTZ,              -- วันหมด trial
    current_period_start DATE,              -- วันเริ่มต้นรอบบิล
    current_period_end DATE,                -- วันสิ้นสุดรอบบิล
    cancelled_at TIMESTAMPTZ,               -- วันที่ยกเลิก
    cancel_reason TEXT,                     -- เหตุผลที่ยกเลิก
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)                      -- 1 company = 1 subscription
);

-- =====================================================
-- USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,               -- '2024-01' format
    invoice_count INTEGER DEFAULT 0,
    quotation_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, month_year)
);

-- =====================================================
-- ADMINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'support',   -- 'super_admin', 'support'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON subscriptions(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_company_month ON usage_logs(company_id, month_year);
CREATE INDEX IF NOT EXISTS idx_admins_user ON admins(user_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Plans: Everyone can read
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
    ON public.plans FOR SELECT
    USING (true);

-- Subscriptions: Users can only see their company's subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company subscription"
    ON public.subscriptions FOR SELECT
    USING (company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their company subscription"
    ON public.subscriptions FOR UPDATE
    USING (company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
    ));

-- Usage logs: Users can only see their company's usage
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company usage"
    ON public.usage_logs FOR SELECT
    USING (company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their company usage"
    ON public.usage_logs FOR UPDATE
    USING (company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their company usage"
    ON public.usage_logs FOR INSERT
    WITH CHECK (company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
    ));

-- Admins: Only admins can view admin table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin list"
    ON public.admins FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM admins WHERE user_id = auth.uid()
    ));

-- =====================================================
-- FUNCTION: Auto-create subscription on company creation
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Get the free plan ID
    SELECT id INTO free_plan_id FROM public.plans WHERE name = 'free' LIMIT 1;

    -- Create subscription with 14-day trial
    INSERT INTO public.subscriptions (
        company_id,
        plan_id,
        status,
        trial_ends_at,
        current_period_start,
        current_period_end
    ) VALUES (
        NEW.id,
        free_plan_id,
        'trial',
        NOW() + INTERVAL '14 days',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '14 days'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create subscription when company is created
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
    AFTER INSERT ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- =====================================================
-- FUNCTION: Auto-create profile and company on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );

    -- Create company
    INSERT INTO public.companies (user_id, name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'บริษัทของฉัน')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create profile and company when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCTION: Get current month usage
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_usage(p_company_id UUID)
RETURNS TABLE (
    invoice_count INTEGER,
    quotation_count INTEGER,
    invoice_limit INTEGER,
    quotation_limit INTEGER,
    is_within_limit BOOLEAN
) AS $$
DECLARE
    current_month TEXT;
    plan_invoice_limit INTEGER;
    plan_quotation_limit INTEGER;
    current_invoice_count INTEGER;
    current_quotation_count INTEGER;
BEGIN
    current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- Get plan limits
    SELECT p.invoice_limit, p.quotation_limit
    INTO plan_invoice_limit, plan_quotation_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.company_id = p_company_id;

    -- Get current usage
    SELECT COALESCE(u.invoice_count, 0), COALESCE(u.quotation_count, 0)
    INTO current_invoice_count, current_quotation_count
    FROM usage_logs u
    WHERE u.company_id = p_company_id AND u.month_year = current_month;

    -- Return results
    RETURN QUERY SELECT
        current_invoice_count,
        current_quotation_count,
        plan_invoice_limit,
        plan_quotation_limit,
        (plan_invoice_limit IS NULL OR current_invoice_count < plan_invoice_limit) AND
        (plan_quotation_limit IS NULL OR current_quotation_count < plan_quotation_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Increment usage count
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_usage(
    p_company_id UUID,
    p_type TEXT  -- 'invoice' or 'quotation'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_month TEXT;
BEGIN
    current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- Upsert usage log
    INSERT INTO usage_logs (company_id, month_year, invoice_count, quotation_count)
    VALUES (
        p_company_id,
        current_month,
        CASE WHEN p_type = 'invoice' THEN 1 ELSE 0 END,
        CASE WHEN p_type = 'quotation' THEN 1 ELSE 0 END
    )
    ON CONFLICT (company_id, month_year)
    DO UPDATE SET
        invoice_count = usage_logs.invoice_count + CASE WHEN p_type = 'invoice' THEN 1 ELSE 0 END,
        quotation_count = usage_logs.quotation_count + CASE WHEN p_type = 'quotation' THEN 1 ELSE 0 END,
        updated_at = NOW();

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
