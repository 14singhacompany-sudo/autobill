import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

// Lock mechanism to prevent concurrent updates
const updateLocks = new Map<string, Promise<any>>();

// ฟังก์ชันสำหรับดึงวันที่ปัจจุบันใน format YYYY-MM-DD (local timezone)
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export type BillingInvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "cancelled";

export interface BillingInvoice {
  id: string;
  source_quotation_id?: string | null;
  source_installment_index?: number | null;
  paid_at?: string | null;
  invoice_number: string;
  customer_name: string;
  customer_name_en: string | null;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  discount1_type?: string;
  discount1_value?: number;
  discount1_amount?: number;
  discount2_type?: string;
  discount2_value?: number;
  discount2_amount?: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes: string;
  payment_terms: string;
  status: BillingInvoiceStatus;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoiceItem {
  id: string;
  billing_invoice_id: string;
  item_order: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  amount: number;
  price_includes_vat: boolean;
}

export interface BillingInvoiceFormData {
  source_quotation_id?: string | null;
  source_installment_index?: number | null;
  customer_name: string;
  customer_name_en?: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
  due_date: string;
  items: {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_percent?: number;
    price_includes_vat?: boolean;
  }[];
  vat_rate: number;
  discount_type: "fixed" | "percent";
  discount_value: number;
  discount1_type?: "fixed" | "percent";
  discount1_value?: number;
  discount2_type?: "fixed" | "percent";
  discount2_value?: number;
  notes: string;
  payment_terms: string;
}

interface BillingInvoiceStore {
  billingInvoices: BillingInvoice[];
  isLoading: boolean;
  error: string | null;
  fetchBillingInvoices: () => Promise<void>;
  createBillingInvoice: (data: BillingInvoiceFormData, status: BillingInvoiceStatus) => Promise<BillingInvoice | null>;
  updateBillingInvoice: (id: string, data: BillingInvoiceFormData, status: BillingInvoiceStatus) => Promise<BillingInvoice | null>;
  deleteBillingInvoice: (id: string) => Promise<{ success: boolean; reason?: string }>;
  cancelBillingInvoice: (id: string) => Promise<{ success: boolean; reason?: string }>;
  markAsPaid: (id: string) => Promise<{ success: boolean; reason?: string }>;
  getBillingInvoice: (id: string) => Promise<{ billingInvoice: BillingInvoice; items: BillingInvoiceItem[] } | null>;
}

// Helper function to calculate totals
const calculateTotals = (data: BillingInvoiceFormData) => {
  const { items, vat_rate: vatRate } = data;
  let subtotal = 0;
  let totalVatIncludedAmount = 0;

  items.forEach((item) => {
    const itemDiscountAmount = item.unit_price * item.quantity * ((item.discount_percent || 0) / 100);
    const itemAmount = item.unit_price * item.quantity - itemDiscountAmount;

    if (item.price_includes_vat) {
      totalVatIncludedAmount += itemAmount;
    }
    subtotal += itemAmount;
  });

  const discount1Type = data.discount1_type || data.discount_type || "fixed";
  const discount1Value = data.discount1_value ?? data.discount_value ?? 0;
  const discount2Type = data.discount2_type || "fixed";
  const discount2Value = data.discount2_value ?? 0;
  const discount1Amount = discount1Type === "percent" ? subtotal * (discount1Value / 100) : discount1Value;
  const afterDiscount1 = subtotal - discount1Amount;
  const discount2Amount = discount2Type === "percent" ? afterDiscount1 * (discount2Value / 100) : discount2Value;
  const discountAmount = discount1Amount + discount2Amount;

  const afterDiscount = subtotal - discountAmount;

  // Calculate VAT
  let amountBeforeVat: number;
  let vatAmount: number;

  if (vatRate === 0) {
    amountBeforeVat = afterDiscount;
    vatAmount = 0;
  } else if (totalVatIncludedAmount === subtotal) {
    // All items include VAT
    amountBeforeVat = afterDiscount / (1 + vatRate / 100);
    vatAmount = afterDiscount - amountBeforeVat;
  } else if (totalVatIncludedAmount === 0) {
    // No items include VAT
    amountBeforeVat = afterDiscount;
    vatAmount = amountBeforeVat * (vatRate / 100);
  } else {
    // Mixed - complex calculation
    const vatIncludedRatio = totalVatIncludedAmount / subtotal;
    const vatIncludedPortion = afterDiscount * vatIncludedRatio;
    const vatExcludedPortion = afterDiscount * (1 - vatIncludedRatio);

    const vatFromIncluded = vatIncludedPortion - vatIncludedPortion / (1 + vatRate / 100);
    const vatFromExcluded = vatExcludedPortion * (vatRate / 100);

    vatAmount = vatFromIncluded + vatFromExcluded;
    amountBeforeVat = afterDiscount - vatFromIncluded;
  }

  const totalAmount = amountBeforeVat + vatAmount;

  return {
    subtotal,
    discountAmount,
    discount1Amount,
    discount2Amount,
    amountBeforeVat,
    vatAmount,
    totalAmount,
  };
};

export const useBillingInvoiceStore = create<BillingInvoiceStore>((set, get) => ({
  billingInvoices: [],
  isLoading: false,
  error: null,

  fetchBillingInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("billing_invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ billingInvoices: data || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching billing invoices:", error);
      set({ error: "ไม่สามารถโหลดข้อมูลใบแจ้งหนี้ได้", isLoading: false });
    }
  },

  createBillingInvoice: async (data, status) => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) throw new Error("User not authenticated");

