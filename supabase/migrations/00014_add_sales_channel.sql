-- Add sales_channel column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sales_channel TEXT;

-- Add sales_channel column to quotations table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sales_channel TEXT;

-- Add comment for documentation
COMMENT ON COLUMN invoices.sales_channel IS 'Sales channel: shopee, lazada, facebook, tiktok, or custom text';
COMMENT ON COLUMN quotations.sales_channel IS 'Sales channel: shopee, lazada, facebook, tiktok, or custom text';

