-- =====================================================
-- AUTO BILL DATABASE SCHEMA
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE customer_type AS ENUM ('individual', 'company');
CREATE TYPE product_type AS ENUM ('product', 'service');
CREATE TYPE unit_type AS ENUM (
    'piece', 'set', 'box', 'pack', 'dozen',
    'kg', 'g', 'ton',
    'liter', 'ml',
    'meter', 'cm', 'inch', 'foot',
    'sqm', 'sqft',
    'hour', 'day', 'month', 'year',
    'job', 'trip', 'time',
    'other'
);
CREATE TYPE document_status AS ENUM (
    'draft', 'pending', 'approved', 'rejected', 'expired', 'converted'
);
CREATE TYPE invoice_status AS ENUM (
    'draft', 'issued', 'sent', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'
);
CREATE TYPE invoice_type AS ENUM (
    'full_tax_invoice', 'abbreviated_tax_invoice', 'receipt_tax_invoice', 'credit_note', 'debit_note'
);

-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- =====================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPANIES TABLE
-- =====================================================

CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Company Info
    name TEXT NOT NULL,
    name_en TEXT,
    tax_id TEXT,
    branch_code TEXT DEFAULT '00000',
    branch_name TEXT DEFAULT 'สำนักงานใหญ่',

    -- Address
    address TEXT,
    address_en TEXT,
    sub_district TEXT,
    district TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'ไทย',

    -- Contact
    phone TEXT,
    fax TEXT,
    email TEXT,
    website TEXT,

    -- Branding
    logo_url TEXT,
    signature_url TEXT,
    stamp_url TEXT,

    -- Document Settings
    quotation_prefix TEXT DEFAULT 'QT',
    quotation_next_number INTEGER DEFAULT 1,
    invoice_prefix TEXT DEFAULT 'IV',
    invoice_next_number INTEGER DEFAULT 1,

    -- Defaults
    default_payment_terms INTEGER DEFAULT 30,
    default_validity_days INTEGER DEFAULT 30,
    default_vat_rate DECIMAL(5,2) DEFAULT 7.00,

    -- Bank Account
    bank_name TEXT,
    bank_branch TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================

CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

    customer_type customer_type DEFAULT 'company',
    customer_code TEXT,

    name TEXT NOT NULL,
    name_en TEXT,
    tax_id TEXT,
    branch_code TEXT DEFAULT '00000',
    branch_name TEXT,

    contact_name TEXT,
    contact_position TEXT,

    address TEXT,
    sub_district TEXT,
    district TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'ไทย',

    phone TEXT,
    fax TEXT,
    email TEXT,

    payment_terms INTEGER DEFAULT 30,
    credit_limit DECIMAL(15,2),

    notes TEXT,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_name ON customers(name);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

    product_code TEXT,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,

    product_type product_type DEFAULT 'product',
    category TEXT,

    unit unit_type DEFAULT 'piece',
    unit_custom TEXT,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(15,2),

    is_vat_inclusive BOOLEAN DEFAULT false,
    vat_rate DECIMAL(5,2) DEFAULT 7.00,

    track_inventory BOOLEAN DEFAULT false,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_alert INTEGER,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_name ON products(name);

-- =====================================================
-- QUOTATIONS TABLE
-- =====================================================

CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,

    quotation_number TEXT NOT NULL,
    reference_number TEXT,

    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,

    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_tax_id TEXT,
    customer_contact TEXT,
    customer_phone TEXT,
    customer_email TEXT,

    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_type TEXT DEFAULT 'fixed',
    discount_value DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    amount_before_vat DECIMAL(15,2) DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 7.00,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    notes TEXT,
    terms_conditions TEXT,
    internal_notes TEXT,

    status document_status DEFAULT 'draft',

    sent_at TIMESTAMPTZ,
    sent_to_email TEXT,
    viewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    rejected_at TIMESTAMPTZ,
    rejected_reason TEXT,

    converted_to_invoice_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,

    item_order INTEGER NOT NULL DEFAULT 0,
    product_code TEXT,
    description TEXT NOT NULL,

    quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'ชิ้น',
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,

    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,

    amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotations_company ON quotations(company_id);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id);

