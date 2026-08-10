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
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { th } from "date-fns/locale";
import { useNotificationStore, type Alert } from "@/stores/notificationStore";
import { useCompanyStore } from "@/stores/companyStore";

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

interface SalesChannelData {
  channel: string;
  label: string;
  color: string;
  bgColor: string;
  amount: number;
  count: number;
}

interface ProjectProgress {
  quotationId: string;
  quotationNumber: string;
  projectName: string;
  customerName: string;
  totalInstallments: number;
  invoicedInstallments: number;
  paidInstallments: number;
  completedPaymentDocuments: number;
  pendingPaymentDocumentBillingId?: string;
  paidAmount: number;
  totalAmount: number;
}

const salesChannelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  shopee: { label: "Shopee", color: "bg-orange-500", bgColor: "bg-orange-50" },
  lazada: { label: "Lazada", color: "bg-purple-600", bgColor: "bg-purple-50" },
  facebook: { label: "Facebook", color: "bg-blue-500", bgColor: "bg-blue-50" },
  tiktok: { label: "TikTok", color: "bg-black", bgColor: "bg-gray-100" },
  line: { label: "Line", color: "bg-green-500", bgColor: "bg-green-50" },
  other: { label: "อื่นๆ", color: "bg-gray-400", bgColor: "bg-gray-50" },
};

