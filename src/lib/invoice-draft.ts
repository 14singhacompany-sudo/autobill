import type { ShopeeOrderImport } from "@/lib/shopee-import";
import {
  calculateInvoiceTotals,
  platformDiscountAmounts,
  type InvoiceTotals,
  type InvoiceTotalsInput,
} from "@/lib/invoice-totals";

export interface DraftInvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent?: number;
  price_includes_vat?: boolean;
}

/** Fields the invoice form and the draft API both persist. */
export interface DraftInvoiceInput extends InvoiceTotalsInput {
  quotation_id?: string | null;
  source_billing_invoice_id?: string | null;
  customer_name: string;
  customer_name_en?: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  issue_date: string;
  items: DraftInvoiceItem[];
  vat_rate: number;
  withholding_tax_rate: number;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  due_date: string;
  discount1_type: "fixed" | "percent";
  discount1_value: number;
  discount2_type: "fixed" | "percent";
  discount2_value: number;
  discount_type: "fixed" | "percent";
  discount_value: number;
  notes: string;
  terms_conditions: string;
  sales_channel?: string;
  platform_discount_amount?: number;
  shopee_coin_discount_amount?: number;
  payment_method_discount_amount?: number;
}

export interface CustomerMatchInput {
  customer_type: string;
  name: string;
  tax_id?: string;
  branch_code?: string;
  address?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
}

export type InvoiceDb = {
  from: (table: string) => any;
};

type InvoiceWriteError = {
  code?: string;
  message?: string;
};

export class InvoiceItemsInsertError extends Error {
  invoiceId: string;
  cause: unknown;

  constructor(invoiceId: string, cause: unknown) {
    super("Failed to insert invoice items");
    this.name = "InvoiceItemsInsertError";
    this.invoiceId = invoiceId;
    this.cause = cause;
  }
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function invoiceDateKey(issueDate: string): string {
  return issueDate.replace(/-/g, "");
}

export function nextInvoiceSequence(lastInvoiceNumber: string | null | undefined): number {
  if (!lastInvoiceNumber) return 1;
  const parts = lastInvoiceNumber.split("-");
  if (parts.length >= 3) {
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastSeq)) return lastSeq + 1;
  }
  return 1;
}

export function formatInvoiceNumber(prefix: string, dateKey: string, sequence: number): string {
  return `${prefix}-${dateKey}-${String(sequence).padStart(4, "0")}`;
}

export function defaultDueDate(issueDate: string, dueDays: number): string {
  const days = Number(dueDays) || 0;
  if (days === 0) return issueDate || getLocalDateString();
  const baseDate = issueDate ? new Date(issueDate) : new Date();
  return getLocalDateString(new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000));
}

export function blankDraftInvoiceForm(issueDate: string, dueDate: string): DraftInvoiceInput {
  return {
    customer_name: "",
    customer_name_en: "",
    customer_address: "",
    customer_tax_id: "",
    customer_branch_code: "00000",
    issue_date: issueDate,
    items: [],
    vat_rate: 7,
    withholding_tax_rate: 0,
    customer_contact: "",
    customer_phone: "",
    customer_email: "",
    due_date: dueDate,
    discount1_type: "fixed",
    discount1_value: 0,
    discount2_type: "fixed",
    discount2_value: 0,
    discount_type: "fixed",
    discount_value: 0,
    notes: "",
    terms_conditions: "",
    sales_channel: "",
    platform_discount_amount: 0,
    shopee_coin_discount_amount: 0,
    payment_method_discount_amount: 0,
  };
}

export function applyShopeeOrderToInvoiceForm<T extends DraftInvoiceInput>(
  prev: T,
  imported: ShopeeOrderImport,
): T {
  return {
    ...prev,
    customer_name: imported.customerName || prev.customer_name,
    customer_address: imported.customerAddress || prev.customer_address,
    customer_tax_id: imported.customerTaxId || prev.customer_tax_id,
    customer_branch_code: imported.customerBranchCode || prev.customer_branch_code,
    customer_phone: imported.customerPhone || prev.customer_phone,
    customer_email: imported.customerEmail || prev.customer_email,
    items: imported.items.length ? imported.items : prev.items,
    discount1_type: "fixed",
    discount1_value: imported.sellerDiscount,
    discount_type: "fixed",
    discount_value: imported.sellerDiscount,
    sales_channel: "shopee",
    platform_discount_amount: imported.shopeeDiscount,
    shopee_coin_discount_amount: imported.shopeeCoinDiscount,
    payment_method_discount_amount: imported.paymentMethodDiscount,
    notes: imported.notes || prev.notes,
    terms_conditions: imported.termsConditions || prev.terms_conditions,
  };
}

