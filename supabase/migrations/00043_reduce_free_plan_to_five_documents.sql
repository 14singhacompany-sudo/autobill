-- Limit every free plan to five issued documents combined per month.
-- Existing free subscriptions reference the same plan row, so this applies
-- immediately without replacing or recreating any subscription.
UPDATE public.plans
SET
  document_limit = 5,
  invoice_limit = 5,
  quotation_limit = 5,
  features = '["5 เอกสารรวม/เดือน","ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษี","แยกข้อมูลลูกค้าอัตโนมัติ","ดาวน์โหลด PDF","ลูกค้า/สินค้าไม่จำกัด","เก็บข้อมูลบน Cloud","แบ่งงวดงานสูงสุด 2 งวด","แจ้งเตือนในวันที่ครบกำหนด"]'::jsonb,
  updated_at = now()
WHERE lower(name) = 'free' OR price_monthly = 0;
