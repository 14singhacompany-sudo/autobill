-- Migration: Add Admin RLS Policies
-- Allow admins to read all data for admin dashboard

-- =====================================================
-- ADMIN POLICIES FOR PROFILES
-- =====================================================
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- =====================================================
-- ADMIN POLICIES FOR COMPANIES
-- =====================================================
CREATE POLICY "Admins can view all companies"
    ON public.companies FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- =====================================================
-- ADMIN POLICIES FOR SUBSCRIPTIONS
-- =====================================================
CREATE POLICY "Admins can view all subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can update all subscriptions"
    ON public.subscriptions FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- =====================================================
-- ADMIN POLICIES FOR INVOICES
-- =====================================================
CREATE POLICY "Admins can view all invoices"
    ON public.invoices FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- =====================================================
-- ADMIN POLICIES FOR QUOTATIONS
-- =====================================================
CREATE POLICY "Admins can view all quotations"
    ON public.quotations FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- =====================================================
-- ADMIN POLICIES FOR USAGE_LOGS
-- =====================================================
CREATE POLICY "Admins can view all usage logs"
    ON public.usage_logs FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    );

-- =====================================================
-- HELPER FUNCTION: Check if user is admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM admins WHERE admins.user_id = is_admin.user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
