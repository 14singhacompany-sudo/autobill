-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.company_settings(id) ON DELETE CASCADE,
  customer_type VARCHAR(20) NOT NULL DEFAULT 'company' CHECK (customer_type IN ('individual', 'company')),
  customer_code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  tax_id VARCHAR(20),
  branch_code VARCHAR(10) NOT NULL DEFAULT '00000',
  branch_name VARCHAR(100),
  contact_name VARCHAR(255),
  contact_position VARCHAR(100),
  address TEXT,
  sub_district VARCHAR(100),
  district VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(10),
  country VARCHAR(10) NOT NULL DEFAULT 'TH',
  phone VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(255),
  payment_terms INTEGER NOT NULL DEFAULT 30,
  credit_limit DECIMAL(15, 2),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_tax_id ON public.customers(tax_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for authenticated users)
CREATE POLICY "Enable read access for all users" ON public.customers
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.customers
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.customers
  FOR DELETE USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();
