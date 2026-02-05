import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
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

export const useCustomerStore = create<CustomerStore>((set, get) => ({
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

      // Get company_id from company_settings
      const { data: companySettings } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .single();

      if (!companySettings?.id) {
        console.error("No company settings found");
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

  // Find existing customer by tax_id or name, or create new one
  // Only update if data has changed
  findOrCreateCustomer: async (data) => {
    if (!data.name || data.name.trim() === "") {
      return null;
    }

    // Helper function to check if data has changed
    const hasDataChanged = (existing: Customer, newData: CustomerFormData): boolean => {
      const normalize = (val: string | undefined | null) => val?.trim() || "";

      return (
        normalize(existing.name) !== normalize(newData.name) ||
        normalize(existing.tax_id) !== normalize(newData.tax_id) ||
        normalize(existing.address) !== normalize(newData.address) ||
        normalize(existing.branch_code) !== normalize(newData.branch_code) ||
        normalize(existing.contact_name) !== normalize(newData.contact_name) ||
        normalize(existing.phone) !== normalize(newData.phone) ||
        normalize(existing.email) !== normalize(newData.email)
      );
    };

    try {
      const supabase = createClient();

      // First, try to find existing customer by tax_id + branch_code (if provided)
      // บริษัทเดียวกัน (tax_id เดียวกัน) แต่คนละสาขา ต้องแยกเก็บเป็นคนละ record
      if (data.tax_id && data.tax_id.trim() !== "") {
        const branchCode = data.branch_code || "00000";
        const { data: existingByTaxIdAndBranch } = await supabase
          .from("customers")
          .select("*")
          .eq("tax_id", data.tax_id)
          .eq("branch_code", branchCode)
          .eq("is_active", true)
          .limit(1);

        if (existingByTaxIdAndBranch && existingByTaxIdAndBranch.length > 0) {
          const existing = existingByTaxIdAndBranch[0];

          // Only update if data has changed (ไม่รวม branch_code เพราะใช้เป็น key แล้ว)
          const hasOtherDataChanged = (existing: Customer, newData: CustomerFormData): boolean => {
            const normalize = (val: string | undefined | null) => val?.trim() || "";
            return (
              normalize(existing.name) !== normalize(newData.name) ||
              normalize(existing.address) !== normalize(newData.address) ||
              normalize(existing.contact_name) !== normalize(newData.contact_name) ||
              normalize(existing.phone) !== normalize(newData.phone) ||
              normalize(existing.email) !== normalize(newData.email)
            );
          };

          if (!hasOtherDataChanged(existing, data)) {
            // Data is the same, return existing without updating
            return existing;
          }

          // Update existing customer with new info (ไม่อัพเดท branch_code)
          const updated = await get().updateCustomer(existing.id, {
            name: data.name,
            address: data.address,
            contact_name: data.contact_name,
            phone: data.phone,
            email: data.email,
          });
          return updated;
        }
      }

      // Try to find by exact name + branch_code match
      // บริษัทชื่อเดียวกัน แต่คนละสาขา ต้องแยกเก็บเป็นคนละ record
      const branchCodeForName = data.branch_code || "00000";
      const { data: existingByName } = await supabase
        .from("customers")
        .select("*")
        .eq("name", data.name)
        .eq("branch_code", branchCodeForName)
        .eq("is_active", true)
        .limit(1);

      if (existingByName && existingByName.length > 0) {
        const existing = existingByName[0];

        // Merge data - prefer new data if provided, otherwise keep existing (ไม่รวม branch_code)
        const mergedData: CustomerFormData = {
          customer_type: data.customer_type,
          name: data.name,
          tax_id: data.tax_id || existing.tax_id || undefined,
          address: data.address || existing.address || undefined,
          branch_code: branchCodeForName,
          contact_name: data.contact_name || existing.contact_name || undefined,
          phone: data.phone || existing.phone || undefined,
          email: data.email || existing.email || undefined,
        };

        // Check if other data changed (ไม่รวม branch_code)
        const hasOtherDataChanged = (existing: Customer, newData: CustomerFormData): boolean => {
          const normalize = (val: string | undefined | null) => val?.trim() || "";
          return (
            normalize(existing.name) !== normalize(newData.name) ||
            normalize(existing.tax_id) !== normalize(newData.tax_id) ||
            normalize(existing.address) !== normalize(newData.address) ||
            normalize(existing.contact_name) !== normalize(newData.contact_name) ||
            normalize(existing.phone) !== normalize(newData.phone) ||
            normalize(existing.email) !== normalize(newData.email)
          );
        };

        if (!hasOtherDataChanged(existing, mergedData)) {
          // Data is the same, return existing without updating
          return existing;
        }

        // Update existing customer with merged info (ไม่อัพเดท branch_code)
        const updated = await get().updateCustomer(existing.id, {
          tax_id: mergedData.tax_id,
          address: mergedData.address,
          contact_name: mergedData.contact_name,
          phone: mergedData.phone,
          email: mergedData.email,
        });
        return updated;
      }

      // Create new customer
      const newCustomer = await get().createCustomer(data);
      return newCustomer;
    } catch (error) {
      console.error("Error in findOrCreateCustomer:", error);
      return null;
    }
  },
}));
