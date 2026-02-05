-- Add customer_branch_code to quotations table
-- เพิ่ม column สำหรับเก็บรหัสสาขาของลูกค้าในใบเสนอราคา (เหมือนกับ invoices)

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS customer_branch_code TEXT DEFAULT '00000';

-- Add customer_name_en for consistency with invoices
ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS customer_name_en TEXT;
