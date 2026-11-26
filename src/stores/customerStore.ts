import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateCustomerRecord } from "@/lib/invoice-draft";
import type { Customer, CustomerType } from "@/types/database";

export interface CustomerFormData {
  customer_type: CustomerType;
  name: string;
  tax_id?: string;
  branch_code?: string;
  address?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
}

interface CustomerStore {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  createCustomer: (data: CustomerFormData) => Promise<Customer | null>;
  updateCustomer: (id: string, data: Partial<CustomerFormData>) => Promise<Customer | null>;
  deleteCustomer: (id: string) => Promise<void>;
  findOrCreateCustomer: (data: CustomerFormData) => Promise<Customer | null>;
}

export const useCustomerStore = create<CustomerStore>((set) => ({
  customers: [],
  isLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;

      set({ customers: data || [], isLoading: false });
    } catch (error) {
      console.error("Error fetching customers:", error);
      set({ error: "ไม่สามารถโหลดข้อมูลลูกค้าได้", isLoading: false });
    }
  },

  createCustomer: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ error: "กรุณาเข้าสู่ระบบก่อน", isLoading: false });
        return null;
      }

      // ดึง company_settings ของ user (ใช้เป็น company_id สำหรับ FK)
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!companySettings?.id) {
        console.error("No company settings found for user");
        set({ error: "ไม่พบข้อมูลบริษัท กรุณาตั้งค่าบริษัทก่อน", isLoading: false });
        return null;
      }

      const { data: customer, error } = await supabase
        .from("customers")
        .insert({
          company_id: companySettings.id,
          customer_type: data.customer_type || "company",
          name: data.name,
          tax_id: data.tax_id || null,
          branch_code: data.branch_code || "00000",
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

      if (error) {
        console.error("Supabase error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      set((state) => ({
        customers: [...state.customers, customer],
        isLoading: false,
      }));

      return customer;
    } catch (error) {
      console.error("Error creating customer:", error);
      set({ error: "ไม่สามารถสร้างข้อมูลลูกค้าได้", isLoading: false });
      return null;
    }
  },

  updateCustomer: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      const { data: customer, error } = await supabase
        .from("customers")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? customer : c)),
        isLoading: false,
      }));

      return customer;
    } catch (error) {
      console.error("Error updating customer:", error);
      set({ error: "ไม่สามารถอัพเดทข้อมูลลูกค้าได้", isLoading: false });
      return null;
    }
  },

  deleteCustomer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("customers")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error deleting customer:", error);
      set({ error: "ไม่สามารถลบข้อมูลลูกค้าได้", isLoading: false });
    }
  },

  // Find existing customer by tax_id or name, or create new one.
  // Matching is scoped to this user's company and only writes when fields changed.
  findOrCreateCustomer: async (data) => {
    if (!data.name || data.name.trim() === "") {
      return null;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ error: "กรุณาเข้าสู่ระบบก่อน" });
        return null;
      }

      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!companySettings?.id) {
        set({ error: "ไม่พบข้อมูลบริษัท กรุณาตั้งค่าบริษัทก่อน" });
        return null;
      }

      const result = await findOrCreateCustomerRecord(supabase, companySettings.id, data);
      if (!result) return null;
      const customer = result.customer as Customer;

      if (result.action === "created") {
        set((state) => ({
          customers: state.customers.some((existing) => existing.id === customer.id)
            ? state.customers.map((existing) => existing.id === customer.id ? customer : existing)
            : [...state.customers, customer],
        }));
      } else if (result.action === "updated") {
        set((state) => ({
          customers: state.customers.map((existing) => existing.id === customer.id ? customer : existing),
        }));
      }

      return customer;
    } catch (error) {
      console.error("Error in findOrCreateCustomer:", error);
      return null;
    }
  },
}));