export function buildInvoiceItemRows(invoiceId: string, items: DraftInvoiceItem[]) {
  return items.map((item, index) => {
    const itemTotal = item.quantity * item.unit_price;
    const percentDiscount = itemTotal * ((item.discount_percent || 0) / 100);
    return {
      invoice_id: invoiceId,
      item_order: index + 1,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      discount_amount: percentDiscount,
      amount: Math.max(0, itemTotal - percentDiscount),
      price_includes_vat: item.price_includes_vat || false,
    };
  });
}

export function buildInvoiceInsertRow(args: {
  companyId: string;
  invoiceNumber: string;
  data: DraftInvoiceInput;
  totals: InvoiceTotals;
  status: string;
}) {
  const { companyId, invoiceNumber, data, totals, status } = args;
  const platformDiscounts = platformDiscountAmounts(data.sales_channel, data, totals.totalAmount);

  return {
    company_id: companyId,
    quotation_id: data.quotation_id || null,
    source_billing_invoice_id: data.source_billing_invoice_id || null,
    invoice_number: invoiceNumber,
    customer_name: data.customer_name,
    customer_name_en: data.customer_name_en || null,
    customer_address: data.customer_address || "",
    customer_tax_id: data.customer_tax_id || "",
    customer_branch_code: data.customer_branch_code ?? "00000",
    issue_date: data.issue_date || new Date().toISOString().split("T")[0],
    subtotal: totals.subtotal || 0,
    amount_before_vat: totals.amountBeforeVat || 0,
    vat_rate: data.vat_rate || 7,
    vat_amount: totals.vatAmount || 0,
    total_amount: totals.totalAmount || 0,
    withholding_tax_rate: data.withholding_tax_rate || 0,
    withholding_tax_amount: totals.withholdingTaxAmount,
    net_amount: totals.netAmount,
    withholding_certificate_status: data.withholding_tax_rate > 0 ? "waiting" : "not_applicable",
    customer_contact: data.customer_contact || "",
    customer_phone: data.customer_phone || "",
    customer_email: data.customer_email || "",
    due_date: data.due_date || null,
    discount1_type: data.discount1_type || "fixed",
    discount1_value: data.discount1_value || 0,
    discount1_amount: totals.discount1Amount || 0,
    discount2_type: data.discount2_type || "fixed",
    discount2_value: data.discount2_value || 0,
    discount2_amount: totals.discount2Amount || 0,
    discount_type: data.discount1_type || "fixed",
    discount_value: data.discount1_value || 0,
    discount_amount: totals.discountAmount || 0,
    notes: data.notes || "",
    terms_conditions: data.terms_conditions || "",
    sales_channel: data.sales_channel || null,
    platform_discount_amount: platformDiscounts.platform_discount_amount,
    shopee_coin_discount_amount: platformDiscounts.shopee_coin_discount_amount,
    payment_method_discount_amount: platformDiscounts.payment_method_discount_amount,
    status,
  };
}

function isUniqueViolation(error: InvoiceWriteError | null | undefined) {
  return error?.code === "23505" || Boolean(error?.message?.includes("duplicate key"));
}

export async function insertInvoiceWithNumber(
  supabase: InvoiceDb,
  args: {
    companyId: string;
    prefix: string;
    data: DraftInvoiceInput;
    status: string;
    delay?: (ms: number) => Promise<void>;
    maxRetries?: number;
  },
) {
  const totals = calculateInvoiceTotals(args.data);
  const issueDateStr = args.data.issue_date || getLocalDateString();
  const yearMonthDay = invoiceDateKey(issueDateStr);
  const prefix = args.prefix || "IV";
  const delay = args.delay ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const maxRetries = args.maxRetries ?? 5;

  let invoice = null;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("company_id", args.companyId)
      .ilike("invoice_number", `${prefix}-${yearMonthDay}-%`)
      .order("invoice_number", { ascending: false })
      .limit(1);

    const nextNumber = nextInvoiceSequence(existingInvoices?.[0]?.invoice_number);
    const newNumber = formatInvoiceNumber(prefix, yearMonthDay, nextNumber);
    const { data: insertedInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert(buildInvoiceInsertRow({
        companyId: args.companyId,
        invoiceNumber: newNumber,
        data: args.data,
        totals,
        status: args.status,
      }))
      .select()
      .single();

    if (!invoiceError) {
      invoice = insertedInvoice;
      break;
    }

    if (isUniqueViolation(invoiceError)) {
      retryCount += 1;
      if (retryCount >= maxRetries) throw invoiceError;
      await delay(50 + Math.random() * 250);
    } else {
      throw invoiceError;
    }
  }

  if (!invoice) throw new Error("Failed to create invoice after retries");

  if (args.data.items.length > 0) {
    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(buildInvoiceItemRows(invoice.id, args.data.items));
    if (itemsError) throw new InvoiceItemsInsertError(invoice.id, itemsError);
  }

  return invoice;
}

