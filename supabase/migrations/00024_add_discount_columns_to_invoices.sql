-- Migration: Add discount1 and discount2 columns to invoices table
-- เพิ่มระบบส่วนลด 2 ชั้นให้ table invoices (เหมือนกับ billing_invoices)

-- ส่วนลด 1: ส่วนลดสินค้า
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount1_type text DEFAULT 'fixed';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount1_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount1_amount numeric(15,2) DEFAULT 0;

-- ส่วนลด 2: ส่วนลดเพิ่มเติม
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount2_type text DEFAULT 'fixed';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount2_value numeric(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount2_amount numeric(15,2) DEFAULT 0;

-- เพิ่ม customer_name_en ถ้ายังไม่มี
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_name_en text;

-- เพิ่ม sales_channel ถ้ายังไม่มี
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sales_channel text;
