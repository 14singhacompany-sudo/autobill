"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  Brain,
  Zap,
  AlertCircle,
  TrendingUp,
  Users,
  Building2,
  Clock,
  RefreshCw,
} from "lucide-react";

interface AIUsageStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  limitExceededCalls: number;
  uniqueUsers: number;
  uniqueCompanies: number;
}

interface AILogEntry {
  id: string;
  company_id: string;
  user_id: string;
  api_type: string;
  status: string;
  total_tokens: number;
  created_at: string;
  metadata: Record<string, unknown>;
  company_name?: string;
  user_email?: string;
}

interface UserAIUsage {
  user_id: string;
  user_email: string;
  company_name: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  plan_name: string;
  ai_limit: number | null;
  current_month_usage: number;
}

export default function AIUsagePage() {
  const [stats, setStats] = useState<AIUsageStats>({
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    limitExceededCalls: 0,
    uniqueUsers: 0,
    uniqueCompanies: 0,
  });
  const [recentLogs, setRecentLogs] = useState<AILogEntry[]>([]);
  const [userUsage, setUserUsage] = useState<UserAIUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");

  const fetchData = async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      // Fetch AI API logs
      const { data: logs, error: logsError } = await supabase
        .from("ai_api_logs")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (logsError) {
        console.error("Error fetching AI logs:", logsError);
        // Table might not exist yet
        setStats({
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          limitExceededCalls: 0,
          uniqueUsers: 0,
          uniqueCompanies: 0,
        });
        setRecentLogs([]);
        setUserUsage([]);
        setIsLoading(false);
        return;
      }

      // Calculate stats
      const totalCalls = logs?.length || 0;
      const successfulCalls = logs?.filter((l) => l.status === "success").length || 0;
      const failedCalls = logs?.filter((l) => l.status === "error").length || 0;
      const limitExceededCalls = logs?.filter((l) => l.status === "limit_exceeded").length || 0;
      const uniqueUsers = new Set(logs?.map((l) => l.user_id).filter(Boolean)).size;
      const uniqueCompanies = new Set(logs?.map((l) => l.company_id)).size;

      setStats({
        totalCalls,
        successfulCalls,
        failedCalls,
        limitExceededCalls,
        uniqueUsers,
        uniqueCompanies,
      });

      // Get recent logs with user/company info
      const recentLogsSlice = logs?.slice(0, 20) || [];
      const logsWithDetails = await Promise.all(
        recentLogsSlice.map(async (log) => {
          // Get company name
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", log.company_id)
            .single();

          // Get user email
          let userEmail = "-";
          if (log.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", log.user_id)
              .single();
            userEmail = profile?.email || "-";
          }

          return {
            ...log,
            company_name: company?.name || "-",
            user_email: userEmail,
          };
        })
      );

      setRecentLogs(logsWithDetails);

      // Calculate per-user usage
      const userUsageMap = new Map<string, UserAIUsage>();

      for (const log of logs || []) {
        const userId = log.user_id || log.company_id;
        if (!userUsageMap.has(userId)) {
          userUsageMap.set(userId, {
            user_id: log.user_id || "",
            user_email: "",
            company_name: "",
            total_calls: 0,
            successful_calls: 0,
            failed_calls: 0,
            plan_name: "",
            ai_limit: null,
            current_month_usage: 0,
          });
        }

        const usage = userUsageMap.get(userId)!;
        usage.total_calls++;
        if (log.status === "success") usage.successful_calls++;
        if (log.status === "error" || log.status === "limit_exceeded") usage.failed_calls++;
      }

      // Get user details for top users
      const topUsers = Array.from(userUsageMap.values())
        .sort((a, b) => b.total_calls - a.total_calls)
        .slice(0, 10);

      const usersWithDetails = await Promise.all(
        topUsers.map(async (usage) => {
          if (!usage.user_id) return usage;

          // Get profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", usage.user_id)
            .single();

          // Get company
          const { data: company } = await supabase
            .from("companies")
            .select("id, name")
            .eq("user_id", usage.user_id)
            .single();

          // Get subscription
          if (company) {
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("plan:plans(display_name, ai_extraction_limit)")
              .eq("company_id", company.id)
              .single();

            // Get current month usage
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const { data: usageLog } = await supabase
              .from("usage_logs")
              .select("ai_extraction_count")
              .eq("company_id", company.id)
              .eq("month_year", currentMonth)
              .single();

            return {
              ...usage,
              user_email: profile?.email || "-",
              company_name: company.name,
              plan_name: (subscription?.plan as any)?.display_name || "FREE",
              ai_limit: (subscription?.plan as any)?.ai_extraction_limit || null,
              current_month_usage: usageLog?.ai_extraction_count || 0,
            };
          }

          return {
            ...usage,
            user_email: profile?.email || "-",
          };
        })
      );

      setUserUsage(usersWithDetails);
    } catch (error) {
      console.error("Error fetching AI usage data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      success: "bg-green-100 text-green-700",
      error: "bg-red-100 text-red-700",
      limit_exceeded: "bg-orange-100 text-orange-700",
    };

    const labels: Record<string, string> = {
      success: "Success",
      error: "Error",
      limit_exceeded: "Limit Exceeded",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getApiTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      extract_customer: "Extract Customer (Image)",
      extract_customer_text: "Extract Customer (Text)",
      extract_items: "Extract Items (Text)",
      extract_image: "Extract Items (Image)",
    };
    return labels[type] || type;
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
          <h1 className="text-2xl font-bold">AI API Usage</h1>
          <p className="text-muted-foreground">ติดตามการใช้งาน AI Extraction API</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">วันนี้</SelectItem>
              <SelectItem value="week">7 วันที่ผ่านมา</SelectItem>
              <SelectItem value="month">เดือนนี้</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">API Calls ทั้งหมด</p>
              <p className="text-2xl font-bold">{stats.totalCalls}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">สำเร็จ</p>
              <p className="text-2xl font-bold text-green-600">{stats.successfulCalls}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed / Limit Exceeded</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.failedCalls} / {stats.limitExceededCalls}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ผู้ใช้ที่ใช้งาน</p>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Building2 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">บริษัทที่ใช้งาน</p>
              <p className="text-2xl font-bold">{stats.uniqueCompanies}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.totalCalls > 0
                  ? Math.round((stats.successfulCalls / stats.totalCalls) * 100)
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            การใช้งานต่อผู้ใช้ (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ผู้ใช้</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">บริษัท</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">แพ็คเกจ</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">ใช้ไป / Limit</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Calls (ช่วงนี้)</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Success</th>
                </tr>
              </thead>
              <tbody>
                {userUsage.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      ยังไม่มีการใช้งาน AI API
                    </td>
                  </tr>
                ) : (
                  userUsage.map((user) => (
                    <tr key={user.user_id || user.company_name} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <p className="text-sm">{user.user_email}</p>
                      </td>
                      <td className="py-3 px-4">{user.company_name || "-"}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                          {user.plan_name || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={
                            user.ai_limit && user.current_month_usage >= user.ai_limit
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {user.current_month_usage} / {user.ai_limit || "Unlimited"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{user.total_calls}</td>
                      <td className="py-3 px-4 text-center text-green-600">{user.successful_calls}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            API Calls ล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">เวลา</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ผู้ใช้</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">บริษัท</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">API Type</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Processing Time</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      ยังไม่มี API calls
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm">{log.user_email}</td>
                      <td className="py-3 px-4 text-sm">{log.company_name}</td>
                      <td className="py-3 px-4 text-sm">{getApiTypeLabel(log.api_type)}</td>
                      <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {(log.metadata as any)?.processingTime
                          ? `${(log.metadata as any).processingTime}ms`
                          : "-"}
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
