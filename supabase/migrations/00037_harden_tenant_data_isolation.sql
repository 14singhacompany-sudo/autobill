-- Reset business-data policies so every authenticated request is isolated by
-- company_settings.user_id. Admin pages use the server-side service-role client
-- and therefore do not need broad client-side SELECT policies.

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.company_settings WHERE user_id = auth.uid() LIMIT 1;
$$;

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'company_settings', 'customers', 'products',
    'quotations', 'quotation_items',
    'invoices', 'invoice_items',
    'receipts', 'receipt_items',
    'billing_invoices', 'billing_invoice_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    FOR policy_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY tenant_company_settings_select ON public.company_settings FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY tenant_company_settings_insert ON public.company_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY tenant_company_settings_update ON public.company_settings FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY tenant_customers_select ON public.customers FOR SELECT
  USING (company_id = public.get_user_company_id());
CREATE POLICY tenant_customers_insert ON public.customers FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_customers_update ON public.customers FOR UPDATE
  USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_customers_delete ON public.customers FOR DELETE
  USING (company_id = public.get_user_company_id());

CREATE POLICY tenant_products_select ON public.products FOR SELECT
  USING (company_id = public.get_user_company_id());
CREATE POLICY tenant_products_insert ON public.products FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_products_update ON public.products FOR UPDATE
  USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_products_delete ON public.products FOR DELETE
  USING (company_id = public.get_user_company_id());

CREATE POLICY tenant_quotations_select ON public.quotations FOR SELECT
  USING (company_id = public.get_user_company_id());
CREATE POLICY tenant_quotations_insert ON public.quotations FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_quotations_update ON public.quotations FOR UPDATE
  USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_quotations_delete ON public.quotations FOR DELETE
  USING (company_id = public.get_user_company_id());

CREATE POLICY tenant_quotation_items_select ON public.quotation_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quotations parent WHERE parent.id = quotation_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_quotation_items_insert ON public.quotation_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.quotations parent WHERE parent.id = quotation_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_quotation_items_update ON public.quotation_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.quotations parent WHERE parent.id = quotation_id AND parent.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quotations parent WHERE parent.id = quotation_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_quotation_items_delete ON public.quotation_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.quotations parent WHERE parent.id = quotation_id AND parent.company_id = public.get_user_company_id()));

CREATE POLICY tenant_invoices_select ON public.invoices FOR SELECT
  USING (company_id = public.get_user_company_id());
CREATE POLICY tenant_invoices_insert ON public.invoices FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_invoices_update ON public.invoices FOR UPDATE
  USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_invoices_delete ON public.invoices FOR DELETE
  USING (company_id = public.get_user_company_id());

CREATE POLICY tenant_invoice_items_select ON public.invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.invoices parent WHERE parent.id = invoice_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_invoice_items_insert ON public.invoice_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices parent WHERE parent.id = invoice_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_invoice_items_update ON public.invoice_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.invoices parent WHERE parent.id = invoice_id AND parent.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices parent WHERE parent.id = invoice_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_invoice_items_delete ON public.invoice_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.invoices parent WHERE parent.id = invoice_id AND parent.company_id = public.get_user_company_id()));

CREATE POLICY tenant_receipts_select ON public.receipts FOR SELECT
  USING (company_id = public.get_user_company_id());
CREATE POLICY tenant_receipts_insert ON public.receipts FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_receipts_update ON public.receipts FOR UPDATE
  USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_receipts_delete ON public.receipts FOR DELETE
  USING (company_id = public.get_user_company_id());

CREATE POLICY tenant_receipt_items_select ON public.receipt_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.receipts parent WHERE parent.id = receipt_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_receipt_items_insert ON public.receipt_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.receipts parent WHERE parent.id = receipt_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_receipt_items_update ON public.receipt_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.receipts parent WHERE parent.id = receipt_id AND parent.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.receipts parent WHERE parent.id = receipt_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_receipt_items_delete ON public.receipt_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.receipts parent WHERE parent.id = receipt_id AND parent.company_id = public.get_user_company_id()));

CREATE POLICY tenant_billing_invoices_select ON public.billing_invoices FOR SELECT
  USING (company_id = public.get_user_company_id());
CREATE POLICY tenant_billing_invoices_insert ON public.billing_invoices FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_billing_invoices_update ON public.billing_invoices FOR UPDATE
  USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY tenant_billing_invoices_delete ON public.billing_invoices FOR DELETE
  USING (company_id = public.get_user_company_id());

CREATE POLICY tenant_billing_invoice_items_select ON public.billing_invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.billing_invoices parent WHERE parent.id = billing_invoice_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_billing_invoice_items_insert ON public.billing_invoice_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.billing_invoices parent WHERE parent.id = billing_invoice_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_billing_invoice_items_update ON public.billing_invoice_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.billing_invoices parent WHERE parent.id = billing_invoice_id AND parent.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.billing_invoices parent WHERE parent.id = billing_invoice_id AND parent.company_id = public.get_user_company_id()));
CREATE POLICY tenant_billing_invoice_items_delete ON public.billing_invoice_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.billing_invoices parent WHERE parent.id = billing_invoice_id AND parent.company_id = public.get_user_company_id()));

GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
