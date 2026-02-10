-- Migration: Hide SOLO plan for market testing
-- Only show FREE and PRO plans
-- SOLO plan is hidden but not deleted (can be reactivated later)

UPDATE public.plans SET is_active = false WHERE name = 'solo';
