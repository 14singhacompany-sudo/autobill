-- Add missing profiles for existing auth users
-- Run this to sync auth.users with profiles table

-- Create profiles for users that don't have one yet
INSERT INTO public.profiles (id, email, full_name)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Create companies for users that don't have one yet
INSERT INTO public.companies (user_id, name)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'company_name', 'บริษัทของฉัน')
FROM auth.users u
LEFT JOIN public.companies c ON c.user_id = u.id
WHERE c.user_id IS NULL;

-- Create subscriptions with FREE plan for companies that don't have one
INSERT INTO public.subscriptions (company_id, plan_id, status, trial_ends_at)
SELECT
    c.id,
    (SELECT id FROM public.plans WHERE name = 'free' LIMIT 1),
    'trial',
    NOW() + INTERVAL '14 days'
FROM public.companies c
LEFT JOIN public.subscriptions s ON s.company_id = c.id
WHERE s.company_id IS NULL;