      // Calculate totals
      const totals = calculateTotals(data);

      // Get company_settings
      const { data: companySettings, error: companySettingsError } = await supabase
        .from("company_settings")
        .select("id, bi_prefix")
        .eq("user_id", authUser.id)
        .single();

      if (companySettingsError) {
        throw new Error(`Company settings error: ${companySettingsError.message}`);
      }

      if (!companySettings) throw new Error("Company settings not found for user");
      const companyId = companySettings.id;
      const prefix = companySettings?.bi_prefix || "BI";

      // Generate invoice number
      const issueDateStr = data.issue_date || getLocalDateString();
      const yearMonthDay = issueDateStr.replace(/-/g, "");

      // Retry mechanism for duplicate key error
      let billingInvoice = null;
      let reusedExistingInstallment = false;
      let retryCount = 0;
      const maxRetries = 5;

      while (retryCount < maxRetries) {
        // Query max number for today (filter by company_id)
        const { data: existingInvoices } = await supabase
          .from("billing_invoices")
          .select("invoice_number")
          .eq("company_id", companyId)
          .ilike("invoice_number", `${prefix}-${yearMonthDay}-%`)
          .order("invoice_number", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (existingInvoices && existingInvoices.length > 0) {
          const lastNumber = existingInvoices[0].invoice_number;
          const parts = lastNumber.split("-");
          if (parts.length >= 3) {
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
              nextNumber = lastSeq + 1;
            }
          }
        }

        const newNumber = `${prefix}-${yearMonthDay}-${String(nextNumber).padStart(4, "0")}`;

        // Insert billing invoice
        const { data: insertedInvoice, error: invoiceError } = await supabase
          .from("billing_invoices")
          .insert({
            company_id: companyId,
            source_quotation_id: data.source_quotation_id || null,
            source_installment_index: data.source_installment_index ?? null,
            invoice_number: newNumber,
            customer_name: data.customer_name,
            customer_name_en: data.customer_name_en || null,
            customer_address: data.customer_address,
            customer_tax_id: data.customer_tax_id,
            customer_branch_code: data.customer_branch_code || "00000",
            customer_contact: data.customer_contact,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            issue_date: data.issue_date,
            due_date: data.due_date,
            subtotal: totals.subtotal,
            discount_type: data.discount1_type || data.discount_type || "fixed",
            discount_value: data.discount1_value ?? data.discount_value ?? 0,
            discount_amount: totals.discountAmount,
            discount1_type: data.discount1_type || data.discount_type || "fixed",
            discount1_value: data.discount1_value ?? data.discount_value ?? 0,
            discount1_amount: totals.discount1Amount,
            discount2_type: data.discount2_type || "fixed",
            discount2_value: data.discount2_value ?? 0,
            discount2_amount: totals.discount2Amount,
            amount_before_vat: totals.amountBeforeVat,
            vat_rate: data.vat_rate,
            vat_amount: totals.vatAmount,
            total_amount: totals.totalAmount,
            notes: data.notes,
            payment_terms: data.payment_terms,
            status: status,
          })
          .select()
          .single();

        if (!invoiceError) {
          billingInvoice = insertedInvoice;
          break;
        }

        if (invoiceError.code === "23505" || invoiceError.message?.includes("duplicate key")) {
          if (data.source_quotation_id && data.source_installment_index !== null && data.source_installment_index !== undefined) {
            const { data: existingInstallmentInvoice } = await supabase
              .from("billing_invoices")
              .select("*")
              .eq("source_quotation_id", data.source_quotation_id)
              .eq("source_installment_index", data.source_installment_index)
              .neq("status", "cancelled")
              .maybeSingle();
            if (existingInstallmentInvoice) {
              billingInvoice = existingInstallmentInvoice;
              reusedExistingInstallment = true;
              break;
            }
          }
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 100));
          continue;
        }

        throw invoiceError;
      }

      if (!billingInvoice) {
        throw new Error("Failed to create billing invoice after max retries");
      }

      if (reusedExistingInstallment) {
        get().fetchBillingInvoices();
        return billingInvoice;
      }

      // Insert billing invoice items
      const itemsToInsert = data.items.map((item, index) => {
        const itemDiscountAmount = item.unit_price * item.quantity * ((item.discount_percent || 0) / 100);
        const itemAmount = item.unit_price * item.quantity - itemDiscountAmount;

        return {
          billing_invoice_id: billingInvoice.id,
          item_order: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          discount_amount: itemDiscountAmount,
          amount: itemAmount,
          price_includes_vat: item.price_includes_vat || false,
        };
      });

      const { error: itemsError } = await supabase.from("billing_invoice_items").insert(itemsToInsert);

      if (itemsError) {
        // Rollback: delete the billing invoice
        await supabase.from("billing_invoices").delete().eq("id", billingInvoice.id);
        throw itemsError;
      }

      // Refresh list
      get().fetchBillingInvoices();

      return billingInvoice;
    } catch (error) {
      console.error("Error creating billing invoice:", error);
      throw error;
    }
  },

  updateBillingInvoice: async (id, data, status) => {
    // Use lock to prevent concurrent updates
    if (updateLocks.has(id)) {
      await updateLocks.get(id);
    }

    const updatePromise = (async () => {
      try {
        const supabase = createClient();

        // Calculate totals
        const totals = calculateTotals(data);

        // Update billing invoice
        const { data: updatedInvoice, error: invoiceError } = await supabase
          .from("billing_invoices")
          .update({
            source_quotation_id: data.source_quotation_id || null,
            source_installment_index: data.source_installment_index ?? null,
            customer_name: data.customer_name,
            customer_name_en: data.customer_name_en || null,
            customer_address: data.customer_address,
            customer_tax_id: data.customer_tax_id,
            customer_branch_code: data.customer_branch_code || "00000",
            customer_contact: data.customer_contact,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            issue_date: data.issue_date,
            due_date: data.due_date,
            subtotal: totals.subtotal,
            discount_type: data.discount1_type || data.discount_type || "fixed",
            discount_value: data.discount1_value ?? data.discount_value ?? 0,
            discount_amount: totals.discountAmount,
            discount1_type: data.discount1_type || data.discount_type || "fixed",
            discount1_value: data.discount1_value ?? data.discount_value ?? 0,
            discount1_amount: totals.discount1Amount,
            discount2_type: data.discount2_type || "fixed",
            discount2_value: data.discount2_value ?? 0,
            discount2_amount: totals.discount2Amount,
            amount_before_vat: totals.amountBeforeVat,
            vat_rate: data.vat_rate,
            vat_amount: totals.vatAmount,
            total_amount: totals.totalAmount,
            notes: data.notes,
            payment_terms: data.payment_terms,
            status: status,
          })
          .eq("id", id)
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Delete old items and insert new
        await supabase.from("billing_invoice_items").delete().eq("billing_invoice_id", id);

        const itemsToInsert = data.items.map((item, index) => {
          const itemDiscountAmount = item.unit_price * item.quantity * ((item.discount_percent || 0) / 100);
          const itemAmount = item.unit_price * item.quantity - itemDiscountAmount;

          return {
            billing_invoice_id: id,
            item_order: index + 1,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent || 0,
            discount_amount: itemDiscountAmount,
            amount: itemAmount,
            price_includes_vat: item.price_includes_vat || false,
          };
        });

        await supabase.from("billing_invoice_items").insert(itemsToInsert);

        get().fetchBillingInvoices();

        return updatedInvoice;
      } catch (error) {
        console.error("Error updating billing invoice:", error);
        throw error;
      } finally {
        updateLocks.delete(id);
      }
    })();

    updateLocks.set(id, updatePromise);
    return updatePromise;
  },

  deleteBillingInvoice: async (id) => {
    try {
      const supabase = createClient();

      // Check if billing invoice is issued
      const { data: invoice } = await supabase.from("billing_invoices").select("status").eq("id", id).single();

      if (invoice?.status === "issued" || invoice?.status === "paid") {
        return { success: false, reason: "ไม่สามารถลบใบแจ้งหนี้ที่ออกแล้วได้" };
      }

      const { error } = await supabase.from("billing_invoices").delete().eq("id", id);

      if (error) throw error;

      get().fetchBillingInvoices();
      return { success: true };
    } catch (error) {
      console.error("Error deleting billing invoice:", error);
      return { success: false, reason: "เกิดข้อผิดพลาดในการลบ" };
    }
  },

  cancelBillingInvoice: async (id) => {
    try {
      const supabase = createClient();

      const { error } = await supabase.from("billing_invoices").update({ status: "cancelled" }).eq("id", id);

      if (error) throw error;

      get().fetchBillingInvoices();
      return { success: true };
    } catch (error) {
      console.error("Error cancelling billing invoice:", error);
      return { success: false, reason: "เกิดข้อผิดพลาดในการยกเลิก" };
    }
  },

  markAsPaid: async (id) => {
    try {
      const supabase = createClient();

      const { error } = await supabase.from("billing_invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);

      if (error) throw error;

      get().fetchBillingInvoices();
      return { success: true };
    } catch (error) {
      console.error("Error marking billing invoice as paid:", error);
      return { success: false, reason: "เกิดข้อผิดพลาด" };
    }
  },

  getBillingInvoice: async (id) => {
    try {
      const supabase = createClient();

      const { data: billingInvoice, error: invoiceError } = await supabase
        .from("billing_invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: items, error: itemsError } = await supabase
        .from("billing_invoice_items")
        .select("*")
        .eq("billing_invoice_id", id)
        .order("item_order", { ascending: true });

      if (itemsError) throw itemsError;

      return { billingInvoice, items: items || [] };
    } catch (error) {
      console.error("Error getting billing invoice:", error);
      return null;
    }
  },
}));
