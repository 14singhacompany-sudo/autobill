export type CustomerType = "individual" | "company";
export type ProductType = "product" | "service";
export type UnitType =
  | "piece"
  | "set"
  | "box"
  | "pack"
  | "dozen"
  | "kg"
  | "g"
  | "ton"
  | "liter"
  | "ml"
  | "meter"
  | "cm"
  | "inch"
  | "foot"
  | "sqm"
  | "sqft"
  | "hour"
  | "day"
  | "month"
  | "year"
  | "job"
  | "trip"
  | "time"
  | "other";

export type DocumentStatus =
  | "draft"
  | "sent"
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "converted";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "sent"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";

export type InvoiceType =
  | "full_tax_invoice"
  | "abbreviated_tax_invoice"
  | "receipt_tax_invoice"
  | "credit_note"
  | "debit_note";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  name_en: string | null;
  tax_id: string | null;
  branch_code: string;
  branch_name: string;
  address: string | null;
  address_en: string | null;
  sub_district: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  signature_url: string | null;
  stamp_url: string | null;
  quotation_prefix: string;
  quotation_next_number: number;
  invoice_prefix: string;
  invoice_next_number: number;
  default_payment_terms: number;
  default_validity_days: number;
  default_vat_rate: number;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  customer_type: CustomerType;
  customer_code: string | null;
  name: string;
  name_en: string | null;
  tax_id: string | null;
  branch_code: string;
  branch_name: string | null;
  contact_name: string | null;
  contact_position: string | null;
  address: string | null;
  sub_district: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  fax: string | null;
  email: string | null;
  payment_terms: number;
  credit_limit: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  product_code: string | null;
  name: string;
  name_en: string | null;
  description: string | null;
  product_type: ProductType;
  category: string | null;
  unit: UnitType;
  unit_custom: string | null;
  unit_price: number;
  cost_price: number | null;
  is_vat_inclusive: boolean;
  vat_rate: number;
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_alert: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  company_id: string;
  customer_id: string | null;
  quotation_number: string;
  reference_number: string | null;
  issue_date: string;
  valid_until: string | null;
  customer_name: string;
  customer_name_en: string | null;
  customer_address: string | null;
  customer_tax_id: string | null;
  customer_branch_code: string | null;
  customer_contact: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  subtotal: number;
  discount_type: "fixed" | "percent";
  discount_value: number;
  discount_amount: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes: string | null;
  terms_conditions: string | null;
  internal_notes: string | null;
  sales_channel: string | null;
  status: DocumentStatus;
  sent_at: string | null;
  sent_to_email: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  converted_to_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  items?: QuotationItem[];
  customer?: Customer;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  item_order: number;
  product_code: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  amount: number;
  price_includes_vat: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string | null;
  quotation_id: string | null;
  invoice_type: InvoiceType;
  invoice_number: string;
  reference_number: string | null;
  po_number: string | null;
  issue_date: string;
  due_date: string | null;
  customer_name: string;
  customer_name_en: string | null;
  customer_address: string | null;
  customer_tax_id: string | null;
  customer_branch_code: string | null;
  customer_contact: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  subtotal: number;
  discount_type: "fixed" | "percent";
  discount_value: number;
  discount_amount: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  withholding_tax_rate: number;
  withholding_tax_amount: number;
  net_amount: number;
  paid_amount: number;
  remaining_amount: number;
  notes: string | null;
  terms_conditions: string | null;
  internal_notes: string | null;
  sales_channel: string | null;
  status: InvoiceStatus;
  sent_at: string | null;
  sent_to_email: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  items?: InvoiceItem[];
  customer?: Customer;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  item_order: number;
  product_code: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  amount: number;
  price_includes_vat: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
  bank_name: string | null;
  transferred_from: string | null;
  transfer_time: string | null;
  proof_url: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ExtractedItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}
