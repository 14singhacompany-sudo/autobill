-- Always calculate and enforce quota from the latest active subscription.
-- Older subscriptions may remain as history after a plan upgrade.

CREATE OR REPLACE FUNCTION public.get_combined_document_usage(p_company_id uuid)
RETURNS TABLE(document_count integer, document_limit integer, is_within_limit boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(usage.document_count, 0), plan.document_limit,
         plan.document_limit IS NULL OR coalesce(usage.document_count, 0) < plan.document_limit
    FROM public.subscriptions subscription
    JOIN public.plans plan ON plan.id = subscription.plan_id
    LEFT JOIN public.usage_logs usage
      ON usage.company_id = subscription.company_id
     AND usage.month_year = to_char(now(), 'YYYY-MM')
   WHERE subscription.company_id = p_company_id
     AND subscription.status IN ('active', 'trial')
     AND EXISTS (
       SELECT 1 FROM public.companies company
        WHERE company.id = p_company_id AND company.user_id = auth.uid()
     )
   ORDER BY subscription.updated_at DESC NULLS LAST, subscription.created_at DESC
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforce_combined_document_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canonical_company_id uuid;
  owner_user_id uuid;
  monthly_limit integer;
  updated_id uuid;
  old_status text;
  new_status text := NEW.status::text;
BEGIN
  old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text ELSE NULL END;
  IF new_status IN ('draft', 'cancelled')
     OR (TG_OP = 'UPDATE' AND old_status NOT IN ('draft', 'cancelled')) THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO owner_user_id
    FROM public.company_settings WHERE id = NEW.company_id;
  SELECT id INTO canonical_company_id
    FROM public.companies WHERE user_id = owner_user_id LIMIT 1;
  IF canonical_company_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบบริษัทของผู้ใช้งาน';
  END IF;

  SELECT plan.document_limit INTO monthly_limit
    FROM public.subscriptions subscription
    JOIN public.plans plan ON plan.id = subscription.plan_id
   WHERE subscription.company_id = canonical_company_id
     AND subscription.status IN ('active', 'trial')
   ORDER BY subscription.updated_at DESC NULLS LAST, subscription.created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบแพ็กเกจที่ใช้งานได้'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usage_logs
     WHERE company_id = canonical_company_id
       AND month_year = to_char(now(), 'YYYY-MM')
  ) THEN
    INSERT INTO public.usage_logs (company_id, month_year, document_count)
    VALUES (canonical_company_id, to_char(now(), 'YYYY-MM'), 0);
  END IF;

  UPDATE public.usage_logs
     SET document_count = document_count + 1, updated_at = now()
   WHERE company_id = canonical_company_id
     AND month_year = to_char(now(), 'YYYY-MM')
     AND (monthly_limit IS NULL OR document_count < monthly_limit)
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RAISE EXCEPTION 'โควตาเอกสารรวมของเดือนนี้ครบแล้ว กรุณาอัปเกรดแพ็กเกจ';
  END IF;
  RETURN NEW;
END;
$$;
