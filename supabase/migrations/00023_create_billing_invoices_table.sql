-- Migration: Create billing_invoices table (ใบแจ้งหนี้)
-- This is separate from invoices (ใบกำกับภาษี) and receipts (ใบเสร็จรับเงิน)

-- Create billing_invoices table
CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.company_settings(id) ON DELETE CASCADE,
    invoice_number text NOT NULL,

    -- ข้อมูลลูกค้า
    customer_name text NOT NULL DEFAULT '',
    customer_name_en text,
    customer_address text DEFAULT '',
    customer_tax_id text DEFAULT '',
    customer_branch_code text DEFAULT '00000',
    customer_contact text DEFAULT '',
    customer_phone text DEFAULT '',
    customer_email text DEFAULT '',

    -- วันที่
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),

    -- ยอดเงิน
    subtotal numeric(15,2) NOT NULL DEFAULT 0,
    discount_type text DEFAULT 'fixed',
    discount_value numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    amount_before_vat numeric(15,2) NOT NULL DEFAULT 0,
    vat_rate numeric(5,2) DEFAULT 7,
    vat_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) NOT NULL DEFAULT 0,

    -- หมายเหตุและเงื่อนไข
    notes text DEFAULT '',
    payment_terms text DEFAULT 'ชำระภายใน 30 วัน',

    -- สถานะ: draft, issued, paid, overdue, cancelled
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled')),

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create billing_invoice_items table
CREATE TABLE IF NOT EXISTS public.billing_invoice_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    billing_invoice_id uuid NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
    item_order integer NOT NULL DEFAULT 1,
    description text NOT NULL,
    quantity numeric(15,2) NOT NULL DEFAULT 1,
    unit text NOT NULL DEFAULT 'ชิ้น',
    unit_price numeric(15,2) NOT NULL DEFAULT 0,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    amount numeric(15,2) NOT NULL DEFAULT 0,
    price_includes_vat boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_invoices_company_id ON public.billing_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_issue_date ON public.billing_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_due_date ON public.billing_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_items_billing_invoice_id ON public.billing_invoice_items(billing_invoice_id);

-- Composite unique constraint (company_id + invoice_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_invoices_company_number
    ON public.billing_invoices(company_id, invoice_number);

-- Enable RLS
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billing_invoices
CREATE POLICY "Users can view own billing invoices" ON public.billing_invoices
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own billing invoices" ON public.billing_invoices
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own billing invoices" ON public.billing_invoices
    FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own billing invoices" ON public.billing_invoices
    FOR DELETE USING (company_id = get_user_company_id());

-- RLS Policies for billing_invoice_items
CREATE POLICY "Users can view own billing invoice items" ON public.billing_invoice_items
    FOR SELECT USING (
        billing_invoice_id IN (SELECT id FROM public.billing_invoices WHERE company_id = get_user_company_id())
    );

CREATE POLICY "Users can insert own billing invoice items" ON public.billing_invoice_items
    FOR INSERT WITH CHECK (
        billing_invoice_id IN (SELECT id FROM public.billing_invoices WHERE company_id = get_user_company_id())
    );

CREATE POLICY "Users can update own billing invoice items" ON public.billing_invoice_items
    FOR UPDATE USING (
        billing_invoice_id IN (SELECT id FROM public.billing_invoices WHERE company_id = get_user_company_id())
    );

CREATE POLICY "Users can delete own billing invoice items" ON public.billing_invoice_items
    FOR DELETE USING (
        billing_invoice_id IN (SELECT id FROM public.billing_invoices WHERE company_id = get_user_company_id())
    );

-- Add bi_prefix to company_settings if not exists (BI = Billing Invoice)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS bi_prefix text DEFAULT 'BI';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_billing_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_invoices_updated_at
    BEFORE UPDATE ON public.billing_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_invoices_updated_at();
