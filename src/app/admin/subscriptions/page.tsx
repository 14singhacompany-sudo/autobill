"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { Search, CreditCard, RefreshCw, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
}

interface Subscription {
  id: string;
  company_id: string;
  company_name: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [newPlanId, setNewPlanId] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Fetch plans
      const { data: plansData } = await supabase
        .from("plans")
        .select("id, name, display_name, price_monthly")
        .eq("is_active", true)
        .order("sort_order");

      if (plansData) {
        setPlans(plansData);
      }

      // Fetch subscriptions with company info
      const { data: subsData } = await supabase
        .from("subscriptions")
        .select(`
          id,
          company_id,
          plan_id,
          status,
          trial_ends_at,
          current_period_start,
          current_period_end,
          created_at,
          company:companies(name, user_id),
          plan:plans(display_name)
        `)
        .order("created_at", { ascending: false });

      if (subsData) {
        // Get user emails
        const subscriptionsWithEmails = await Promise.all(
          subsData.map(async (sub) => {
            const company = sub.company as any;
            const plan = sub.plan as any;

            // Get user email
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", company?.user_id || "")
              .single();

            return {
              id: sub.id,
              company_id: sub.company_id,
              company_name: company?.name || "-",
              user_email: profile?.email || "-",
              plan_id: sub.plan_id,
              plan_name: plan?.display_name || "-",
              status: sub.status,
              trial_ends_at: sub.trial_ends_at,
              current_period_start: sub.current_period_start,
              current_period_end: sub.current_period_end,
              created_at: sub.created_at,
            };
          })
        );

        setSubscriptions(subscriptionsWithEmails);
        setFilteredSubscriptions(subscriptionsWithEmails);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = subscriptions;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.user_email.toLowerCase().includes(term) ||
          sub.company_name.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((sub) => sub.status === statusFilter);
    }

    // Plan filter
    if (planFilter !== "all") {
      result = result.filter((sub) => sub.plan_name === planFilter);
    }

    setFilteredSubscriptions(result);
  }, [subscriptions, searchTerm, statusFilter, planFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      trial: "bg-blue-100 text-blue-700",
      active: "bg-green-100 text-green-700",
      cancelled: "bg-gray-100 text-gray-700",
      expired: "bg-red-100 text-red-700",
      past_due: "bg-orange-100 text-orange-700",
    };

    const statusLabels: Record<string, string> = {
      trial: "ทดลองใช้",
      active: "Active",
      cancelled: "ยกเลิก",
      expired: "หมดอายุ",
      past_due: "ค้างชำระ",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-700"}`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  const handleEditClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setNewPlanId(subscription.plan_id);
    setNewStatus(subscription.status);
    setEditDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;

    setIsUpdating(true);
    const supabase = createClient();

    try {
      const updates: any = {
        plan_id: newPlanId,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // If changing to active, set period dates
      if (newStatus === "active" && selectedSubscription.status !== "active") {
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        updates.current_period_start = now.toISOString().split("T")[0];
        updates.current_period_end = nextMonth.toISOString().split("T")[0];
        updates.trial_ends_at = null;
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updates)
        .eq("id", selectedSubscription.id);

      if (error) throw error;

      toast({
        title: "อัพเดทสำเร็จ",
        description: "บันทึกการเปลี่ยนแปลงแล้ว",
      });

      setEditDialogOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดทได้",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการ Subscription</h1>
          <p className="text-muted-foreground">
            จัดการแพ็คเกจและสถานะผู้ใช้
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาอีเมล, บริษัท..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="trial">ทดลองใช้</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">ยกเลิก</SelectItem>
                <SelectItem value="expired">หมดอายุ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="แพ็คเกจ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกแพ็คเกจ</SelectItem>
                <SelectItem value="FREE">FREE</SelectItem>
                <SelectItem value="SOLO">SOLO</SelectItem>
                <SelectItem value="PRO">PRO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            รายการ Subscription ({filteredSubscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    บริษัท
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    อีเมล
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    แพ็คเกจ
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    สถานะ
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    ช่วงเวลา
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">
                        {sub.company_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {sub.user_email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{sub.plan_name}</span>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                      <td className="py-3 px-4 text-sm">
                        {sub.status === "trial" ? (
                          <span>
                            Trial หมด: {formatDate(sub.trial_ends_at)}
                          </span>
                        ) : (
                          <span>
                            {formatDate(sub.current_period_start)} -{" "}
                            {formatDate(sub.current_period_end)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(sub)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไข Subscription</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.company_name} ({selectedSubscription?.user_email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">แพ็คเกจ</label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกแพ็คเกจ" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.display_name} - ฿{plan.price_monthly}/เดือน
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">สถานะ</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">ทดลองใช้</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  <SelectItem value="expired">หมดอายุ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isUpdating}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleUpdateSubscription} disabled={isUpdating}>
              {isUpdating ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