const getLocalMonthString = (date: Date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getLocalDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
  const [salesByChannel, setSalesByChannel] = useState<SalesChannelData[]>([]);
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthString());
  const { alerts, fetchAlerts } = useNotificationStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings } = useCompanyStore();

  useEffect(() => {
    fetchDashboardData();
    fetchAlerts();
    fetchCompanySettings();
  }, [fetchAlerts, fetchCompanySettings, selectedMonth]);

  const fetchDashboardData = async () => {
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: currentCompany } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!currentCompany) return;
      const companyId = currentCompany.id;

      // Get current month start/end
      const [selectedYear, selectedMonthNumber] = selectedMonth.split("-").map(Number);
      const thisMonthStart = new Date(selectedYear, selectedMonthNumber - 1, 1);
      const thisMonthEnd = new Date(selectedYear, selectedMonthNumber, 0);
      const nextMonthStart = new Date(selectedYear, selectedMonthNumber, 1);
      const lastMonthStart = new Date(selectedYear, selectedMonthNumber - 2, 1);
      const lastMonthEnd = new Date(selectedYear, selectedMonthNumber - 1, 0);

      // Fetch quotations this month (exclude draft status)
      const { data: quotationsThisMonth } = await supabase
        .from("quotations")
        .select("id")
        .eq("company_id", companyId)
        .neq("status", "draft")
        .gte("issue_date", getLocalDateString(thisMonthStart))
        .lte("issue_date", getLocalDateString(thisMonthEnd));

      // Fetch quotations last month (exclude draft status)
      const { data: quotationsLastMonth } = await supabase
        .from("quotations")
        .select("id")
        .eq("company_id", companyId)
        .neq("status", "draft")
        .gte("issue_date", getLocalDateString(lastMonthStart))
        .lte("issue_date", getLocalDateString(lastMonthEnd));

      // Fetch invoices this month (exclude draft status)
      const { data: invoicesThisMonth } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .eq("company_id", companyId)
        .neq("status", "draft")
        .gte("issue_date", getLocalDateString(thisMonthStart))
        .lte("issue_date", getLocalDateString(thisMonthEnd));

      // Fetch invoices last month (exclude draft status)
      const { data: invoicesLastMonth } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .eq("company_id", companyId)
        .neq("status", "draft")
        .gte("issue_date", getLocalDateString(lastMonthStart))
        .lte("issue_date", getLocalDateString(lastMonthEnd));

      // Cash received: paid billing invoices + receipts issued directly.
      // Receipts created from a paid billing invoice are excluded here to avoid counting the same payment twice.
      const [{ data: paidBillingThisMonth }, { data: paidBillingLastMonth }, { data: directReceiptsThisMonth }, { data: directReceiptsLastMonth }, { data: directTaxReceiptsThisMonth }, { data: directTaxReceiptsLastMonth }] = await Promise.all([
        supabase.from("billing_invoices").select("total_amount").eq("company_id", companyId).eq("status", "paid").gte("paid_at", thisMonthStart.toISOString()).lt("paid_at", nextMonthStart.toISOString()),
        supabase.from("billing_invoices").select("total_amount").eq("company_id", companyId).eq("status", "paid").gte("paid_at", lastMonthStart.toISOString()).lte("paid_at", new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), lastMonthEnd.getDate(), 23, 59, 59).toISOString()),
        supabase.from("receipts").select("total_amount").eq("company_id", companyId).eq("status", "issued").is("source_billing_invoice_id", null).gte("issue_date", getLocalDateString(thisMonthStart)).lte("issue_date", getLocalDateString(thisMonthEnd)),
        supabase.from("receipts").select("total_amount").eq("company_id", companyId).eq("status", "issued").is("source_billing_invoice_id", null).gte("issue_date", getLocalDateString(lastMonthStart)).lte("issue_date", getLocalDateString(lastMonthEnd)),
        supabase.from("invoices").select("total_amount").eq("company_id", companyId).eq("status", "issued").is("source_billing_invoice_id", null).gte("issue_date", getLocalDateString(thisMonthStart)).lte("issue_date", getLocalDateString(thisMonthEnd)),
        supabase.from("invoices").select("total_amount").eq("company_id", companyId).eq("status", "issued").is("source_billing_invoice_id", null).gte("issue_date", getLocalDateString(lastMonthStart)).lte("issue_date", getLocalDateString(lastMonthEnd)),
      ]);

      // Fetch total customers
      const { count: totalCustomers } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      // Queries are explicitly scoped because older projects may still have permissive RLS policies.

      // Tax invoice totals remain available for the sales-channel report below.
      const revenueStatuses = ["issued", "sent", "partial", "paid"];
      const revenueThisMonth = [...(paidBillingThisMonth || []), ...(directReceiptsThisMonth || []), ...(directTaxReceiptsThisMonth || [])]
        .reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

      const revenueLastMonth = [...(paidBillingLastMonth || []), ...(directReceiptsLastMonth || []), ...(directTaxReceiptsLastMonth || [])]
        .reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

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
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentQuotations(recentQuots || []);

      // Fetch recent invoices
      const { data: recentInvs } = await supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, total_amount, status, due_date, issue_date")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentInvoices(recentInvs || []);

      const { data: projectQuotations } = await supabase
        .from("quotations")
        .select("id, quotation_number, project_name, customer_name, total_amount, payment_installments, status")
        .eq("company_id", companyId)
        .not("status", "in", '("cancelled","rejected","expired")')
        .order("created_at", { ascending: false })
        .limit(20);

      const projectRows = (projectQuotations || []).filter((quotation) => Array.isArray(quotation.payment_installments) && quotation.payment_installments.length > 0);
      if (projectRows.length > 0) {
        const projectIds = projectRows.map((quotation) => quotation.id);
        const { data: billingRows } = await supabase
          .from("billing_invoices")
          .select("id, source_quotation_id, source_installment_index, status, total_amount")
          .eq("company_id", companyId)
          .in("source_quotation_id", projectIds)
          .neq("status", "cancelled");

        const paidBillingIds = (billingRows || []).filter((billing) => billing.status === "paid").map((billing) => billing.id);
        let completedBillingIds = new Set<string>();
        if (paidBillingIds.length > 0) {
          const [{ data: receiptRows }, { data: taxInvoiceRows }] = await Promise.all([
            supabase.from("receipts").select("source_billing_invoice_id").eq("company_id", companyId).in("source_billing_invoice_id", paidBillingIds).eq("status", "issued"),
            supabase.from("invoices").select("source_billing_invoice_id").eq("company_id", companyId).in("source_billing_invoice_id", paidBillingIds).eq("status", "issued"),
          ]);
          completedBillingIds = new Set([...(receiptRows || []), ...(taxInvoiceRows || [])].map((row) => row.source_billing_invoice_id).filter(Boolean) as string[]);
        }

        setProjectProgress(projectRows.slice(0, 5).map((quotation) => {
          const related = (billingRows || []).filter((billing) => billing.source_quotation_id === quotation.id);
          const paid = related.filter((billing) => billing.status === "paid");
          return {
            quotationId: quotation.id,
            quotationNumber: quotation.quotation_number,
            projectName: quotation.project_name || quotation.quotation_number,
            customerName: quotation.customer_name || "ลูกค้า",
            totalInstallments: quotation.payment_installments.length,
            invoicedInstallments: related.length,
            paidInstallments: paid.length,
            completedPaymentDocuments: paid.filter((billing) => completedBillingIds.has(billing.id)).length,
            pendingPaymentDocumentBillingId: paid.find((billing) => !completedBillingIds.has(billing.id))?.id,
            paidAmount: paid.reduce((sum, billing) => sum + Number(billing.total_amount || 0), 0),
            totalAmount: Number(quotation.total_amount || 0),
          };
        }));
      } else {
        setProjectProgress([]);
      }

      // Fetch sales by channel this month
      const { data: invoicesByChannel } = await supabase
        .from("invoices")
        .select("sales_channel, total_amount, status")
        .eq("company_id", companyId)
        .in("status", revenueStatuses)
        .gte("issue_date", getLocalDateString(thisMonthStart))
        .lte("issue_date", getLocalDateString(thisMonthEnd));

      // Group by channel
      const channelMap = new Map<string, { amount: number; count: number }>();
      invoicesByChannel?.forEach((inv) => {
        const channel = (inv.sales_channel || "other").toLowerCase();
        const existing = channelMap.get(channel) || { amount: 0, count: 0 };
        channelMap.set(channel, {
          amount: existing.amount + (inv.total_amount || 0),
          count: existing.count + 1,
        });
      });

      // Convert to array with config
      const channelData: SalesChannelData[] = [];
      channelMap.forEach((data, channel) => {
        const config = salesChannelConfig[channel] || salesChannelConfig.other;
        channelData.push({
          channel,
          label: config.label,
          color: config.color,
          bgColor: config.bgColor,
          amount: data.amount,
          count: data.count,
        });
      });

      // Sort by amount descending
      channelData.sort((a, b) => b.amount - a.amount);
      setSalesByChannel(channelData);
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

  const selectedMonthLabel = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" })
    .format(new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)) - 1, 1));

  const moveMonth = (amount: number) => {
    const date = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)) - 1 + amount, 1);
    const next = getLocalMonthString(date);
    if (next <= getLocalMonthString()) setSelectedMonth(next);
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
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><div><p className="font-medium">ข้อมูลประจำเดือน</p><p className="text-sm text-muted-foreground">{selectedMonthLabel}</p></div></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => moveMonth(-1)} aria-label="เดือนก่อนหน้า"><ChevronLeft className="h-4 w-4" /></Button>
              <input type="month" value={selectedMonth} max={getLocalMonthString()} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="เลือกเดือน" />
              <Button variant="outline" size="icon" onClick={() => moveMonth(1)} disabled={selectedMonth >= getLocalMonthString()} aria-label="เดือนถัดไป"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex items-center gap-4">
          <Link href="/quotations/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างใบเสนอราคา
            </Button>
          </Link>
          {companySettings?.vat_registered === true && companySettings.vat_verification_status === "verified" && (
            <Link href="/invoices/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                สร้างใบกำกับภาษี
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title={`ใบเสนอราคา ${selectedMonthLabel}`}
            value={stats.quotationsThisMonth.toString()}
            change={calculateChange(stats.quotationsThisMonth, stats.quotationsLastMonth)}
            icon={<FileText className="h-5 w-5" />}
            trend={stats.quotationsThisMonth >= stats.quotationsLastMonth ? "up" : "down"}
            href="/quotations"
          />
          <StatsCard
            title={`ใบกำกับภาษี ${selectedMonthLabel}`}
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
            title={`ยอดรับเงิน ${selectedMonthLabel}`}
            value={formatCurrency(stats.revenueThisMonth)}
            change={calculateChange(stats.revenueThisMonth, stats.revenueLastMonth)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={stats.revenueThisMonth >= stats.revenueLastMonth ? "up" : "down"}
          />
        </div>

        {/* Sales by Channel */}
        {salesByChannel.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">ยอดขายตามช่องทาง · {selectedMonthLabel}</CardTitle>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="gap-1">
                  ดูทั้งหมด
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {salesByChannel.map((channel) => (
                  <Link
                    key={channel.channel}
                    href={`/invoices?channel=${channel.channel}`}
                    className="block"
                  >
                    <div className={`p-4 rounded-lg ${channel.bgColor} hover:shadow-md transition-all cursor-pointer`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${channel.color}`}>
                          {channel.label}
                        </span>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(channel.amount)}</p>
                      <p className="text-sm text-muted-foreground">{channel.count} รายการ</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                  {companySettings?.vat_registered === true && companySettings.vat_verification_status === "verified" && (
                    <Link href="/invoices/new">
                      <Button variant="link" className="mt-2">
                        สร้างใบกำกับภาษีแรก
                      </Button>
                    </Link>
                  )}
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

        {projectProgress.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ความคืบหน้าการเก็บเงินตามงวด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectProgress.map((project) => {
                const percent = project.totalInstallments > 0 ? project.paidInstallments / project.totalInstallments * 100 : 0;
                return (
                  <Link key={project.quotationId} href={project.pendingPaymentDocumentBillingId ? `/billing-invoices/${project.pendingPaymentDocumentBillingId}/preview` : `/quotations/${project.quotationId}/preview`} className="block rounded-lg border p-4 hover:bg-muted/40">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="font-medium">{project.projectName}</p><p className="text-sm text-muted-foreground">{project.customerName} · {project.quotationNumber}</p></div>
                      <div className="text-left sm:text-right"><p className="font-medium text-green-700">รับแล้ว {formatCurrency(project.paidAmount)}</p><p className="text-sm text-muted-foreground">ชำระ {project.paidInstallments}/{project.totalInstallments} งวด · ออกใบแจ้งหนี้แล้ว {project.invoicedInstallments} งวด</p>{project.paidInstallments > project.completedPaymentDocuments && <p className="text-sm font-medium text-amber-600">รอออกเอกสารหลังรับเงิน {project.paidInstallments - project.completedPaymentDocuments} งวด</p>}</div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-green-500" style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">มูลค่าโครงการ {formatCurrency(project.totalAmount)}</p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg">วิธีใช้การแบ่งงวดงาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm md:grid-cols-4">
              <div><strong>1. สร้างใบเสนอราคา</strong><p className="mt-1 text-muted-foreground">กรอกชื่อโครงการ สถานที่ และเพิ่มงวดให้รวม 100%</p></div>
              <div><strong>2. ส่งให้ลูกค้า</strong><p className="mt-1 text-muted-foreground">ตารางงวดจะแสดงในพรีวิว เอกสารพิมพ์ และ PDF</p></div>
              <div><strong>3. รอการแจ้งเตือน</strong><p className="mt-1 text-muted-foreground">Dashboard จะแจ้งเมื่องวดใกล้ถึงกำหนดหรือเลยกำหนด</p></div>
              <div><strong>4. ออกใบแจ้งหนี้</strong><p className="mt-1 text-muted-foreground">กดจากการแจ้งเตือน ระบบจะเตรียมยอดและข้อมูลลูกค้าให้ตรวจสอบ</p></div>
            </div>
          </CardContent>
        </Card>

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
                      alert.href || (alert.type === "invoice_overdue"
                        ? `/invoices/${alert.documentId}/edit`
                        : `/quotations/${alert.documentId}/edit`)
                    }
                    actionLabel={alert.type === "installment_due" ? "ออกใบแจ้งหนี้" : "ดู"}
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
  actionLabel = "ดู",
}: {
  type: "quotation" | "invoice";
  title: string;
  date: string;
  urgent?: boolean;
  href: string;
  actionLabel?: string;
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
          {actionLabel}
        </Button>
      </div>
    </Link>
  );
}
