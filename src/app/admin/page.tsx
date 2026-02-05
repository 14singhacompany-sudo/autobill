"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalInvoices: number;
  totalQuotations: number;
  activeSubscriptions: number;
  trialUsers: number;
  expiringTrials: number;
}

interface RecentUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  company_name: string;
  plan_name: string;
  status: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalInvoices: 0,
    totalQuotations: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    expiringTrials: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      try {
        // Fetch total users
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch total invoices
        const { count: invoicesCount } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true });

        // Fetch total quotations
        const { count: quotationsCount } = await supabase
          .from("quotations")
          .select("*", { count: "exact", head: true });

        // Fetch subscriptions
        const { data: subscriptions } = await supabase
          .from("subscriptions")
          .select("status, trial_ends_at");

        const activeCount = subscriptions?.filter((s) => s.status === "active").length || 0;
        const trialCount = subscriptions?.filter((s) => s.status === "trial").length || 0;

        // Count trials expiring in 3 days
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const expiringCount =
          subscriptions?.filter((s) => {
            if (s.status !== "trial" || !s.trial_ends_at) return false;
            const trialEnds = new Date(s.trial_ends_at);
            return trialEnds > now && trialEnds < threeDaysFromNow;
          }).length || 0;

        setStats({
          totalUsers: usersCount || 0,
          totalInvoices: invoicesCount || 0,
          totalQuotations: quotationsCount || 0,
          activeSubscriptions: activeCount,
          trialUsers: trialCount,
          expiringTrials: expiringCount,
        });

        // Fetch recent users
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        if (profiles) {
          const usersWithDetails = await Promise.all(
            profiles.map(async (profile) => {
              // Get company
              const { data: company } = await supabase
                .from("companies")
                .select("id, name")
                .eq("user_id", profile.id)
                .single();

              // Get subscription
              const { data: subscription } = await supabase
                .from("subscriptions")
                .select("status, plan:plans(display_name)")
                .eq("company_id", (company as { id: string; name: string } | null)?.id || "")
                .single();

              return {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name || "-",
                created_at: profile.created_at,
                company_name: company?.name || "-",
                plan_name: (subscription?.plan as any)?.display_name || "FREE",
                status: subscription?.status || "unknown",
              };
            })
          );

          setRecentUsers(usersWithDetails);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">ภาพรวมระบบ Auto Bill</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ผู้ใช้ทั้งหมด</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ใบกำกับภาษีทั้งหมด</p>
              <p className="text-2xl font-bold">{stats.totalInvoices}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ใบเสนอราคาทั้งหมด</p>
              <p className="text-2xl font-bold">{stats.totalQuotations}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">กำลังทดลองใช้</p>
              <p className="text-2xl font-bold">{stats.trialUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trial ใกล้หมด (3 วัน)</p>
              <p className="text-2xl font-bold">{stats.expiringTrials}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            ผู้ใช้ล่าสุด
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
                    สมัครเมื่อ
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      ยังไม่มีผู้ใช้
                    </td>
                  </tr>
                ) : (
                  recentUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{user.company_name}</td>
                      <td className="py-3 px-4">{user.plan_name}</td>
                      <td className="py-3 px-4">{getStatusBadge(user.status)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
