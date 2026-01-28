import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { Quotation, QuotationItem, DocumentStatus } from "@/types/database";

export interface QuotationFormData {
  customer_name: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code?: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
  valid_until: string;
  items: {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_percent?: number;
    price_includes_vat?: boolean;
  }[];
  discount_type: "fixed" | "percent";
  discount_value: number;
  vat_rate: number;
  notes: string;
  terms_conditions: string;
}

interface QuotationStore {
  quotations: Quotation[];
  isLoading: boolean;
  error: string | null;
  fetchQuotations: () => Promise<void>;
  getQuotation: (id: string) => Promise<{ quotation: Quotation; items: QuotationItem[] } | null>;
  createQuotation: (data: QuotationFormData, status: DocumentStatus) => Promise<Quotation | null>;
  updateQuotation: (id: string, data: Partial<QuotationFormData>) => Promise<void>;
  updateQuotationFull: (id: string, data: QuotationFormData, status: DocumentStatus) => Promise<Quotation | null>;
  deleteQuotation: (id: string) => Promise<void>;
}

function calculateTotals(data: QuotationFormData) {
  // 1. คำนวณยอดรวมที่แสดง (ราคาตามที่ตั้งไว้ หลังหักส่วนลดรายการ)
  const displayTotal = data.items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unit_price;
    const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
    return sum + (itemTotal - itemDiscount);
  }, 0);

  // 2. คำนวณส่วนลดรวมจากยอดที่แสดง
  const discountAmount =
    data.discount_type === "percent"
      ? displayTotal * (data.discount_value / 100)
      : data.discount_value;

  // 3. ยอดหลังหักส่วนลดรวม (ยังเป็นราคาที่แสดงอยู่)
  const displayAfterDiscount = displayTotal - discountAmount;

  // 4. คำนวณแยกตามประเภทราคา
  const discountRatio = displayTotal > 0 ? displayAfterDiscount / displayTotal : 1;

  // แยกคำนวณสินค้าที่รวม VAT และไม่รวม VAT
  let totalIncVat = 0;
  let totalExcVat = 0;

  data.items.forEach((item) => {
    const itemTotal = item.quantity * item.unit_price;
    const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
    const itemAfterItemDiscount = itemTotal - itemDiscount;
    const itemAfterAllDiscount = itemAfterItemDiscount * discountRatio;

    if (item.price_includes_vat) {
      totalIncVat += itemAfterAllDiscount;
    } else {
      totalExcVat += itemAfterAllDiscount;
    }
  });

  // สินค้าที่รวม VAT: ยอดหลังหักส่วนลดคือยอดสุดท้าย แยก VAT ออกมา
  const amountBeforeVatFromIncVat = totalIncVat / (1 + data.vat_rate / 100);
  const vatFromIncVat = totalIncVat - amountBeforeVatFromIncVat;

  // สินค้าที่ไม่รวม VAT: บวก VAT เพิ่ม
  const vatFromExcVat = totalExcVat * (data.vat_rate / 100);

  const amountBeforeVat = amountBeforeVatFromIncVat + totalExcVat;
  const vatAmount = vatFromIncVat + vatFromExcVat;
  const totalAmount = totalIncVat + totalExcVat + vatFromExcVat;

  return {
    subtotal: displayTotal,
    discountAmount,
    amountBeforeVat,
    vatAmount,
    totalAmount,
  };
}