export function insertDraftInvoice(
  supabase: InvoiceDb,
  args: {
    companyId: string;
    prefix: string;
    data: DraftInvoiceInput;
    delay?: (ms: number) => Promise<void>;
  },
) {
  return insertInvoiceWithNumber(supabase, { ...args, status: "draft" });
}

function normalizeCustomerField(value: string | undefined | null) {
  return value?.trim() || "";
}

function customerFieldsChanged(
  existing: Record<string, unknown>,
  next: CustomerMatchInput,
  fields: Array<keyof CustomerMatchInput>,
) {
  return fields.some((field) => normalizeCustomerField(existing[field] as string | null) !== normalizeCustomerField(next[field]));
}

export async function findOrCreateCustomerRecord(
  supabase: InvoiceDb,
  companyId: string,
  data: CustomerMatchInput,
): Promise<{ customer: Record<string, any>; action: "unchanged" | "updated" | "created" } | null> {
  if (!data.name || data.name.trim() === "") return null;

  const branchCode = data.branch_code || "00000";

  if (data.tax_id && data.tax_id.trim() !== "") {
    const { data: existingByTaxIdAndBranch, error } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", companyId)
      .eq("tax_id", data.tax_id)
      .eq("branch_code", branchCode)
      .eq("is_active", true)
      .limit(1);
    if (error) throw error;

    const existing = existingByTaxIdAndBranch?.[0];
    if (existing) {
      const changed = customerFieldsChanged(existing, data, ["name", "address", "contact_name", "phone", "email"]);
      if (!changed) return { customer: existing, action: "unchanged" };

      const { data: updated, error: updateError } = await supabase
        .from("customers")
        .update({
          name: data.name,
          address: data.address,
          contact_name: data.contact_name,
          phone: data.phone,
          email: data.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("company_id", companyId)
        .select()
        .single();
      if (updateError) throw updateError;
      return { customer: updated, action: "updated" };
    }
  }

  const { data: existingByName, error: nameError } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("name", data.name)
    .eq("branch_code", branchCode)
    .eq("is_active", true)
    .limit(1);
  if (nameError) throw nameError;

  const named = existingByName?.[0];
  if (named) {
    const merged: CustomerMatchInput = {
      customer_type: data.customer_type,
      name: data.name,
      tax_id: data.tax_id || named.tax_id || undefined,
      address: data.address || named.address || undefined,
      branch_code: branchCode,
      contact_name: data.contact_name || named.contact_name || undefined,
      phone: data.phone || named.phone || undefined,
      email: data.email || named.email || undefined,
    };
    const changed = customerFieldsChanged(named, merged, [
      "name",
      "tax_id",
      "address",
      "contact_name",
      "phone",
      "email",
    ]);
    if (!changed) return { customer: named, action: "unchanged" };

    const { data: updated, error: updateError } = await supabase
      .from("customers")
      .update({
        tax_id: merged.tax_id,
        address: merged.address,
        contact_name: merged.contact_name,
        phone: merged.phone,
        email: merged.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", named.id)
      .eq("company_id", companyId)
      .select()
      .single();
    if (updateError) throw updateError;
    return { customer: updated, action: "updated" };
  }

  const { data: created, error: createError } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      customer_type: data.customer_type || "company",
      name: data.name,
      tax_id: data.tax_id || null,
      branch_code: branchCode,
      address: data.address || null,
      contact_name: data.contact_name || null,
      phone: data.phone || null,
      email: data.email || null,
      country: "TH",
      payment_terms: 30,
      is_active: true,
    })
    .select()
    .single();
  if (createError) throw createError;
  return { customer: created, action: "created" };
}
