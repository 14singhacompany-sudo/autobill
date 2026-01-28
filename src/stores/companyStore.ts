import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

export interface CompanySettings {
  id?: string;
  company_name: string;
  company_name_en: string;
  tax_id: string;
  branch_code: string;
  branch_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  // Document settings
  qt_prefix: string;
  qt_next_number: number;
  qt_validity_days: number;
  iv_prefix: string;
  iv_next_number: number;
  iv_due_days: number;
  vat_rate: number;
  default_terms: string;
  // Bank settings
  bank_name: string;
  bank_branch: string;
  account_name: string;
  account_number: string;
}

interface CompanyStore {
  settings: CompanySettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Partial<CompanySettings>) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | null>;
  deleteLogo: () => Promise<boolean>;
}

const defaultSettings: CompanySettings = {
  company_name: "",
  company_name_en: "",
  tax_id: "",
  branch_code: "00000",
  branch_name: "สำนักงานใหญ่",
  address: "",
  phone: "",
  email: "",
  website: "",
  logo_url: "",
  qt_prefix: "QT",
  qt_next_number: 1,
  qt_validity_days: 30,
  iv_prefix: "IV",
  iv_next_number: 1,
  iv_due_days: 30,
  vat_rate: 7,
  default_terms: "",
  bank_name: "",
  bank_branch: "",
  account_name: "",
  account_number: "",
};

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        // If no settings exist, use defaults
        if (error.code === "PGRST116") {
          set({ settings: defaultSettings, isLoading: false });
          return;
        }
        throw error;
      }

      set({ settings: data as CompanySettings, isLoading: false });
    } catch (error) {
      console.error("Error fetching company settings:", error);
      set({ settings: defaultSettings, error: "ไม่สามารถโหลดข้อมูลได้", isLoading: false });
    }
  },

  saveSettings: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const currentSettings = get().settings;

      if (currentSettings?.id) {
        // Update existing
        const { error } = await supabase
          .from("company_settings")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentSettings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("company_settings")
          .insert({
            ...defaultSettings,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;

        set({ settings: data as CompanySettings });
      }

      // Update local state
      set((state) => ({
        settings: state.settings ? { ...state.settings, ...updates } : { ...defaultSettings, ...updates },
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Error saving company settings:", error);
      set({ error: "ไม่สามารถบันทึกข้อมูลได้", isLoading: false });
      return false;
    }
  },

  uploadLogo: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const currentSettings = get().settings;

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;

      // Delete old logo if exists
      if (currentSettings?.logo_url) {
        const oldPath = currentSettings.logo_url.split("/company-assets/")[1];
        if (oldPath) {
          await supabase.storage.from("company-assets").remove([oldPath]);
        }
      }

      // Save logo URL to settings
      await get().saveSettings({ logo_url: logoUrl });

      set({ isLoading: false });
      return logoUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      set({ error: "ไม่สามารถอัปโหลดโลโก้ได้", isLoading: false });
      return null;
    }
  },

  deleteLogo: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const currentSettings = get().settings;

      if (currentSettings?.logo_url) {
        // Extract file path from URL
        const filePath = currentSettings.logo_url.split("/company-assets/")[1];
        if (filePath) {
          await supabase.storage.from("company-assets").remove([filePath]);
        }
      }

      // Clear logo URL in settings
      await get().saveSettings({ logo_url: "" });

      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error("Error deleting logo:", error);
      set({ error: "ไม่สามารถลบโลโก้ได้", isLoading: false });
      return false;
    }
  },
}));
