import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { differenceInDays } from "date-fns";

export interface Alert {
  id: string;
  type: "quotation_expiring" | "invoice_overdue" | "quotation_pending";
  documentId: string;
  documentNumber: string;
  message: string;
  date: string;
  daysRemaining?: number;
}

interface NotificationState {
  alerts: Alert[];
  isLoading: boolean;
  lastFetched: Date | null;
  fetchAlerts: () => Promise<void>;
  clearAlerts: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  alerts: [],
  isLoading: false,
  lastFetched: null,

  fetchAlerts: async () => {
    // Prevent fetching if already loaded within last 30 seconds
    const lastFetched = get().lastFetched;
    if (lastFetched && Date.now() - lastFetched.getTime() < 30000) {
      return;
    }

    set({ isLoading: true });
    try {
      const supabase = createClient();
      const now = new Date();
      const alertsList: Alert[] = [];

      // Fetch recent quotations
      const { data: quotations } = await supabase
        .from("quotations")
        .select("id, quotation_number, status, valid_until, issue_date")
        .not("status", "in", '("cancelled","converted","expired")')
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch recent invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, due_date, issue_date")
        .not("status", "in", '("paid","cancelled")')
        .order("created_at", { ascending: false })
        .limit(50);

      // Check expiring quotations (valid_until within 7 days)
      const expiringQuotations = quotations?.filter((q) => {
        if (!q.valid_until || q.status === "converted" || q.status === "expired") return false;
        const daysLeft = differenceInDays(new Date(q.valid_until), now);
        return daysLeft >= 0 && daysLeft <= 7;
      }) || [];

      expiringQuotations.forEach((q) => {
        const daysLeft = differenceInDays(new Date(q.valid_until!), now);
        alertsList.push({
          id: `qt-exp-${q.id}`,
          type: "quotation_expiring",
          documentId: q.id,
          documentNumber: q.quotation_number,
          message: `ใบเสนอราคา ${q.quotation_number} จะหมดอายุใน ${daysLeft} วัน`,
          date: q.valid_until!,
          daysRemaining: daysLeft,
        });
      });

      // Check pending quotations (draft status more than 3 days)
      const pendingQuotations = quotations?.filter((q) => {
        if (q.status !== "draft") return false;
        const daysSinceCreated = differenceInDays(now, new Date(q.issue_date));
        return daysSinceCreated >= 3;
      }) || [];

      pendingQuotations.forEach((q) => {
        alertsList.push({
          id: `qt-pending-${q.id}`,
          type: "quotation_pending",
          documentId: q.id,
          documentNumber: q.quotation_number,
          message: `ใบเสนอราคา ${q.quotation_number} ยังเป็นร่าง รอการส่ง`,
          date: q.issue_date,
        });
      });

      // Check overdue invoices
      // Skip if due_date equals issue_date (cash payment, no credit term)
      const overdueInvoices = invoices?.filter((inv) => {
        if (!inv.due_date || inv.status === "paid" || inv.status === "cancelled") return false;
        // Skip if due_date is same as issue_date (cash payment)
        if (inv.issue_date === inv.due_date) return false;
        return differenceInDays(now, new Date(inv.due_date)) > 0;
      }) || [];

      overdueInvoices.forEach((inv) => {
        const daysOverdue = differenceInDays(now, new Date(inv.due_date!));
        alertsList.push({
          id: `inv-overdue-${inv.id}`,
          type: "invoice_overdue",
          documentId: inv.id,
          documentNumber: inv.invoice_number,
          message: `ใบกำกับภาษี ${inv.invoice_number} เลยกำหนดชำระ ${daysOverdue} วัน`,
          date: inv.due_date!,
        });
      });

      // Sort alerts by urgency
      alertsList.sort((a, b) => {
        if (a.type === "invoice_overdue" && b.type !== "invoice_overdue") return -1;
        if (a.type === "quotation_expiring" && b.type === "quotation_pending") return -1;
        return 0;
      });

      set({ alerts: alertsList, lastFetched: new Date() });
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearAlerts: () => {
    set({ alerts: [], lastFetched: null });
  },
}));
