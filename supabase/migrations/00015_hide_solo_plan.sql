-- Migration: Show all plans (FREE, SOLO, PRO)
-- All plans have AI feature, difference is only invoice/quotation limit

UPDATE public.plans SET is_active = true WHERE name = 'solo';
