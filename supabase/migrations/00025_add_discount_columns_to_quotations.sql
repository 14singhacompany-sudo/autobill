-- Migration: Add discount1 and discount2 columns to quotations table
-- เพิ่มระบบส่วนลด 2 ชั้นให้ table quotations (เหมือนกับ invoices)

-- ส่วนลด 1: ส่วนลดสินค้า
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS discount1_type text DEFAULT 'fixed';
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS discount1_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS discount1_amount numeric(15,2) DEFAULT 0;

-- ส่วนลด 2: ส่วนลดเพิ่มเติม
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS discount2_type text DEFAULT 'fixed';
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS discount2_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS discount2_amount numeric(15,2) DEFAULT 0;
