-- Automatic extraction now runs locally (OCR/text parsing), so it has no API quota.
UPDATE public.plans
SET ai_extraction_limit = NULL,
    features = (
      SELECT jsonb_agg(
        CASE
          WHEN feature LIKE 'AI ดึงข้อมูลลูกค้า%' THEN 'แยกข้อมูลอัตโนมัติจากข้อความ/รูปภาพ'
          WHEN feature = '20 บิล/เดือน' THEN 'ใบกำกับภาษี 20 ใบ/เดือน'
          WHEN feature = '100 บิล/เดือน' THEN 'ใบกำกับภาษี 100 ใบ/เดือน'
          WHEN feature = 'บิลไม่จำกัด' THEN 'ใบกำกับภาษีไม่จำกัด'
          ELSE feature
        END
      )
      FROM jsonb_array_elements_text(features) AS feature
    ),
    updated_at = NOW()
WHERE name IN ('free', 'solo', 'pro');

-- FREE is free forever, not a 14-day trial. Normalize existing FREE trials.
UPDATE public.subscriptions AS subscription
SET status = 'active',
    trial_ends_at = NULL,
    current_period_start = NULL,
    current_period_end = NULL,
    updated_at = NOW()
FROM public.plans AS plan
WHERE subscription.plan_id = plan.id
  AND plan.name = 'free'
  AND subscription.status = 'trial';

CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id FROM public.plans WHERE name = 'free' LIMIT 1;
    INSERT INTO public.subscriptions (company_id, plan_id, status)
    VALUES (NEW.id, free_plan_id, 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Persist all required signup fields, including phone, from auth metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'phone', '')
    );

    INSERT INTO public.companies (user_id, name)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name', ''), 'บริษัทของฉัน')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
