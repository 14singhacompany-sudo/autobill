-- Migration: Fix RLS with SECURITY DEFINER
-- สร้าง function get_user_company_id() ใหม่ด้วย SECURITY DEFINER
-- เพื่อให้ RLS policies ทำงานได้ถูกต้อง

-- ============================================
-- 1. สร้าง/อัพเดท function get_user_company_id()
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.company_settings
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================
-- 2. เปิด RLS สำหรับทุกตาราง
-- ============================================
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. ลบ policies เก่า (ถ้ามี)
-- ============================================
DROP POLICY IF EXISTS "Users can view own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can insert own company settings" ON public.company_settings;

DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;

DROP POLICY IF EXISTS "Users can view own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can insert own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can update own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can delete own invoice items" ON public.invoice_items;

DROP POLICY IF EXISTS "Users can view own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can insert own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can update own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can delete own quotations" ON public.quotations;

DROP POLICY IF EXISTS "Users can view own quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can insert own quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can update own quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can delete own quotation items" ON public.quotation_items;

DROP POLICY IF EXISTS "Users can view own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can insert own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete own receipts" ON public.receipts;

DROP POLICY IF EXISTS "Users can view own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can insert own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can update own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can delete own receipt items" ON public.receipt_items;

DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;

DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;

-- ============================================
-- 4. สร้าง RLS Policies ใหม่
-- ============================================

-- company_settings
CREATE POLICY "Users can view own company settings"
  ON public.company_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own company settings"
  ON public.company_settings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own company settings"
  ON public.company_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- invoices
CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE
  USING (company_id = get_user_company_id());

-- invoice_items (ผ่าน invoice)
CREATE POLICY "Users can view own invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can insert own invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can update own invoice items"
  ON public.invoice_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can delete own invoice items"
  ON public.invoice_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.company_id = get_user_company_id()
    )
  );

-- quotations
CREATE POLICY "Users can view own quotations"
  ON public.quotations FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own quotations"
  ON public.quotations FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own quotations"
  ON public.quotations FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own quotations"
  ON public.quotations FOR DELETE
  USING (company_id = get_user_company_id());

-- quotation_items (ผ่าน quotation)
CREATE POLICY "Users can view own quotation items"
  ON public.quotation_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
      AND quotations.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can insert own quotation items"
  ON public.quotation_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
      AND quotations.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can update own quotation items"
  ON public.quotation_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
      AND quotations.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can delete own quotation items"
  ON public.quotation_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations
      WHERE quotations.id = quotation_items.quotation_id
      AND quotations.company_id = get_user_company_id()
    )
  );

-- receipts
CREATE POLICY "Users can view own receipts"
  ON public.receipts FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own receipts"
  ON public.receipts FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own receipts"
  ON public.receipts FOR DELETE
  USING (company_id = get_user_company_id());

-- receipt_items (ผ่าน receipt)
CREATE POLICY "Users can view own receipt items"
  ON public.receipt_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = receipt_items.receipt_id
      AND receipts.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can insert own receipt items"
  ON public.receipt_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = receipt_items.receipt_id
      AND receipts.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can update own receipt items"
  ON public.receipt_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = receipt_items.receipt_id
      AND receipts.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Users can delete own receipt items"
  ON public.receipt_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts
      WHERE receipts.id = receipt_items.receipt_id
      AND receipts.company_id = get_user_company_id()
    )
  );

-- customers
CREATE POLICY "Users can view own customers"
  ON public.customers FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own customers"
  ON public.customers FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own customers"
  ON public.customers FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own customers"
  ON public.customers FOR DELETE
  USING (company_id = get_user_company_id());

-- products
CREATE POLICY "Users can view own products"
  ON public.products FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own products"
  ON public.products FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own products"
  ON public.products FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================
-- 5. Grant execute permission on function
-- ============================================
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO anon;
