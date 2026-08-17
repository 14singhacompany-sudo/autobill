"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Search, Users, RefreshCw, Edit, Phone, Mail, Calendar, Save, Loader2, Plus, Ban, UserCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addCalendarMonths } from "@/lib/subscription-period";

interface User {
  id: string;
  email: string;
  email_confirmed: boolean;
  full_name: string;
  phone: string | null;
  created_at: string;
  company_id: string | null;
  company_name: string;
  entity_type: "individual" | "juristic" | "partnership" | null;
  vat_registered: boolean | null;
  vat_settings_id: string | null;
  vat_verification_status: "not_submitted" | "pending" | "verified" | "rejected";
  vat_document_submitted: boolean;
  vat_submitted_at: string | null;
  terms_accepted_at: string | null;
  plan_id: string | null;
  plan_name: string;
  status: string;
  subscription_id: string | null;
  invoice_count: number;
  quotation_count: number;
  receipt_count: number;
  billing_invoice_count: number;
  total_document_count: number;
  monthly_issued_count: number;
  monthly_quota_count: number;
  monthly_quotation_count: number;
  monthly_invoice_count: number;
  monthly_receipt_count: number;
  monthly_billing_invoice_count: number;
  monthly_total_amount: number;
  document_limit: number | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  suspended: boolean;
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
  const [quotaFilter, setQuotaFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date())
  );

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editPlanId, setEditPlanId] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editTrialEndsAt, setEditTrialEndsAt] = useState("");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [periodEndTouched, setPeriodEndTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", company_name: "", phone: "", entity_type: "", vat_registered: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const getEntityTypeLabel = (entityType: User["entity_type"]) => {
    if (entityType === "individual") return "บุคคลธรรมดา";
    if (entityType === "juristic") return "นิติบุคคล";
    if (entityType === "partnership") return "ห้างหุ้นส่วน/คณะบุคคล";
    return "ไม่ระบุประเภท";
  };

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
      const response = await fetch(`/api/admin/users?month=${encodeURIComponent(selectedMonth)}`);
      const result = await response.json();
      console.log("API /api/admin/users response:", response.status, result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch users");
      }

      // Log each user's subscription_id
      result.users?.forEach((u: any) => {
        console.log(`User ${u.email}: subscription_id = ${u.subscription_id}`);
      });

      const newestFirst = [...(result.users || [])].sort(
        (a: User, b: User) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setUsers(newestFirst);
      setFilteredUsers(newestFirst);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);
  useEffect(() => { fetchUsers(); }, [selectedMonth]);

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

    if (quotaFilter !== "all") {
      result = result.filter((user) => {
        if (quotaFilter === "unlimited") return user.document_limit === null;
        if (user.document_limit === null) return false;
        const percent = user.document_limit > 0 ? user.monthly_quota_count / user.document_limit : 0;
        if (quotaFilter === "full") return percent >= 1;
        if (quotaFilter === "near") return percent >= 0.8 && percent < 1;
        return percent < 0.8;
      });
    }

    setFilteredUsers(result);
  }, [users, searchTerm, statusFilter, planFilter, quotaFilter]);

  const fullQuotaCount = users.filter((user) => user.document_limit !== null && user.monthly_quota_count >= user.document_limit).length;
  const nearQuotaCount = users.filter((user) => user.document_limit !== null && user.monthly_quota_count >= user.document_limit * 0.8 && user.monthly_quota_count < user.document_limit).length;

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
    setPeriodEndTouched(false);
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
          current_period_end: editStatus === "active" && (periodEndTouched || selectedUser.status === "active")
            ? editPeriodEnd || undefined
            : undefined,
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
    const base = editPeriodEnd || new Date().toISOString().split("T")[0];
    setEditPeriodEnd(addCalendarMonths(base, months));
    setPeriodEndTouched(true);
  };

  const handleCreateUser = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ไม่สามารถเพิ่มผู้ใช้ได้");
      toast({ title: "เพิ่มผู้ใช้สำเร็จ", description: "สร้างบัญชีและแพ็กเกจ FREE ให้แล้ว" });
      setNewUser({ email: "", password: "", full_name: "", company_name: "", phone: "", entity_type: "", vat_registered: "" });
      setCreateDialogOpen(false);
      await fetchUsers();
    } catch (error) {
      toast({ title: "เพิ่มผู้ใช้ไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSuspend = async (user: User) => {
    const verb = user.suspended ? "เปิดใช้งาน" : "ระงับ";
    if (!window.confirm(`ยืนยัน${verb}บัญชี ${user.email}?`)) return;
    setActionUserId(user.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, suspended: !user.suspended }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `ไม่สามารถ${verb}บัญชีได้`);
      toast({ title: `${verb}บัญชีแล้ว` });
      await fetchUsers();
    } catch (error) {
      toast({ title: "ดำเนินการไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setActionUserId(null);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`ลบบัญชี ${user.email} และข้อมูลบริษัททั้งหมดอย่างถาวร? การกระทำนี้ย้อนกลับไม่ได้`)) return;
    setActionUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users?user_id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ไม่สามารถลบบัญชีได้");
      toast({ title: "ลบบัญชีแล้ว" });
      await fetchUsers();
    } catch (error) {
      toast({ title: "ลบบัญชีไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setActionUserId(null);
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
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground">
            รายการผู้ใช้ทั้งหมด {users.length} คน
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUsers} className="gap-2"><RefreshCw className="h-4 w-4" />รีเฟรช</Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />เพิ่มผู้ใช้</Button>
        </div>
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
            <Select value={quotaFilter} onValueChange={setQuotaFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="สถานะโควตา" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะโควตา</SelectItem>
                <SelectItem value="full">เต็มแล้ว</SelectItem>
                <SelectItem value="near">ใกล้เต็ม</SelectItem>
                <SelectItem value="normal">ใช้งานปกติ</SelectItem>
                <SelectItem value="unlimited">ไม่จำกัด</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium">สรุปเอกสารรายเดือน</p><p className="text-sm text-muted-foreground">เลือกเดือนเพื่อดูจำนวนเอกสารที่ออกแล้วและมูลค่ารวม</p></div>
          <div className="w-full sm:w-52"><Label htmlFor="usage-month">เดือนที่ต้องการดู</Label><Input id="usage-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={nearQuotaCount > 0 ? "border-yellow-300 bg-yellow-50" : ""}>
          <CardContent className="pt-6"><p className="text-sm text-muted-foreground">ใกล้เต็มโควตา (80% ขึ้นไป)</p><p className="text-3xl font-bold text-yellow-700">{nearQuotaCount}</p></CardContent>
        </Card>
        <Card className={fullQuotaCount > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="pt-6"><p className="text-sm text-muted-foreground">โควตาเต็มแล้ว</p><p className="text-3xl font-bold text-red-700">{fullQuotaCount}</p></CardContent>
        </Card>
      </div>

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
            <table className="w-full min-w-[1280px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    ผู้ใช้
                  </th>
                  <th className="min-w-[230px] text-left py-3 px-4 font-medium text-muted-foreground">
                    บริษัท
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    เบอร์โทร
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    แพ็คเกจ
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    สถานะ
                  </th>
                  <th className="min-w-[260px] text-left py-3 px-4 font-medium text-muted-foreground">
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
                      colSpan={8}
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
                            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${user.email_confirmed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                              {user.email_confirmed ? "ยืนยันอีเมลแล้ว" : "ยังไม่ยืนยันอีเมล"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <p className="font-medium">{user.company_name}</p>
                          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                            <p>{getEntityTypeLabel(user.entity_type)}</p>
                            <p className={user.vat_registered === true ? "font-medium text-emerald-700" : ""}>
                              {user.vat_registered === true
                                ? "จดทะเบียน VAT แล้ว"
                                : user.vat_registered === false
                                  ? "ไม่ได้จดทะเบียน VAT"
                                  : "ยังไม่ระบุสถานะ VAT"}
                            </p>
                            <p>{user.terms_accepted_at ? "ยอมรับเงื่อนไขแล้ว" : "ไม่พบข้อมูลการยอมรับเงื่อนไข"}</p>
                            {user.vat_registered === true && user.vat_verification_status === "pending" && user.vat_document_submitted && user.vat_settings_id && (
                              <Link
                                href={`/admin/vat-verifications?company=${encodeURIComponent(user.vat_settings_id)}`}
                                className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 underline underline-offset-2 hover:bg-amber-200"
                                title="ไปหน้าตรวจ ภ.พ.20 ของผู้ใช้นี้"
                              >
                                ส่ง ภ.พ.20 แล้ว · รอตรวจ
                              </Link>
                            )}
                            {user.vat_registered === true && user.vat_verification_status === "verified" && (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                                ภ.พ.20 อนุมัติแล้ว
                              </span>
                            )}
                            {user.vat_registered === true && user.vat_verification_status === "rejected" && user.vat_settings_id && (
                              <Link
                                href={`/admin/vat-verifications?company=${encodeURIComponent(user.vat_settings_id)}`}
                                className="inline-flex rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 underline underline-offset-2 hover:bg-red-200"
                              >
                                ภ.พ.20 ไม่ผ่านการตรวจ
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {user.phone ? (
                            <a
                              href={`tel:${user.phone.replace(/[^0-9+]/g, "")}`}
                              className="inline-flex items-center gap-1 text-sm whitespace-nowrap text-blue-600 hover:text-blue-700 hover:underline"
                              aria-label={`โทรหา ${user.full_name} ที่เบอร์ ${user.phone}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {user.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-primary">{user.plan_name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {getStatusBadge(user.status)}
                            {user.suspended && <span className="ml-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">ระงับใช้งาน</span>}
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
                        <td className="min-w-[260px] py-3 px-4 align-top">
                          <div className="text-sm leading-6">
                            <p>ใบเสนอราคา: {user.quotation_count}</p>
                            <p>ใบแจ้งหนี้: {user.billing_invoice_count}</p>
                            <p>ใบเสร็จ: {user.receipt_count}</p>
                            <p>ใบกำกับภาษี: {user.invoice_count}</p>
                            <p className="mt-1 font-medium">รวมทั้งหมด: {user.total_document_count}</p>
                            <div className="mt-2 border-t pt-2 text-sm leading-6">
                              <p className="font-medium text-blue-700">เดือน {selectedMonth}</p>
                              <p>เสนอราคา: {user.monthly_quotation_count}</p>
                              <p>แจ้งหนี้: {user.monthly_billing_invoice_count}</p>
                              <p>ใบเสร็จ: {user.monthly_receipt_count}</p>
                              <p>กำกับภาษี: {user.monthly_invoice_count}</p>
                              <p className="font-medium">ออกแล้วรวม: {user.monthly_issued_count}</p>
                              {user.document_limit === null ? (
                                <span className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">{user.monthly_quota_count}/ไม่จำกัด</span>
                              ) : (() => {
                                const percent = user.document_limit > 0 ? user.monthly_quota_count / user.document_limit : 0;
                                const style = percent >= 1 ? "bg-red-100 text-red-700" : percent >= 0.8 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
                                const label = percent >= 1 ? "เต็มแล้ว" : percent >= 0.8 ? "ใกล้เต็ม" : "ปกติ";
                                return <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 font-medium ${style}`}>{user.monthly_quota_count}/{user.document_limit} · {label}</span>;
                              })()}
                              <p className="font-medium text-emerald-700">มูลค่า: {user.monthly_total_amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleEditClick(user)} title="แก้ไขแพ็กเกจ"><Edit className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" disabled={actionUserId === user.id} onClick={() => handleSuspend(user)} title={user.suspended ? "เปิดใช้งาน" : "ระงับใช้งาน"}>
                              {user.suspended ? <UserCheck className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-orange-600" />}
                            </Button>
                            <Button variant="outline" size="sm" disabled={actionUserId === user.id} onClick={() => handleDelete(user)} title="ลบผู้ใช้"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                          </div>
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>เพิ่มผู้ใช้งาน</DialogTitle><DialogDescription>ระบบจะสร้างบริษัทและแพ็กเกจ FREE ให้อัตโนมัติ</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>อีเมล</Label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัว)</Label><Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
            <div className="space-y-2"><Label>ชื่อผู้ใช้งาน</Label><Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>ชื่อบริษัท</Label><Input value={newUser.company_name} onChange={(e) => setNewUser({ ...newUser, company_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>เบอร์โทรศัพท์</Label><Input type="tel" placeholder="08X-XXX-XXXX" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>ประเภทผู้ประกอบการ</Label><select value={newUser.entity_type} onChange={(e) => setNewUser({ ...newUser, entity_type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">เลือกประเภท</option><option value="individual">บุคคลธรรมดา</option><option value="juristic">นิติบุคคล</option><option value="partnership">ห้างหุ้นส่วน/คณะบุคคล</option></select></div>
            <div className="space-y-2"><Label>สถานะ VAT</Label><select value={newUser.vat_registered} onChange={(e) => setNewUser({ ...newUser, vat_registered: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">เลือกสถานะ</option><option value="yes">จด VAT แล้ว</option><option value="no">ยังไม่ได้จด VAT / ได้รับยกเว้น</option></select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateDialogOpen(false)}>ยกเลิก</Button><Button onClick={handleCreateUser} disabled={isCreating || !newUser.email || !newUser.full_name.trim() || !newUser.company_name.trim() || !newUser.entity_type || !newUser.vat_registered || !/^[0-9]{9,10}$/.test(newUser.phone.replace(/-/g, "")) || newUser.password.length < 8}>{isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}สร้างบัญชี</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Select value={editStatus} onValueChange={(value) => {
                setEditStatus(value);
                if (value === "active" && selectedUser?.status !== "active") {
                  setEditPeriodEnd(addCalendarMonths(new Date(), 1));
                  setPeriodEndTouched(false);
                }
              }}>
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
                    onChange={(e) => { setEditPeriodEnd(e.target.value); setPeriodEndTouched(true); }}
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
