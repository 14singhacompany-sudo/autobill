-- Migration: Add AI API Usage Logs
-- Track AI extraction API calls per user/company

-- =====================================================
-- AI API LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    api_type TEXT NOT NULL,                -- 'extract_customer', 'extract_items', 'extract_image'
    request_tokens INTEGER DEFAULT 0,      -- จำนวน tokens ที่ใช้ (input)
    response_tokens INTEGER DEFAULT 0,     -- จำนวน tokens ที่ใช้ (output)
    total_tokens INTEGER DEFAULT 0,        -- รวม tokens
    status TEXT DEFAULT 'success',         -- 'success', 'error', 'limit_exceeded'
    error_message TEXT,                    -- error message ถ้ามี
    metadata JSONB DEFAULT '{}'::jsonb,    -- ข้อมูลเพิ่มเติม (file size, processing time, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADD ai_extraction_limit TO PLANS
-- =====================================================
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS ai_extraction_limit INTEGER;

-- Update plans with AI extraction limits
-- FREE: 10 ครั้ง/เดือน
-- SOLO: 50 ครั้ง/เดือน
-- PRO: ไม่จำกัด (NULL)
UPDATE public.plans SET ai_extraction_limit = 10 WHERE name = 'free';
UPDATE public.plans SET ai_extraction_limit = 50 WHERE name = 'solo';
UPDATE public.plans SET ai_extraction_limit = NULL WHERE name = 'pro';

-- =====================================================
-- ADD ai_extraction_count TO USAGE_LOGS
-- =====================================================
ALTER TABLE public.usage_logs
ADD COLUMN IF NOT EXISTS ai_extraction_count INTEGER DEFAULT 0;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ai_api_logs_company ON ai_api_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_logs_user ON ai_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_logs_created ON ai_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_api_logs_type ON ai_api_logs(api_type);
CREATE INDEX IF NOT EXISTS idx_ai_api_logs_company_created ON ai_api_logs(company_id, created_at);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.ai_api_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their company's AI API logs
CREATE POLICY "Users can view their company AI logs"
    ON public.ai_api_logs FOR SELECT
    USING (company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
    ));

-- Users can insert their company's AI API logs
CREATE POLICY "Users can insert their company AI logs"
    ON public.ai_api_logs FOR INSERT
    WITH CHECK (company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
    ));

-- Admins can view all AI API logs
CREATE POLICY "Admins can view all AI logs"
    ON public.ai_api_logs FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- =====================================================
