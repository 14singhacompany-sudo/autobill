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

export type ReceiptStatus = "draft" | "issued" | "cancelled";

export interface Receipt {
  id: string;
  receipt_number: string;
  customer_name: string;
  customer_name_en: string | null;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes: string;
  payment_method: string;
  sales_channel: string | null;
  status: ReceiptStatus;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
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

export interface ReceiptFormData {
  customer_name: string;
  customer_name_en?: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
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
  notes: string;
  payment_method: string;
  sales_channel?: string;
}

interface ReceiptStore {
  receipts: Receipt[];
  isLoading: boolean;
  error: string | null;
  fetchReceipts: () => Promise<void>;
  createReceipt: (data: ReceiptFormData, status: ReceiptStatus) => Promise<Receipt | null>;
  updateReceipt: (id: string, data: ReceiptFormData, status: ReceiptStatus) => Promise<Receipt | null>;
  deleteReceipt: (id: string) => Promise<{ success: boolean; reason?: string }>;
  cancelReceipt: (id: string) => Promise<{ success: boolean; reason?: string }>;
  getReceipt: (id: string) => Promise<{ receipt: Receipt; items: ReceiptItem[] } | null>;
}

// Helper function to calculate totals
const calculateTotals = (items: ReceiptFormData["items"], vatRate: number, discountType: "fixed" | "percent", discountValue: number) => {
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

  // Calculate document-level discount
  let discountAmount = 0;
  if (discountType === "fixed") {
    discountAmount = discountValue;
  } else {
    discountAmount = subtotal * (discountValue / 100);
  }

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
    amountBeforeVat,
    vatAmount,
    totalAmount,
  };
};

