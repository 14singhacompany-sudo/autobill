"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Search, Users, RefreshCw, Edit, Phone, Mail, Calendar, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  company_id: string | null;
  company_name: string;
  plan_id: string | null;
  plan_name: string;
  status: string;
  subscription_id: string | null;
  invoice_count: number;
  quotation_count: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editPlanId, setEditPlanId] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editTrialEndsAt, setEditTrialEndsAt] = useState("");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchPlans = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("plans")
      .select("id, name, display_name")
      .order("price_monthly", { ascending: true });
    if (data) {
      setPlans(data);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    console.log("=== fetchUsers called ===");

    try {
      // Use API to fetch users (bypasses RLS)
      const response = await fetch("/api/admin/users");
      const result = await response.json();
      console.log("API /api/admin/users response:", response.status, result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch users");
      }

      // Log each user's subscription_id
      result.users?.forEach((u: any) => {
        console.log(`User ${u.email}: subscription_id = ${u.subscription_id}`);
      });

      setUsers(result.users || []);
      setFilteredUsers(result.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(term) ||
          user.full_name.toLowerCase().includes(term) ||
          user.company_name.toLowerCase().includes(term) ||
          (user.phone && user.phone.includes(term))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((user) => user.status === statusFilter);
    }

    // Plan filter
    if (planFilter !== "all") {
      result = result.filter((user) => user.plan_name === planFilter);
    }

    setFilteredUsers(result);
  }, [users, searchTerm, statusFilter, planFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      trial: "bg-blue-100 text-blue-700",
      active: "bg-green-100 text-green-700",
      cancelled: "bg-gray-100 text-gray-700",
      expired: "bg-red-100 text-red-700",
    };

    const statusLabels: Record<string, string> = {
      trial: "ทดลองใช้",
      active: "Active",
      cancelled: "ยกเลิก",
      expired: "หมดอายุ",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-700"}`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  const getTrialDaysRemaining = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null;
    const trialEnds = new Date(trialEndsAt);
    const now = new Date();
    const diffTime = trialEnds.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditPlanId(user.plan_id || "");
    setEditStatus(user.status);
    setEditTrialEndsAt(formatDateForInput(user.trial_ends_at));
    setEditPeriodEnd(formatDateForInput(user.current_period_end));
    setEditDialogOpen(true);
  };

  const handleSaveSubscription = async () => {
    console.log("=== handleSaveSubscription called ===");
    console.log("selectedUser:", selectedUser);
    console.log("subscription_id:", selectedUser?.subscription_id);

    if (!selectedUser || !selectedUser.subscription_id) {
      console.log("No subscription_id, showing error toast");
      toast({
        title: "ไม่พบข้อมูล Subscription",
        description: "ผู้ใช้นี้ยังไม่มี subscription",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    console.log("Sending request to API...");

    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription_id: selectedUser.subscription_id,
          plan_id: editPlanId || undefined,
          status: editStatus,
          trial_ends_at: editTrialEndsAt ? new Date(editTrialEndsAt).toISOString() : undefined,
          current_period_end: editPeriodEnd || undefined,
        }),
      });

      const result = await response.json();
      console.log("API response:", response.status, result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to update subscription");
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "อัพเดท subscription เรียบร้อยแล้ว",
      });

      setEditDialogOpen(false);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถอัพเดท subscription ได้",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExtendTrial = (days: number) => {
    const currentDate = editTrialEndsAt ? new Date(editTrialEndsAt) : new Date();
    currentDate.setDate(currentDate.getDate() + days);
    setEditTrialEndsAt(currentDate.toISOString().split("T")[0]);
  };

  const handleExtendPeriod = (months: number) => {
    const currentDate = editPeriodEnd ? new Date(editPeriodEnd) : new Date();
    currentDate.setMonth(currentDate.getMonth() + months);
    setEditPeriodEnd(currentDate.toISOString().split("T")[0]);
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
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground">
            รายการผู้ใช้ทั้งหมด {users.length} คน
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers} className="gap-2">
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
                placeholder="ค้นหาชื่อ, อีเมล, บริษัท, เบอร์โทร..."
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            รายการผู้ใช้ ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    ผู้ใช้
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    บริษัท
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    แพ็คเกจ
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    สถานะ
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    เอกสาร
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    สมัครเมื่อ
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      ไม่พบข้อมูลผู้ใช้
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const trialDays = getTrialDaysRemaining(user.trial_ends_at);
                    return (
                      <tr
                        key={user.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{user.company_name}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-primary">{user.plan_name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {getStatusBadge(user.status)}
                            {user.status === "trial" && trialDays !== null && (
                              <p className="text-xs text-muted-foreground">
                                เหลือ {trialDays} วัน
                              </p>
                            )}
                            {user.current_period_end && user.status === "active" && (
                              <p className="text-xs text-muted-foreground">
                                หมดอายุ {formatDate(user.current_period_end)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p>บิล: {user.invoice_count}</p>
                            <p>ใบเสนอราคา: {user.quotation_count}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(user)}
                            className="gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            แก้ไข
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แก้ไข Subscription</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Plan */}
            <div className="space-y-2">
              <Label>แพ็คเกจ</Label>
              <Select value={editPlanId} onValueChange={setEditPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกแพ็คเกจ" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">ทดลองใช้ (Trial)</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  <SelectItem value="expired">หมดอายุ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trial End Date */}
            {editStatus === "trial" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  วันหมดอายุทดลองใช้
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={editTrialEndsAt}
                    onChange={(e) => setEditTrialEndsAt(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendTrial(7)}
                  >
                    +7 วัน
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendTrial(14)}
                  >
                    +14 วัน
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendTrial(30)}
                  >
                    +30 วัน
                  </Button>
                </div>
              </div>
            )}

            {/* Period End Date */}
            {editStatus === "active" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  วันหมดอายุ Subscription
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={editPeriodEnd}
                    onChange={(e) => setEditPeriodEnd(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendPeriod(1)}
                  >
                    +1 เดือน
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendPeriod(3)}
                  >
                    +3 เดือน
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendPeriod(6)}
                  >
                    +6 เดือน
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendPeriod(12)}
                  >
                    +1 ปี
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => {
                console.log("Button clicked!");
                handleSaveSubscription();
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
