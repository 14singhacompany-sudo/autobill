-- e-Tax Invoice & e-Receipt integration is not enabled yet.
-- Limit the advertised email feature to quotations and billing invoices.
UPDATE public.plans
SET features = (
  SELECT jsonb_agg(
    CASE
      WHEN feature = '"ส่งอีเมลให้ลูกค้า"'::jsonb
        THEN '"ส่งใบเสนอราคาและใบแจ้งหนี้ทางอีเมล"'::jsonb
      ELSE feature
    END
  )
  FROM jsonb_array_elements(features) AS feature
)
WHERE features @> '["ส่งอีเมลให้ลูกค้า"]'::jsonb;