-- FUNCTION: Log AI API call
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_ai_api_call(
    p_company_id UUID,
    p_user_id UUID,
    p_api_type TEXT,
    p_request_tokens INTEGER DEFAULT 0,
    p_response_tokens INTEGER DEFAULT 0,
    p_status TEXT DEFAULT 'success',
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    current_month TEXT;
BEGIN
    current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- Insert log entry
    INSERT INTO ai_api_logs (
        company_id,
        user_id,
        api_type,
        request_tokens,
        response_tokens,
        total_tokens,
        status,
        error_message,
        metadata
    ) VALUES (
        p_company_id,
        p_user_id,
        p_api_type,
        p_request_tokens,
        p_response_tokens,
        p_request_tokens + p_response_tokens,
        p_status,
        p_error_message,
        p_metadata
    )
    RETURNING id INTO log_id;

    -- Update usage count if successful
    IF p_status = 'success' THEN
        INSERT INTO usage_logs (company_id, month_year, ai_extraction_count)
        VALUES (p_company_id, current_month, 1)
        ON CONFLICT (company_id, month_year)
        DO UPDATE SET
            ai_extraction_count = usage_logs.ai_extraction_count + 1,
            updated_at = NOW();
    END IF;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check AI extraction limit
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_ai_extraction_limit(p_company_id UUID)
RETURNS TABLE (
    current_count INTEGER,
    limit_count INTEGER,
    can_extract BOOLEAN,
    remaining INTEGER
) AS $$
DECLARE
    current_month TEXT;
    plan_limit INTEGER;
    current_extraction_count INTEGER;
BEGIN
    current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- Get plan AI extraction limit
    SELECT p.ai_extraction_limit
    INTO plan_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.company_id = p_company_id;

    -- Get current AI extraction count
    SELECT COALESCE(u.ai_extraction_count, 0)
    INTO current_extraction_count
    FROM usage_logs u
    WHERE u.company_id = p_company_id AND u.month_year = current_month;

    -- If no usage record exists, count is 0
    IF current_extraction_count IS NULL THEN
        current_extraction_count := 0;
    END IF;

    -- Return results
    RETURN QUERY SELECT
        current_extraction_count,
        plan_limit,
        (plan_limit IS NULL OR current_extraction_count < plan_limit),
        CASE
            WHEN plan_limit IS NULL THEN 999999
            ELSE GREATEST(0, plan_limit - current_extraction_count)
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get AI API usage stats for admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_ai_api_stats(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_calls BIGINT,
    successful_calls BIGINT,
    failed_calls BIGINT,
    total_tokens BIGINT,
    unique_users BIGINT,
    unique_companies BIGINT,
    calls_by_type JSONB
) AS $$
DECLARE
    start_ts TIMESTAMPTZ;
    end_ts TIMESTAMPTZ;
BEGIN
    -- Default to current month if no dates provided
    start_ts := COALESCE(p_start_date::timestamptz, DATE_TRUNC('month', NOW()));
    end_ts := COALESCE(p_end_date::timestamptz + INTERVAL '1 day', NOW());

    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'success') as success,
            COUNT(*) FILTER (WHERE status = 'error') as errors,
            COALESCE(SUM(total_tokens), 0) as tokens,
            COUNT(DISTINCT user_id) as users,
            COUNT(DISTINCT company_id) as companies,
            jsonb_object_agg(
                api_type,
                type_count
            ) as by_type
        FROM ai_api_logs,
        LATERAL (
            SELECT api_type as t, COUNT(*) as type_count
            FROM ai_api_logs
            WHERE created_at >= start_ts AND created_at < end_ts
            GROUP BY api_type
        ) type_counts
        WHERE created_at >= start_ts AND created_at < end_ts
    )
    SELECT
        total::BIGINT,
        success::BIGINT,
        errors::BIGINT,
        tokens::BIGINT,
        users::BIGINT,
        companies::BIGINT,
        COALESCE(by_type, '{}'::jsonb)
    FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE get_current_usage to include AI extractions
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_current_usage(p_company_id UUID)
RETURNS TABLE (
    invoice_count INTEGER,
    quotation_count INTEGER,
    ai_extraction_count INTEGER,
    invoice_limit INTEGER,
    quotation_limit INTEGER,
    ai_extraction_limit INTEGER,
    is_within_limit BOOLEAN
) AS $$
DECLARE
    current_month TEXT;
    plan_invoice_limit INTEGER;
    plan_quotation_limit INTEGER;
    plan_ai_limit INTEGER;
    current_invoice_count INTEGER;
    current_quotation_count INTEGER;
    current_ai_count INTEGER;
BEGIN
    current_month := TO_CHAR(NOW(), 'YYYY-MM');

    -- Get plan limits
    SELECT p.invoice_limit, p.quotation_limit, p.ai_extraction_limit
    INTO plan_invoice_limit, plan_quotation_limit, plan_ai_limit
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.company_id = p_company_id;

    -- Get current usage
    SELECT
        COALESCE(u.invoice_count, 0),
        COALESCE(u.quotation_count, 0),
        COALESCE(u.ai_extraction_count, 0)
    INTO current_invoice_count, current_quotation_count, current_ai_count
    FROM usage_logs u
    WHERE u.company_id = p_company_id AND u.month_year = current_month;

    -- Default to 0 if no record
    IF current_invoice_count IS NULL THEN current_invoice_count := 0; END IF;
    IF current_quotation_count IS NULL THEN current_quotation_count := 0; END IF;
    IF current_ai_count IS NULL THEN current_ai_count := 0; END IF;

    -- Return results
    RETURN QUERY SELECT
        current_invoice_count,
        current_quotation_count,
        current_ai_count,
        plan_invoice_limit,
        plan_quotation_limit,
        plan_ai_limit,
        (plan_invoice_limit IS NULL OR current_invoice_count < plan_invoice_limit) AND
        (plan_quotation_limit IS NULL OR current_quotation_count < plan_quotation_limit) AND
        (plan_ai_limit IS NULL OR current_ai_count < plan_ai_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