-- =====================================================
-- INVOICES TABLE
-- =====================================================

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,

    invoice_type invoice_type DEFAULT 'full_tax_invoice',
    invoice_number TEXT NOT NULL,
    reference_number TEXT,
    po_number TEXT,

    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_tax_id TEXT,
    customer_branch_code TEXT,
    customer_contact TEXT,
    customer_phone TEXT,
    customer_email TEXT,

    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_type TEXT DEFAULT 'fixed',
    discount_value DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    amount_before_vat DECIMAL(15,2) DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 7.00,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    withholding_tax_rate DECIMAL(5,2) DEFAULT 0,
    withholding_tax_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    paid_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) DEFAULT 0,

    notes TEXT,
    terms_conditions TEXT,
    internal_notes TEXT,

    status invoice_status DEFAULT 'draft',

    sent_at TIMESTAMPTZ,
    sent_to_email TEXT,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,

    item_order INTEGER NOT NULL DEFAULT 0,
    product_code TEXT,
    description TEXT NOT NULL,

    quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'ชิ้น',
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,

    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,

    amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method TEXT,
    reference_number TEXT,

    bank_name TEXT,
    transferred_from TEXT,
    transfer_time TIMESTAMPTZ,

    proof_url TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Companies policies
CREATE POLICY "Users can view own company" ON companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company" ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company" ON companies FOR UPDATE USING (auth.uid() = user_id);

-- Helper function
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
    SELECT id FROM companies WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Customers policies
CREATE POLICY "Users can view own customers" ON customers FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can insert own customers" ON customers FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update own customers" ON customers FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Users can delete own customers" ON customers FOR DELETE USING (company_id = get_user_company_id());

-- Products policies
CREATE POLICY "Users can view own products" ON products FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (company_id = get_user_company_id());

-- Quotations policies
CREATE POLICY "Users can view own quotations" ON quotations FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can insert own quotations" ON quotations FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update own quotations" ON quotations FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Users can delete own quotations" ON quotations FOR DELETE USING (company_id = get_user_company_id());

-- Quotation items policies
CREATE POLICY "Users can view own quotation items" ON quotation_items FOR SELECT
    USING (quotation_id IN (SELECT id FROM quotations WHERE company_id = get_user_company_id()));
CREATE POLICY "Users can insert own quotation items" ON quotation_items FOR INSERT
    WITH CHECK (quotation_id IN (SELECT id FROM quotations WHERE company_id = get_user_company_id()));
CREATE POLICY "Users can update own quotation items" ON quotation_items FOR UPDATE
    USING (quotation_id IN (SELECT id FROM quotations WHERE company_id = get_user_company_id()));
CREATE POLICY "Users can delete own quotation items" ON quotation_items FOR DELETE
    USING (quotation_id IN (SELECT id FROM quotations WHERE company_id = get_user_company_id()));

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update own invoices" ON invoices FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Users can delete own invoices" ON invoices FOR DELETE USING (company_id = get_user_company_id());

-- Invoice items policies
CREATE POLICY "Users can view own invoice items" ON invoice_items FOR SELECT
    USING (invoice_id IN (SELECT id FROM invoices WHERE company_id = get_user_company_id()));
CREATE POLICY "Users can insert own invoice items" ON invoice_items FOR INSERT
    WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE company_id = get_user_company_id()));
CREATE POLICY "Users can update own invoice items" ON invoice_items FOR UPDATE
    USING (invoice_id IN (SELECT id FROM invoices WHERE company_id = get_user_company_id()));
CREATE POLICY "Users can delete own invoice items" ON invoice_items FOR DELETE
    USING (invoice_id IN (SELECT id FROM invoices WHERE company_id = get_user_company_id()));

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments FOR SELECT
    USING (invoice_id IN (SELECT id FROM invoices WHERE company_id = get_user_company_id()));
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT
    WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE company_id = get_user_company_id()));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- FUNCTION TO CREATE PROFILE ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
