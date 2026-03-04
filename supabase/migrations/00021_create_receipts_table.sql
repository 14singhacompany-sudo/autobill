-- Migration: Create receipts table for standalone receipts (ใบเสร็จรับเงิน)
-- This is separate from invoices (ใบกำกับภาษี)

-- Create receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.company_settings(id) ON DELETE CASCADE,
    receipt_number text NOT NULL,

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

    -- ยอดเงิน
    subtotal numeric(15,2) NOT NULL DEFAULT 0,
    discount_type text DEFAULT 'fixed',
    discount_value numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    amount_before_vat numeric(15,2) NOT NULL DEFAULT 0,
    vat_rate numeric(5,2) DEFAULT 0,
    vat_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) NOT NULL DEFAULT 0,

    -- หมายเหตุ
    notes text DEFAULT '',
    payment_method text DEFAULT '',

    -- สถานะ
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),

    -- ช่องทางการขาย
    sales_channel text,

    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create receipt_items table
CREATE TABLE IF NOT EXISTS public.receipt_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_id uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_receipts_company_id ON public.receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_issue_date ON public.receipts(issue_date);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);

-- Composite unique constraint (company_id + receipt_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_company_number
    ON public.receipts(company_id, receipt_number);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for receipts
CREATE POLICY "Users can view own receipts" ON public.receipts
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own receipts" ON public.receipts
    FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own receipts" ON public.receipts
    FOR UPDATE USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own receipts" ON public.receipts
    FOR DELETE USING (company_id = get_user_company_id());

-- RLS Policies for receipt_items
CREATE POLICY "Users can view own receipt items" ON public.receipt_items
    FOR SELECT USING (
        receipt_id IN (SELECT id FROM public.receipts WHERE company_id = get_user_company_id())
    );

CREATE POLICY "Users can insert own receipt items" ON public.receipt_items
    FOR INSERT WITH CHECK (
        receipt_id IN (SELECT id FROM public.receipts WHERE company_id = get_user_company_id())
    );

CREATE POLICY "Users can update own receipt items" ON public.receipt_items
    FOR UPDATE USING (
        receipt_id IN (SELECT id FROM public.receipts WHERE company_id = get_user_company_id())
    );

CREATE POLICY "Users can delete own receipt items" ON public.receipt_items
    FOR DELETE USING (
        receipt_id IN (SELECT id FROM public.receipts WHERE company_id = get_user_company_id())
    );

-- Add rc_prefix to company_settings if not exists
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS rc_prefix text DEFAULT 'RC';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipts_updated_at
    BEFORE UPDATE ON public.receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_receipts_updated_at();
