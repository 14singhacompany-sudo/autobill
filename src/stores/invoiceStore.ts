import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { InvoiceStatus } from "@/types/database";

export interface Invoice {
  id: string;
  invoice_number: string;
  // ข้อมูลบังคับตามกฎหมาย (มาตรา 86/4)
  customer_name: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string; // รหัสสาขา (00000 = สำนักงานใหญ่)
  issue_date: string;
  subtotal: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  // ข้อมูลเพิ่มเติม
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  due_date: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  notes: string;
  terms_conditions: string;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
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

export interface InvoiceFormData {
  // ข้อมูลบังคับตามกฎหมาย (มาตรา 86/4)
  customer_name: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string; // รหัสสาขา (00000 = สำนักงานใหญ่)
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
  // ข้อมูลเพิ่มเติม
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  due_date: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  notes: string;
  terms_conditions: string;
}

interface InvoiceStore {
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
  fetchInvoices: () => Promise<void>;
  createInvoice: (data: InvoiceFormData, status: InvoiceStatus) => Promise<Invoice | null>;
  updateInvoice: (id: string, data: InvoiceFormData, status: InvoiceStatus) => Promise<Invoice | null>;
  deleteInvoice: (id: string) => Promise<void>;
  getInvoice: (id: string) => Promise<{ invoice: Invoice; items: InvoiceItem[] } | null>;
}

function calculateTotals(data: InvoiceFormData) {
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

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: [],
  isLoading: false,
  error: null,

  fetchInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ invoices: data || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      set({ error: "ไม่สามารถโหลดข้อมูลใบกำกับภาษีได้", isLoading: false });
    }
  },

  getInvoice: async (id: string) => {
    try {
      const supabase = createClient();

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: items, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id)
        .order("item_order", { ascending: true });

      if (itemsError) throw itemsError;

      return { invoice, items: items || [] };
    } catch (error) {
      console.error("Error fetching invoice:", error);
      return null;
    }
  },

  createInvoice: async (data, status) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const totals = calculateTotals(data);

      // Generate invoice number with IV prefix (format: IV-YYYYMMDD-0001)
      const today = new Date();
      const yearMonthDay = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .ilike("invoice_number", `IV-${yearMonthDay}%`);

      const newNumber = `IV-${yearMonthDay}-${String((count || 0) + 1).padStart(4, "0")}`;

      // Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: newNumber,
          // ข้อมูลบังคับตามกฎหมาย
          customer_name: data.customer_name || "-",
          customer_address: data.customer_address || "",
          customer_tax_id: data.customer_tax_id || "",
          customer_branch_code: data.customer_branch_code || "00000",
          issue_date: data.issue_date || new Date().toISOString().split("T")[0],
          subtotal: totals.subtotal || 0,
          amount_before_vat: totals.amountBeforeVat || 0,
          vat_rate: data.vat_rate || 7,
          vat_amount: totals.vatAmount || 0,
          total_amount: totals.totalAmount || 0,
          // ข้อมูลเพิ่มเติม
          customer_contact: data.customer_contact || "",
          customer_phone: data.customer_phone || "",
          customer_email: data.customer_email || "",
          due_date: data.due_date || null,
          discount_type: data.discount_type || "fixed",
          discount_value: data.discount_value || 0,
          discount_amount: totals.discountAmount || 0,
          notes: data.notes || "",
          terms_conditions: data.terms_conditions || "",
          status: status,
        })
        .select()
        .single();

      console.log("Invoice insert result:", invoice, invoiceError);

      if (invoiceError) throw invoiceError;

      // Insert items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => {
          const itemTotal = item.quantity * item.unit_price;
          const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
          return {
            invoice_id: invoice.id,
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
          .from("invoice_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Update local state
      set((state) => ({
        invoices: [invoice, ...state.invoices],
        isLoading: false,
      }));

      return invoice;
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      console.error("Error message:", error?.message);
      console.error("Error details:", error?.details);
      console.error("Error hint:", error?.hint);
      console.error("Error code:", error?.code);
      set({ error: "ไม่สามารถสร้างใบกำกับภาษีได้", isLoading: false });
      return null;
    }
  },

  updateInvoice: async (id, data, status) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const totals = calculateTotals(data);

      // Update invoice
      const { data: invoice, error: updateError } = await supabase
        .from("invoices")
        .update({
          // ข้อมูลบังคับตามกฎหมาย
          customer_name: data.customer_name,
          customer_address: data.customer_address,
          customer_tax_id: data.customer_tax_id,
          customer_branch_code: data.customer_branch_code || "00000",
          issue_date: data.issue_date,
          subtotal: totals.subtotal,
          amount_before_vat: totals.amountBeforeVat,
          vat_rate: data.vat_rate,
          vat_amount: totals.vatAmount,
          total_amount: totals.totalAmount,
          // ข้อมูลเพิ่มเติม
          customer_contact: data.customer_contact,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          due_date: data.due_date,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_amount: totals.discountAmount,
          notes: data.notes,
          terms_conditions: data.terms_conditions,
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", id);

      if (deleteError) throw deleteError;

      // Insert new items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item, index) => {
          const itemTotal = item.quantity * item.unit_price;
          const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
          return {
            invoice_id: id,
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

        const { error: insertError } = await supabase
          .from("invoice_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      // Update local state
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === id ? invoice : inv
        ),
        isLoading: false,
      }));

      return invoice;
    } catch (error) {
      console.error("Error updating invoice:", error);
      set({ error: "ไม่สามารถอัพเดทใบกำกับภาษีได้", isLoading: false });
      return null;
    }
  },

  deleteInvoice: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error deleting invoice:", error);
      set({ error: "ไม่สามารถลบใบกำกับภาษีได้", isLoading: false });
    }
  },
}));
