"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsageIndicator } from "@/components/subscription/UsageIndicator";
import {
  FileText,
  Receipt,
  Users,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { th } from "date-fns/locale";
import { useNotificationStore, type Alert } from "@/stores/notificationStore";

interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  valid_until: string | null;
  issue_date: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  due_date: string | null;
  issue_date: string;
}

interface DashboardStats {
  quotationsThisMonth: number;
  quotationsLastMonth: number;
  invoicesThisMonth: number;
  invoicesLastMonth: number;
  totalCustomers: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    quotationsThisMonth: 0,
    quotationsLastMonth: 0,
    invoicesThisMonth: 0,
    invoicesLastMonth: 0,
    totalCustomers: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
  });
  const [recentQuotations, setRecentQuotations] = useState<Quotation[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { alerts, fetchAlerts } = useNotificationStore();

  useEffect(() => {
    fetchDashboardData();
    fetchAlerts();
  }, [fetchAlerts]);

  const fetchDashboardData = async () => {
    const supabase = createClient();

    try {
      // Get current month start/end
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch quotations this month (exclude draft status)
      const { data: quotationsThisMonth } = await supabase
        .from("quotations")
        .select("id")
        .neq("status", "draft")
        .gte("issue_date", thisMonthStart.toISOString().split("T")[0]);

      // Fetch quotations last month (exclude draft status)
      const { data: quotationsLastMonth } = await supabase
        .from("quotations")
        .select("id")
        .neq("status", "draft")
        .gte("issue_date", lastMonthStart.toISOString().split("T")[0])
        .lte("issue_date", lastMonthEnd.toISOString().split("T")[0]);

      // Fetch invoices this month (exclude draft status)
      const { data: invoicesThisMonth } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .neq("status", "draft")
        .gte("issue_date", thisMonthStart.toISOString().split("T")[0]);

      // Fetch invoices last month (exclude draft status)
      const { data: invoicesLastMonth } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .neq("status", "draft")
        .gte("issue_date", lastMonthStart.toISOString().split("T")[0])
        .lte("issue_date", lastMonthEnd.toISOString().split("T")[0]);

      // Fetch total customers
      const { count: totalCustomers } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true });

      // Calculate revenue - count all issued invoices (not draft/cancelled)
      // Statuses that count as revenue: issued, sent, partial, paid
      const revenueStatuses = ["issued", "sent", "partial", "paid"];
      const revenueThisMonth = invoicesThisMonth
        ?.filter((inv) => revenueStatuses.includes(inv.status))
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      const revenueLastMonth = invoicesLastMonth
        ?.filter((inv: { status?: string }) => revenueStatuses.includes(inv.status || ""))
        .reduce((sum: number, inv: { total_amount?: number }) => sum + (inv.total_amount || 0), 0) || 0;

      setStats({
        quotationsThisMonth: quotationsThisMonth?.length || 0,
        quotationsLastMonth: quotationsLastMonth?.length || 0,
        invoicesThisMonth: invoicesThisMonth?.length || 0,
        invoicesLastMonth: invoicesLastMonth?.length || 0,
        totalCustomers: totalCustomers || 0,
        revenueThisMonth,
        revenueLastMonth,
      });

      // Fetch recent quotations
      const { data: recentQuots } = await supabase
        .from("quotations")
        .select("id, quotation_number, customer_name, total_amount, status, valid_until, issue_date")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentQuotations(recentQuots || []);

      // Fetch recent invoices
      const { data: recentInvs } = await supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, total_amount, status, due_date, issue_date")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentInvoices(recentInvs || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`;
  };

  const getQuotationStatus = (status: string) => {
    const statusMap: Record<string, { label: string; color: "green" | "yellow" | "red" | "gray" | "blue" }> = {
      draft: { label: "ร่าง", color: "gray" },
      pending: { label: "รออนุมัติ", color: "yellow" },
      approved: { label: "อนุมัติแล้ว", color: "green" },
      rejected: { label: "ไม่อนุมัติ", color: "red" },
      expired: { label: "หมดอายุ", color: "red" },
      converted: { label: "แปลงเป็นใบกำกับภาษีแล้ว", color: "blue" },
    };
    return statusMap[status] || { label: status, color: "gray" };
  };

  const getInvoiceStatus = (status: string) => {
    const statusMap: Record<string, { label: string; color: "green" | "yellow" | "red" | "gray" | "blue" }> = {
      draft: { label: "ร่าง", color: "gray" },
      issued: { label: "ออกแล้ว", color: "blue" },
      sent: { label: "ส่งแล้ว", color: "blue" },
      partial: { label: "ชำระบางส่วน", color: "yellow" },
      paid: { label: "ชำระแล้ว", color: "green" },
      overdue: { label: "เลยกำหนด", color: "red" },
      cancelled: { label: "ยกเลิก", color: "gray" },
    };
    return statusMap[status] || { label: status, color: "gray" };
  };

  return (
    <div>
      <Header title="แดชบอร์ด" />

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex items-center gap-4">
          <Link href="/quotations/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างใบเสนอราคา
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างใบกำกับภาษี
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="ใบเสนอราคาเดือนนี้"
            value={stats.quotationsThisMonth.toString()}
            change={calculateChange(stats.quotationsThisMonth, stats.quotationsLastMonth)}
            icon={<FileText className="h-5 w-5" />}
            trend={stats.quotationsThisMonth >= stats.quotationsLastMonth ? "up" : "down"}
            href="/quotations"
          />
          <StatsCard
            title="ใบกำกับภาษีเดือนนี้"
            value={stats.invoicesThisMonth.toString()}
            change={calculateChange(stats.invoicesThisMonth, stats.invoicesLastMonth)}
            icon={<Receipt className="h-5 w-5" />}
            trend={stats.invoicesThisMonth >= stats.invoicesLastMonth ? "up" : "down"}
            href="/invoices"
          />
          <StatsCard
            title="ลูกค้าทั้งหมด"
            value={stats.totalCustomers.toString()}
            change=""
            icon={<Users className="h-5 w-5" />}
            trend="up"
            href="/customers"
          />
          <StatsCard
            title="รายได้เดือนนี้"
            value={formatCurrency(stats.revenueThisMonth)}
            change={calculateChange(stats.revenueThisMonth, stats.revenueLastMonth)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={stats.revenueThisMonth >= stats.revenueLastMonth ? "up" : "down"}
          />
        </div>

        {/* Recent Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Quotations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">ใบเสนอราคาล่าสุด</CardTitle>
              <Link href="/quotations">
                <Button variant="ghost" size="sm" className="gap-1">
                  ดูทั้งหมด
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentQuotations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>ยังไม่มีใบเสนอราคา</p>
                  <Link href="/quotations/new">
                    <Button variant="link" className="mt-2">
                      สร้างใบเสนอราคาแรก
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentQuotations.map((q) => {
                    const statusInfo = getQuotationStatus(q.status);
                    return (
                      <DocumentRow
                        key={q.id}
                        id={q.id}
                        number={q.quotation_number}
                        customer={q.customer_name}
                        amount={formatCurrency(q.total_amount)}
                        status={statusInfo.label}
                        statusColor={statusInfo.color}
                        href={`/quotations/${q.id}/edit`}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">ใบกำกับภาษีล่าสุด</CardTitle>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="gap-1">
                  ดูทั้งหมด
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>ยังไม่มีใบกำกับภาษี</p>
                  <Link href="/invoices/new">
                    <Button variant="link" className="mt-2">
                      สร้างใบกำกับภาษีแรก
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentInvoices.map((inv) => {
                    const statusInfo = getInvoiceStatus(inv.status);
                    return (
                      <DocumentRow
                        key={inv.id}
                        id={inv.id}
                        number={inv.invoice_number}
                        customer={inv.customer_name}
                        amount={formatCurrency(inv.total_amount)}
                        status={statusInfo.label}
                        statusColor={statusInfo.color}
                        href={`/invoices/${inv.id}/edit`}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscription Usage */}
        <div className="lg:col-span-2">
          <UsageIndicator />
        </div>

        {/* Alerts / Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              รายการที่ต้องติดตาม
              {alerts.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>ไม่มีรายการที่ต้องติดตาม</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <TaskItem
                    key={alert.id}
                    type={alert.type === "invoice_overdue" ? "invoice" : "quotation"}
                    title={alert.message}
                    date={format(new Date(alert.date), "d MMM yyyy", { locale: th })}
                    urgent={alert.type === "invoice_overdue" || (alert.daysRemaining !== undefined && alert.daysRemaining <= 3)}
                    href={
                      alert.type === "invoice_overdue"
                        ? `/invoices/${alert.documentId}/edit`
                        : `/quotations/${alert.documentId}/edit`
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  change,
  icon,
  trend,
  href,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: "up" | "down";
  href?: string;
}) {
  const content = (
    <Card className={href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change && (
              <p
                className={`text-sm mt-1 ${
                  trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {change} จากเดือนที่แล้ว
              </p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function DocumentRow({
  id,
  number,
  customer,
  amount,
  status,
  statusColor,
  href,
}: {
  id: string;
  number: string;
  customer: string;
  amount: string;
  status: string;
  statusColor: "green" | "yellow" | "red" | "gray" | "blue";
  href: string;
}) {
  const colors = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <Link href={href} className="block">
      <div className="flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
        <div>
          <p className="font-medium">{number}</p>
          <p className="text-sm text-muted-foreground">{customer}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{amount}</p>
          <span
            className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors[statusColor]}`}
          >
            {status}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TaskItem({
  type,
  title,
  date,
  urgent,
  href,
}: {
  type: "quotation" | "invoice";
  title: string;
  date: string;
  urgent?: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted ${
        urgent ? "bg-red-50 border border-red-200" : "bg-muted/50"
      }`}>
        <div
          className={`p-2 rounded-lg ${
            urgent
              ? "bg-red-100 text-red-700"
              : type === "quotation"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {urgent ? (
            <AlertTriangle className="h-4 w-4" />
          ) : type === "quotation" ? (
            <FileText className="h-4 w-4" />
          ) : (
            <Receipt className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1">
          <p className={`font-medium ${urgent ? "text-red-700" : ""}`}>{title}</p>
          <p className="text-sm text-muted-foreground">{date}</p>
        </div>
        <Button variant="outline" size="sm">
          ดู
        </Button>
      </div>
    </Link>
  );
}