export const useReceiptStore = create<ReceiptStore>((set, get) => ({
  receipts: [],
  isLoading: false,
  error: null,

  fetchReceipts: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ receipts: data || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching receipts:", error);
      set({ error: "ไม่สามารถโหลดข้อมูลใบเสร็จได้", isLoading: false });
    }
  },

  createReceipt: async (data, status) => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) throw new Error("User not authenticated");

      // Calculate totals
      const totals = calculateTotals(data.items, data.vat_rate, data.discount_type, data.discount_value);

      // Get company_settings
      const { data: companySettings, error: companySettingsError } = await supabase
        .from("company_settings")
        .select("id, rc_prefix")
        .eq("user_id", authUser.id)
        .single();

      if (companySettingsError) {
        throw new Error(`Company settings error: ${companySettingsError.message}`);
      }

      if (!companySettings) throw new Error("Company settings not found for user");
      const companyId = companySettings.id;
      const prefix = companySettings?.rc_prefix || "RC";

      // Generate receipt number
      const issueDateStr = data.issue_date || getLocalDateString();
      const yearMonthDay = issueDateStr.replace(/-/g, "");

      // Retry mechanism for duplicate key error
      let receipt = null;
      let retryCount = 0;
      const maxRetries = 5;

      while (retryCount < maxRetries) {
        // Query max number for today (filter by company_id)
        const { data: existingReceipts } = await supabase
          .from("receipts")
          .select("receipt_number")
          .eq("company_id", companyId)
          .ilike("receipt_number", `${prefix}-${yearMonthDay}-%`)
          .order("receipt_number", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (existingReceipts && existingReceipts.length > 0) {
          const lastNumber = existingReceipts[0].receipt_number;
          const parts = lastNumber.split("-");
          if (parts.length >= 3) {
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
              nextNumber = lastSeq + 1;
            }
          }
        }

        const newNumber = `${prefix}-${yearMonthDay}-${String(nextNumber).padStart(4, "0")}`;

        // Insert receipt
        const { data: insertedReceipt, error: receiptError } = await supabase
          .from("receipts")
          .insert({
            company_id: companyId,
            receipt_number: newNumber,
            customer_name: data.customer_name,
            customer_name_en: data.customer_name_en || null,
            customer_address: data.customer_address,
            customer_tax_id: data.customer_tax_id,
            customer_branch_code: data.customer_branch_code || "00000",
            customer_contact: data.customer_contact,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            issue_date: data.issue_date,
            subtotal: totals.subtotal,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            discount_amount: totals.discountAmount,
            amount_before_vat: totals.amountBeforeVat,
            vat_rate: data.vat_rate,
            vat_amount: totals.vatAmount,
            total_amount: totals.totalAmount,
            notes: data.notes,
            payment_method: data.payment_method,
            sales_channel: data.sales_channel || null,
            status: status,
          })
          .select()
          .single();

        if (!receiptError) {
          receipt = insertedReceipt;
          break;
        }

        if (receiptError.code === "23505" || receiptError.message?.includes("duplicate key")) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 100));
          continue;
        }

        throw receiptError;
      }

      if (!receipt) {
        throw new Error("Failed to create receipt after max retries");
      }

      // Insert receipt items
      const itemsToInsert = data.items.map((item, index) => {
        const itemDiscountAmount = item.unit_price * item.quantity * ((item.discount_percent || 0) / 100);
        const itemAmount = item.unit_price * item.quantity - itemDiscountAmount;

        return {
          receipt_id: receipt.id,
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

      const { error: itemsError } = await supabase.from("receipt_items").insert(itemsToInsert);

      if (itemsError) {
        // Rollback: delete the receipt
        await supabase.from("receipts").delete().eq("id", receipt.id);
        throw itemsError;
      }

      // Refresh list
      get().fetchReceipts();

      return receipt;
    } catch (error) {
      console.error("Error creating receipt:", error);
      throw error;
    }
  },

  updateReceipt: async (id, data, status) => {
    // Use lock to prevent concurrent updates
    if (updateLocks.has(id)) {
      await updateLocks.get(id);
    }

    const updatePromise = (async () => {
      try {
        const supabase = createClient();

        // Calculate totals
        const totals = calculateTotals(data.items, data.vat_rate, data.discount_type, data.discount_value);

        // Update receipt
        const { data: updatedReceipt, error: receiptError } = await supabase
          .from("receipts")
          .update({
            customer_name: data.customer_name,
            customer_name_en: data.customer_name_en || null,
            customer_address: data.customer_address,
            customer_tax_id: data.customer_tax_id,
            customer_branch_code: data.customer_branch_code || "00000",
            customer_contact: data.customer_contact,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            issue_date: data.issue_date,
            subtotal: totals.subtotal,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            discount_amount: totals.discountAmount,
            amount_before_vat: totals.amountBeforeVat,
            vat_rate: data.vat_rate,
            vat_amount: totals.vatAmount,
            total_amount: totals.totalAmount,
            notes: data.notes,
            payment_method: data.payment_method,
            sales_channel: data.sales_channel || null,
            status: status,
          })
          .eq("id", id)
          .select()
          .single();

        if (receiptError) throw receiptError;

        // Delete old items and insert new
        await supabase.from("receipt_items").delete().eq("receipt_id", id);

        const itemsToInsert = data.items.map((item, index) => {
          const itemDiscountAmount = item.unit_price * item.quantity * ((item.discount_percent || 0) / 100);
          const itemAmount = item.unit_price * item.quantity - itemDiscountAmount;

          return {
            receipt_id: id,
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

        await supabase.from("receipt_items").insert(itemsToInsert);

        get().fetchReceipts();

        return updatedReceipt;
      } catch (error) {
        console.error("Error updating receipt:", error);
        throw error;
      } finally {
        updateLocks.delete(id);
      }
    })();

    updateLocks.set(id, updatePromise);
    return updatePromise;
  },

  deleteReceipt: async (id) => {
    try {
      const supabase = createClient();

      // Check if receipt is issued
      const { data: receipt } = await supabase.from("receipts").select("status").eq("id", id).single();

      if (receipt?.status === "issued") {
        return { success: false, reason: "ไม่สามารถลบใบเสร็จที่ออกแล้วได้" };
      }

      const { error } = await supabase.from("receipts").delete().eq("id", id);

      if (error) throw error;

      get().fetchReceipts();
      return { success: true };
    } catch (error) {
      console.error("Error deleting receipt:", error);
      return { success: false, reason: "เกิดข้อผิดพลาดในการลบ" };
    }
  },

  cancelReceipt: async (id) => {
    try {
      const supabase = createClient();

      const { error } = await supabase.from("receipts").update({ status: "cancelled" }).eq("id", id);

      if (error) throw error;

      get().fetchReceipts();
      return { success: true };
    } catch (error) {
      console.error("Error cancelling receipt:", error);
      return { success: false, reason: "เกิดข้อผิดพลาดในการยกเลิก" };
    }
  },

  getReceipt: async (id) => {
    try {
      const supabase = createClient();

      const { data: receipt, error: receiptError } = await supabase
        .from("receipts")
        .select("*")
        .eq("id", id)
        .single();

      if (receiptError) throw receiptError;

      const { data: items, error: itemsError } = await supabase
        .from("receipt_items")
        .select("*")
        .eq("receipt_id", id)
        .order("item_order", { ascending: true });

      if (itemsError) throw itemsError;

      return { receipt, items: items || [] };
    } catch (error) {
      console.error("Error getting receipt:", error);
      return null;
    }
  },
}));
