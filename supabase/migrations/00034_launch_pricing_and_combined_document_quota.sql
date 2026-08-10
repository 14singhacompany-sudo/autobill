-- Launch pricing and one combined monthly quota across every document type.
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS document_limit integer;
ALTER TABLE public.usage_logs ADD COLUMN IF NOT EXISTS document_count integer NOT NULL DEFAULT 0;

UPDATE public.plans SET price_monthly = 0, document_limit = 20,
  features = '["20 เอกสารรวม/เดือน","ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษี","แยกข้อมูลลูกค้าอัตโนมัติ","ดาวน์โหลด PDF","ลูกค้า/สินค้าไม่จำกัด","เก็บข้อมูลบน Cloud"]'::jsonb,
  updated_at = NOW() WHERE name = 'free';
UPDATE public.plans SET price_monthly = 149, document_limit = 100,
  features = '["100 เอกสารรวม/เดือน","ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษี","แยกข้อมูลลูกค้าอัตโนมัติ","ดาวน์โหลด PDF","ลูกค้า/สินค้าไม่จำกัด","เก็บข้อมูลบน Cloud"]'::jsonb,
  updated_at = NOW() WHERE name = 'solo';
UPDATE public.plans SET price_monthly = 249, document_limit = NULL,
  features = '["เอกสารรวมไม่จำกัด","ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษี","แยกข้อมูลลูกค้าอัตโนมัติ","ดาวน์โหลด PDF","ลูกค้า/สินค้าไม่จำกัด","เก็บข้อมูลบน Cloud"]'::jsonb,
  updated_at = NOW() WHERE name = 'pro';

UPDATE public.subscriptions AS subscription
SET status = 'active', trial_ends_at = NULL, current_period_start = NULL,
    current_period_end = NULL, updated_at = NOW()
FROM public.plans AS plan
WHERE subscription.plan_id = plan.id AND plan.name = 'free' AND subscription.status = 'trial';

-- Ensure every company has a usage row for this month without ON CONFLICT.
DO $$
DECLARE
  company_row record;
BEGIN
  FOR company_row IN SELECT id FROM public.companies LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.usage_logs
      WHERE company_id = company_row.id AND month_year = to_char(now(), 'YYYY-MM')
    ) THEN
      INSERT INTO public.usage_logs (company_id, month_year, document_count)
      VALUES (company_row.id, to_char(now(), 'YYYY-MM'), 0);
    END IF;
  END LOOP;
END;
$$;

-- Recalculate this month's issued-document total in one idempotent UPDATE.
UPDATE public.usage_logs AS usage
SET document_count =
  (SELECT count(*)::integer FROM public.quotations AS q
    JOIN public.company_settings AS settings ON settings.id = q.company_id
   WHERE settings.user_id = company.user_id
     AND q.status::text <> 'draft'
     AND q.created_at >= date_trunc('month', now()))
  +
  (SELECT count(*)::integer FROM public.invoices AS i
    JOIN public.company_settings AS settings ON settings.id = i.company_id
   WHERE settings.user_id = company.user_id
     AND i.status::text NOT IN ('draft', 'cancelled')
     AND i.created_at >= date_trunc('month', now()))
  +
  (SELECT count(*)::integer FROM public.receipts AS r
    JOIN public.company_settings AS settings ON settings.id = r.company_id
   WHERE settings.user_id = company.user_id
     AND r.status NOT IN ('draft', 'cancelled')
     AND r.created_at >= date_trunc('month', now()))
  +
  (SELECT count(*)::integer FROM public.billing_invoices AS b
    JOIN public.company_settings AS settings ON settings.id = b.company_id
   WHERE settings.user_id = company.user_id
     AND b.status NOT IN ('draft', 'cancelled')
     AND b.created_at >= date_trunc('month', now())),
  updated_at = now()
FROM public.companies AS company
WHERE usage.company_id = company.id
  AND usage.month_year = to_char(now(), 'YYYY-MM');

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
  IF new_status IN ('draft', 'cancelled') OR (TG_OP = 'UPDATE' AND old_status NOT IN ('draft', 'cancelled')) THEN
    RETURN NEW;
  END IF;

  -- Every document table uses company_settings.id, while subscriptions and
  -- usage_logs use companies.id. Resolve the canonical ID through the owner.
  SELECT user_id INTO owner_user_id FROM public.company_settings WHERE id = NEW.company_id;
  SELECT id INTO canonical_company_id FROM public.companies WHERE user_id = owner_user_id LIMIT 1;
  IF canonical_company_id IS NULL THEN RAISE EXCEPTION 'ไม่พบบริษัทของผู้ใช้งาน'; END IF;

  SELECT plan.document_limit INTO monthly_limit
    FROM public.subscriptions subscription
    JOIN public.plans plan ON plan.id = subscription.plan_id
   WHERE subscription.company_id = canonical_company_id
     AND subscription.status IN ('active', 'trial')
   LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบแพ็กเกจที่ใช้งานได้'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usage_logs
    WHERE company_id = canonical_company_id AND month_year = to_char(now(), 'YYYY-MM')
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

DROP TRIGGER IF EXISTS enforce_combined_quota_quotations ON public.quotations;
CREATE TRIGGER enforce_combined_quota_quotations BEFORE INSERT OR UPDATE OF status ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.enforce_combined_document_quota();
DROP TRIGGER IF EXISTS enforce_combined_quota_invoices ON public.invoices;
CREATE TRIGGER enforce_combined_quota_invoices BEFORE INSERT OR UPDATE OF status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.enforce_combined_document_quota();
DROP TRIGGER IF EXISTS enforce_combined_quota_receipts ON public.receipts;
CREATE TRIGGER enforce_combined_quota_receipts BEFORE INSERT OR UPDATE OF status ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.enforce_combined_document_quota();
DROP TRIGGER IF EXISTS enforce_combined_quota_billing_invoices ON public.billing_invoices;
CREATE TRIGGER enforce_combined_quota_billing_invoices BEFORE INSERT OR UPDATE OF status ON public.billing_invoices
FOR EACH ROW EXECUTE FUNCTION public.enforce_combined_document_quota();

CREATE OR REPLACE FUNCTION public.get_combined_document_usage(p_company_id uuid)
RETURNS TABLE(document_count integer, document_limit integer, is_within_limit boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(usage.document_count, 0), plan.document_limit,
         plan.document_limit IS NULL OR coalesce(usage.document_count, 0) < plan.document_limit
    FROM public.subscriptions subscription
    JOIN public.plans plan ON plan.id = subscription.plan_id
    LEFT JOIN public.usage_logs usage ON usage.company_id = subscription.company_id AND usage.month_year = to_char(now(), 'YYYY-MM')
   WHERE subscription.company_id = p_company_id
     AND EXISTS (SELECT 1 FROM public.companies company WHERE company.id = p_company_id AND company.user_id = auth.uid())
   LIMIT 1;
$$;

DROP POLICY IF EXISTS "Admins can view all receipts" ON public.receipts;
CREATE POLICY "Admins can view all receipts" ON public.receipts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can view all billing invoices" ON public.billing_invoices;
CREATE POLICY "Admins can view all billing invoices" ON public.billing_invoices FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
