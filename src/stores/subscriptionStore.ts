import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { isActivePeriodExpired } from "@/lib/subscription-period";

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  invoice_limit: number | null;
  quotation_limit: number | null;
  ai_extraction_limit: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: "trial" | "active" | "cancelled" | "expired" | "past_due";
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  plan?: Plan;
}

export interface Usage {
  invoice_count: number;
  quotation_count: number;
  ai_extraction_count: number;
  invoice_limit: number | null;
  quotation_limit: number | null;
  ai_extraction_limit: number | null;
  is_within_limit: boolean;
  document_count?: number;
  document_limit?: number | null;
}

interface SubscriptionStore {
  plans: Plan[];
  subscription: Subscription | null;
  usage: Usage | null;
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  fetchUsage: () => Promise<void>;
  checkCanCreateInvoice: () => Promise<boolean>;
  checkCanCreateQuotation: () => Promise<boolean>;
  checkCanCreateDocument: () => Promise<boolean>;
  incrementInvoiceCount: () => Promise<void>;
  incrementQuotationCount: () => Promise<void>;
  getTrialDaysRemaining: () => number;
  isTrialExpired: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  plans: [],
  subscription: null,
  usage: null,
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      set({ plans: data || [] });
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  },

  fetchSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ subscription: null, isLoading: false });
        return;
      }

      // Get company ID for current user
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        set({ subscription: null, isLoading: false });
        return;
      }

      // Get subscription with plan details
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plan:plans(*)
        `)
        .eq("company_id", company.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      set({ subscription: subscription || null, isLoading: false });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      set({ error: "ไม่สามารถโหลดข้อมูล subscription ได้", isLoading: false });
    }
  },

  fetchUsage: async () => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ usage: null });
        return;
      }

      // Get company ID for current user
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        set({ usage: null });
        return;
      }

      // Get current usage using RPC
      const { data, error } = await supabase.rpc("get_current_usage", {
        p_company_id: company.id,
      });

      if (error) throw error;

      const { data: combined, error: combinedError } = await supabase.rpc("get_combined_document_usage", { p_company_id: company.id });
      const combinedUsage = !combinedError && combined?.[0] ? combined[0] : {};
      if (data && data.length > 0) {
        set({ usage: { ...data[0], ...combinedUsage } });
      } else {
        // No usage record yet
        const { subscription } = get();
        set({
          usage: {
            invoice_count: 0,
            quotation_count: 0,
            ai_extraction_count: 0,
            invoice_limit: subscription?.plan?.invoice_limit || null,
            quotation_limit: subscription?.plan?.quotation_limit || null,
            ai_extraction_limit: subscription?.plan?.ai_extraction_limit || null,
            is_within_limit: true,
            document_count: combinedUsage.document_count,
            document_limit: combinedUsage.document_limit,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    }
  },

  checkCanCreateInvoice: async () => {
    const { usage, subscription } = get();

    // Trial or active subscription
    if (subscription?.status === "trial" || subscription?.status === "active") {
      // Check if trial expired
      if (subscription.status === "trial" && get().isTrialExpired()) {
        return false;
      }
      if (subscription.status === "active" && isActivePeriodExpired(subscription.current_period_end)) {
        return false;
      }

      if (usage?.document_limit !== undefined) {
        return usage.document_limit === null || (usage.document_count || 0) < usage.document_limit;
      }
      // Backward compatibility before the combined-quota migration is deployed.
      if (usage?.invoice_limit === null) {
        return true;
      }

      // Check limit
      return (usage?.invoice_count || 0) < (usage?.invoice_limit || 0);
    }

    return false;
  },

  checkCanCreateQuotation: async () => {
    const { usage, subscription } = get();

    // Trial or active subscription
    if (subscription?.status === "trial" || subscription?.status === "active") {
      // Check if trial expired
      if (subscription.status === "trial" && get().isTrialExpired()) {
        return false;
      }
      if (subscription.status === "active" && isActivePeriodExpired(subscription.current_period_end)) {
        return false;
      }

      if (usage?.document_limit !== undefined) {
        return usage.document_limit === null || (usage.document_count || 0) < usage.document_limit;
      }
      // Backward compatibility before the combined-quota migration is deployed.
      if (usage?.quotation_limit === null) {
        return true;
      }

      // Check limit
      return (usage?.quotation_count || 0) < (usage?.quotation_limit || 0);
    }

    return false;
  },

  checkCanCreateDocument: async () => {
    const { subscription, usage } = get();
    if (!subscription || !["trial", "active"].includes(subscription.status)) return false;
    if (subscription.status === "trial" && get().isTrialExpired()) return false;
    if (subscription.status === "active" && isActivePeriodExpired(subscription.current_period_end)) return false;
    if (usage?.document_limit === undefined) return false;
    return usage.document_limit === null || (usage.document_count || 0) < usage.document_limit;
  },

  incrementInvoiceCount: async () => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get company ID for current user
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) return;

      // Increment using RPC
      await supabase.rpc("increment_usage", {
        p_company_id: company.id,
        p_type: "invoice",
      });

      // Refresh usage
      await get().fetchUsage();
    } catch (error) {
      console.error("Error incrementing invoice count:", error);
    }
  },

  incrementQuotationCount: async () => {
    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get company ID for current user
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) return;

      // Increment using RPC
      await supabase.rpc("increment_usage", {
        p_company_id: company.id,
        p_type: "quotation",
      });

      // Refresh usage
      await get().fetchUsage();
    } catch (error) {
      console.error("Error incrementing quotation count:", error);
    }
  },

  getTrialDaysRemaining: () => {
    const { subscription } = get();
    if (!subscription?.trial_ends_at) return 0;

    const trialEnds = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnds.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  },

  isTrialExpired: () => {
    const { subscription } = get();
    if (subscription?.status !== "trial") return false;
    if (!subscription.trial_ends_at) return false;

    const trialEnds = new Date(subscription.trial_ends_at);
    const now = new Date();

    return now > trialEnds;
  },
}));