export const useQuotationStore = create<QuotationStore>((set, get) => ({
  quotations: [],
  isLoading: false,
  error: null,

  fetchQuotations: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ quotations: data || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching quotations:", error);
      set({ error: "ไม่สามารถโหลดข้อมูลใบเสนอราคาได้", isLoading: false });
    }
  },

  getQuotation: async (id: string) => {
    try {
      const supabase = createClient();

      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", id)
        .single();

      if (quotationError) throw quotationError;

      const { data: items, error: itemsError } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", id)
        .order("item_order", { ascending: true });

      if (itemsError) throw itemsError;

      return { quotation, items: items || [] };
    } catch (error) {
      console.error("Error fetching quotation:", error);
      return null;
    }
  },

  createQuotation: async (data, status) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const totals = calculateTotals(data);

      // Generate quotation number based on issue_date (format: QT-YYYYMMDD-0001)
      const issueDate = new Date(data.issue_date);
      const yearMonthDay = `${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, "0")}${String(issueDate.getDate()).padStart(2, "0")}`;

      const { count } = await supabase
        .from("quotations")
        .select("*", { count: "exact", head: true })
        .ilike("quotation_number", `QT-${yearMonthDay}%`);

      const newNumber = `QT-${yearMonthDay}-${String((count || 0) + 1).padStart(4, "0")}`;

      // Insert quotation
      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .insert({
          quotation_number: newNumber,
          customer_name: data.customer_name,
          customer_address: data.customer_address,
          customer_tax_id: data.customer_tax_id,
          customer_contact: data.customer_contact,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          issue_date: data.issue_date,
          valid_until: data.valid_until,
          subtotal: totals.subtotal,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_amount: totals.discountAmount,
          amount_before_vat: totals.amountBeforeVat,
          vat_rate: data.vat_rate,
          vat_amount: totals.vatAmount,
          total_amount: totals.totalAmount,
          notes: data.notes,
          terms_conditions: data.terms_conditions,
          status: status,
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Insert items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => {
          const itemTotal = item.quantity * item.unit_price;
          const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
          return {
            quotation_id: quotation.id,
            item_order: index + 1,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent || 0,
            discount_amount: itemDiscount,
            amount: itemTotal - itemDiscount,
            price_includes_vat: item.price_includes_vat || false,
          };
        });

        const { error: itemsError } = await supabase
          .from("quotation_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Update local state
      set((state) => ({
        quotations: [quotation, ...state.quotations],
        isLoading: false,
      }));

      return quotation;
    } catch (error) {
      console.error("Error creating quotation:", error);
      set({ error: "ไม่สามารถสร้างใบเสนอราคาได้", isLoading: false });
      return null;
    }
  },

  updateQuotation: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      // Remove items from data as they are stored in a separate table
      const { items: _, ...quotationData } = data;
      const { error } = await supabase
        .from("quotations")
        .update(quotationData)
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        quotations: state.quotations.map((q) =>
          q.id === id ? { ...q, ...quotationData } : q
        ),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error updating quotation:", error);
      set({ error: "ไม่สามารถอัพเดทใบเสนอราคาได้", isLoading: false });
    }
  },

  updateQuotationFull: async (id, data, status) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const totals = calculateTotals(data);

      // Update quotation
      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .update({
          customer_name: data.customer_name,
          customer_address: data.customer_address,
          customer_tax_id: data.customer_tax_id,
          customer_contact: data.customer_contact,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          issue_date: data.issue_date,
          valid_until: data.valid_until,
          subtotal: totals.subtotal,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_amount: totals.discountAmount,
          amount_before_vat: totals.amountBeforeVat,
          vat_rate: data.vat_rate,
          vat_amount: totals.vatAmount,
          total_amount: totals.totalAmount,
          notes: data.notes,
          terms_conditions: data.terms_conditions,
          status: status,
        })
        .eq("id", id)
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from("quotation_items")
        .delete()
        .eq("quotation_id", id);

      if (deleteError) throw deleteError;

      // Insert new items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => {
          const itemTotal = item.quantity * item.unit_price;
          const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
          return {
            quotation_id: id,
            item_order: index + 1,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent || 0,
            discount_amount: itemDiscount,
            amount: itemTotal - itemDiscount,
            price_includes_vat: item.price_includes_vat || false,
          };
        });

        const { error: itemsError } = await supabase
          .from("quotation_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Update local state
      set((state) => ({
        quotations: state.quotations.map((q) =>
          q.id === id ? quotation : q
        ),
        isLoading: false,
      }));

      return quotation;
    } catch (error) {
      console.error("Error updating quotation:", error);
      set({ error: "ไม่สามารถอัพเดทใบเสนอราคาได้", isLoading: false });
      return null;
    }
  },

  deleteQuotation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("quotations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        quotations: state.quotations.filter((q) => q.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error deleting quotation:", error);
      set({ error: "ไม่สามารถลบใบเสนอราคาได้", isLoading: false });
    }
  },
}));
