-- Add stamp and signature columns to company_settings table
-- For company stamp (ตราประทับบริษัท) and authorized signature (ลายเซ็นผู้มีอำนาจ)

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS stamp_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS signature_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS signatory_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS signatory_position TEXT DEFAULT '';

-- Add comments for documentation
COMMENT ON COLUMN company_settings.stamp_url IS 'URL of company stamp image';
COMMENT ON COLUMN company_settings.signature_url IS 'URL of authorized signature image';
COMMENT ON COLUMN company_settings.signatory_name IS 'Name of the person authorized to sign documents';
COMMENT ON COLUMN company_settings.signatory_position IS 'Position/title of the authorized signatory';
