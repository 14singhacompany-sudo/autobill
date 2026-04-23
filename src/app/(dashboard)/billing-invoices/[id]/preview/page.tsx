"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2, AlertTriangle, XCircle, Copy, Stamp, PenTool, Send, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useCompanyStore } from "@/stores/companyStore";
import { useBillingInvoiceStore } from "@/stores/billingInvoiceStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { numberToThaiText } from "@/lib/utils/numberToThaiText";

interface BillingInvoiceData {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_name_en: string | null;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes: string;
  payment_terms: string;
  status: string;
}

interface BillingInvoiceItem {
  id: string;
  item_order: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  amount: number;
  price_includes_vat: boolean;
}

export default function BillingInvoicePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, fetchSettings } = useCompanyStore();
  const { getBillingInvoice, cancelBillingInvoice, updateBillingInvoice, markAsPaid } = useBillingInvoiceStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [billingInvoice, setBillingInvoice] = useState<BillingInvoiceData | null>(null);
  const [items, setItems] = useState<BillingInvoiceItem[]>([]);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStamp, setShowStamp] = useState(true);
  const [showSignature, setShowSignature] = useState(true);

  const id = params.id as string;

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const result = await getBillingInvoice(id);
        if (result) {
          setBillingInvoice(result.billingInvoice as BillingInvoiceData);
          setItems(result.items as BillingInvoiceItem[]);
        } else {
          router.push("/billing-invoices");
        }
      } catch (error) {
        console.error("Error fetching billing invoice:", error);
        router.push("/billing-invoices");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchInvoiceData();
    }
  }, [id, router, getBillingInvoice]);

  // Format date สำหรับชื่อไฟล์ (YYYY-MM-DD)
  const formatDateForFilename = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  // Auto-scale content ให้พอดี A4
  const applyPrintScale = () => {
    const printArea = printRef.current;
    if (!printArea) return;

    const A4_CONTENT_HEIGHT = 900;
    const pageEl = printArea.querySelector(':scope > div') as HTMLElement;
    if (!pageEl) return;

    const signatureSection = pageEl.querySelector('.signature-section') as HTMLElement;
    const contentHeight = signatureSection
      ? pageEl.scrollHeight - signatureSection.offsetHeight
      : pageEl.scrollHeight;

    if (contentHeight > A4_CONTENT_HEIGHT) {
      const scale = A4_CONTENT_HEIGHT / contentHeight;
      pageEl.style.transform = `scale(${Math.max(scale, 0.7)})`;
      pageEl.style.transformOrigin = 'top left';
    }
  };

  const handlePrint = () => {
    if (!billingInvoice || !settings) return;
    const originalTitle = document.title;
    const customerName = billingInvoice.customer_name || "ลูกค้า";
    const issueDate = formatDateForFilename(billingInvoice.issue_date);
    document.title = `ใบแจ้งหนี้_${customerName}_${issueDate}`;

    applyPrintScale();
    window.print();

    setTimeout(() => {
      document.title = originalTitle;
      const printArea = printRef.current;
      if (printArea) {
        const pageEl = printArea.querySelector(':scope > div') as HTMLElement;
        if (pageEl) {
          pageEl.style.transform = '';
          pageEl.style.transformOrigin = '';
        }
      }
    }, 1000);
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelBillingInvoice(id);
      if (result.success) {
        toast({
          title: "ยกเลิกสำเร็จ",
          description: "ใบแจ้งหนี้ถูกยกเลิกแล้ว",
        });
        const updatedResult = await getBillingInvoice(id);
        if (updatedResult) {
          setBillingInvoice(updatedResult.billingInvoice as BillingInvoiceData);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.reason || "ไม่สามารถยกเลิกได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cancelling billing invoice:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกได้",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setIsCancelDialogOpen(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsSubmitting(true);
    try {
      const result = await markAsPaid(id);
      if (result.success) {
        toast({
          title: "บันทึกการชำระเงินสำเร็จ",
          description: "ใบแจ้งหนี้ถูกชำระแล้ว",
        });
        const updatedResult = await getBillingInvoice(id);
        if (updatedResult) {
          setBillingInvoice(updatedResult.billingInvoice as BillingInvoiceData);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.reason || "ไม่สามารถบันทึกได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsPaidDialogOpen(false);
    }
  };

  const handleDuplicate = () => {
    router.push(`/billing-invoices/new?duplicate=${id}`);
  };

  const handleIssue = async () => {
    if (!billingInvoice) return;
    setIsSubmitting(true);
    try {
      const formData = {
        customer_name: billingInvoice.customer_name || "",
        customer_name_en: billingInvoice.customer_name_en || "",
        customer_address: billingInvoice.customer_address || "",
        customer_tax_id: billingInvoice.customer_tax_id || "",
        customer_branch_code: billingInvoice.customer_branch_code || "",
        customer_contact: billingInvoice.customer_contact || "",
        customer_phone: billingInvoice.customer_phone || "",
        customer_email: billingInvoice.customer_email || "",
        issue_date: billingInvoice.issue_date || new Date().toISOString().split("T")[0],
        due_date: billingInvoice.due_date || new Date().toISOString().split("T")[0],
        subtotal: billingInvoice.subtotal || 0,
        discount_type: (billingInvoice.discount_type as "percent" | "fixed") || "percent",
        discount_value: billingInvoice.discount_value || 0,
        discount_amount: billingInvoice.discount_amount || 0,
        amount_before_vat: billingInvoice.amount_before_vat || 0,
        vat_rate: billingInvoice.vat_rate || 0,
        vat_amount: billingInvoice.vat_amount || 0,
        total_amount: billingInvoice.total_amount || 0,
        notes: billingInvoice.notes || "",
        payment_terms: billingInvoice.payment_terms || "ชำระภายใน 30 วัน",
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
          amount: item.amount,
          price_includes_vat: item.price_includes_vat,
        })),
      };

      const result = await updateBillingInvoice(id, formData, "issued");

      if (result) {
        toast({
          title: "ออกใบแจ้งหนี้สำเร็จ",
          description: `เลขที่: ${result.invoice_number}`,
        });
        const refreshed = await getBillingInvoice(id);
        if (refreshed) {
          setBillingInvoice(refreshed.billingInvoice as BillingInvoiceData);
          setItems(refreshed.items as BillingInvoiceItem[]);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถออกใบแจ้งหนี้ได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error issuing billing invoice:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกใบแจ้งหนี้ได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsConfirmDialogOpen(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div>
        <Header title="พรีวิวใบแจ้งหนี้" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!billingInvoice) {
    return (
      <div>
        <Header title="พรีวิวใบแจ้งหนี้" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">ไม่พบข้อมูลใบแจ้งหนี้</p>
          <Link href="/billing-invoices">
            <Button variant="outline" className="mt-4">
              กลับไปหน้ารายการ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = billingInvoice.status === "cancelled";
  const isDraft = billingInvoice.status === "draft";
  const isIssued = billingInvoice.status === "issued";
  const isPaid = billingInvoice.status === "paid";

  return (
    <div>
      <div className="print:hidden">
        <Header title="พรีวิวใบแจ้งหนี้" />
      </div>

      <div className="p-6 print:p-0">
        {/* Draft Warning */}
        {isDraft && (
          <Alert variant="destructive" className="mb-6 print:hidden">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ไม่สามารถพิมพ์เอกสารฉบับร่างได้</AlertTitle>
            <AlertDescription>
              ใบแจ้งหนี้นี้ยังอยู่ในสถานะ &quot;ฉบับร่าง&quot; กรุณาออกใบแจ้งหนี้ก่อนจึงจะสามารถพิมพ์หรือดาวน์โหลดได้
              <div className="mt-2">
                <Link
                  href={`/billing-invoices/${id}/edit`}
                  className="text-sm underline hover:no-underline"
                >
                  คลิกเพื่อแก้ไขและออกใบแจ้งหนี้
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Paid Notice */}
        {isPaid && (
          <Alert className="mb-6 print:hidden border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">ชำระเงินแล้ว</AlertTitle>
            <AlertDescription className="text-green-700">
              ใบแจ้งหนี้นี้ได้รับการชำระเงินแล้ว
            </AlertDescription>
          </Alert>
        )}

        {/* Cancelled Notice */}
        {isCancelled && (
          <Alert className="mb-6 print:hidden border-orange-500 bg-orange-50">
            <XCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">ใบแจ้งหนี้นี้ถูกยกเลิกแล้ว</AlertTitle>
            <AlertDescription className="text-orange-700">
              เอกสารนี้ถูกยกเลิกและไม่สามารถใช้งานได้ หากต้องการออกใบใหม่ กรุณาสร้างใบแจ้งหนี้ใหม่
              <div className="mt-2">
                <Link
                  href={`/billing-invoices/new?duplicate=${id}`}
                  className="text-sm underline hover:no-underline"
                >
                  คลิกเพื่อคัดลอกและสร้างใบแจ้งหนี้ใหม่
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href={isDraft ? `/billing-invoices/${id}/edit` : "/billing-invoices"}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {isDraft ? "กลับไปแก้ไข" : "กลับ"}
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            {/* Toggle Stamp & Signature */}
            <div className="flex items-center gap-4 border rounded-lg px-3 py-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-stamp"
                  checked={showStamp}
                  onCheckedChange={setShowStamp}
                />
                <Label htmlFor="show-stamp" className="flex items-center gap-1 text-sm cursor-pointer">
                  <Stamp className="h-4 w-4" />
                  ตราประทับ
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-signature"
                  checked={showSignature}
                  onCheckedChange={setShowSignature}
                />
                <Label htmlFor="show-signature" className="flex items-center gap-1 text-sm cursor-pointer">
                  <PenTool className="h-4 w-4" />
                  ลายเซ็น
                </Label>
              </div>
            </div>
            <div className="flex gap-2">
              {/* ปุ่มออกใบแจ้งหนี้ (สำหรับ draft) */}
              {isDraft && (
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsConfirmDialogOpen(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  ออกใบแจ้งหนี้
                </Button>
              )}
              {/* ปุ่มบันทึกชำระแล้ว (สำหรับใบที่ออกแล้ว) */}
              {isIssued && (
                <Button
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => setIsPaidDialogOpen(true)}
                  disabled={isSubmitting}
                >
                  <CheckCircle className="h-4 w-4" />
                  บันทึกชำระแล้ว
                </Button>
              )}
              {/* ปุ่มคัดลอกเพื่อสร้างใบใหม่ (สำหรับใบที่ยกเลิกแล้ว) */}
              {isCancelled && (
                <Link href={`/billing-invoices/new?duplicate=${id}`}>
                  <Button variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" />
                    คัดลอกสร้างใบใหม่
                  </Button>
                </Link>
              )}
              {/* ปุ่มยกเลิก (สำหรับใบที่ออกแล้วและยังไม่ยกเลิก) */}
              {isIssued && (
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => setIsCancelDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  ยกเลิกใบแจ้งหนี้
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={handlePrint}
                disabled={isDraft || isCancelled}
              >
                <Printer className="h-4 w-4" />
                พิมพ์
              </Button>
              <Button
                className="gap-2"
                onClick={handleDownloadPDF}
                disabled={isDraft || isCancelled}
              >
                <Download className="h-4 w-4" />
                ดาวน์โหลด PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Billing Invoice Preview */}
        <div id="print-area" ref={printRef} className="print:mx-0">
          <div className="bg-white border rounded-lg shadow-sm max-w-4xl mx-auto p-8 print:shadow-none print:border-none print:max-w-none relative overflow-hidden">
            {/* Draft Watermark */}
            {isDraft && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 draft-watermark">
                <span className="text-[120px] font-bold text-red-500/30 -rotate-45 select-none whitespace-nowrap">
                  ฉบับร่าง
                </span>
              </div>
            )}
            {/* Cancelled Watermark */}
            {isCancelled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 cancelled-watermark">
                <span className="text-[100px] font-bold text-red-500/40 -rotate-45 select-none whitespace-nowrap">
                  ยกเลิก
                </span>
              </div>
            )}
            {/* Paid Watermark */}
            {isPaid && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                <span className="text-[80px] font-bold text-green-500/30 -rotate-45 select-none whitespace-nowrap">
                  ชำระแล้ว
                </span>
              </div>
            )}
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-16 mb-2" />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mb-2">
                    <span className="text-gray-400 text-xs">LOGO</span>
                  </div>
                )}
                <h2 className="text-xl font-bold">{settings?.company_name || "ชื่อบริษัท"}</h2>
                {settings?.company_name_en && (
                  <p className="text-sm text-muted-foreground">{settings.company_name_en}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                  {settings?.address || "ที่อยู่บริษัท"}
                </p>
                <p className="text-sm text-muted-foreground">
                  เลขประจำตัวผู้เสียภาษี: {settings?.tax_id || "-"}
                  {settings?.branch_code && (
                    <span className="ml-1">
                      ({settings.branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${settings.branch_name || settings.branch_code}`})
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  โทร: {settings?.phone || "-"} | อีเมล: {settings?.email || "-"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600 mb-1">(ต้นฉบับ)</p>
                <h1 className="text-2xl font-bold text-primary mb-2">ใบแจ้งหนี้</h1>
                <p className="text-lg font-medium">{billingInvoice.invoice_number}</p>
                <div className="mt-4 text-sm">
                  <p>
                    <span className="text-muted-foreground">วันที่ออก:</span>{" "}
                    {formatDate(billingInvoice.issue_date)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">ครบกำหนด:</span>{" "}
                    {formatDate(billingInvoice.due_date)}
                  </p>
                  <p className="mt-1">
                    <span className="text-muted-foreground">เงื่อนไข:</span>{" "}
                    {billingInvoice.payment_terms || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">ลูกค้า</h3>
              <p className="font-medium">{billingInvoice.customer_name}</p>
              {billingInvoice.customer_name_en && (
                <p className="text-sm text-muted-foreground">{billingInvoice.customer_name_en}</p>
              )}
              {billingInvoice.customer_address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {billingInvoice.customer_address}
                </p>
              )}
              {billingInvoice.customer_tax_id && (
                <p className="text-sm text-muted-foreground">
                  เลขประจำตัวผู้เสียภาษี: {billingInvoice.customer_tax_id}
                  {billingInvoice.customer_branch_code && (
                    <span className="ml-2">
                      ({billingInvoice.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${billingInvoice.customer_branch_code}`})
                    </span>
                  )}
                </p>
              )}
              {billingInvoice.customer_phone && (
                <p className="text-sm text-muted-foreground">โทร: {billingInvoice.customer_phone}</p>
              )}
              {billingInvoice.customer_email && (
                <p className="text-sm text-muted-foreground">อีเมล: {billingInvoice.customer_email}</p>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold w-12">ลำดับ</th>
                  <th className="text-left py-3 px-2 font-semibold">รายการ</th>
                  <th className="text-right py-3 px-2 font-semibold w-24">จำนวน</th>
                  <th className="text-center py-3 px-2 font-semibold w-20">หน่วย</th>
                  <th className="text-right py-3 px-2 font-semibold w-32">ราคา/หน่วย</th>
                  <th className="text-right py-3 px-2 font-semibold w-32">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      ไม่มีรายการ
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-2">{index + 1}</td>
                      <td className="py-3 px-2">{item.description}</td>
                      <td className="py-3 px-2 text-right">{formatNumber(item.quantity)}</td>
                      <td className="py-3 px-2 text-center">{item.unit}</td>
                      <td className="py-3 px-2 text-right">{formatNumber(item.unit_price)}</td>
                      <td className="py-3 px-2 text-right">{formatNumber(item.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Summary */}
            <div className="flex justify-end mb-6">
              <div className="w-80">
                <div className="flex justify-between py-2 border-b">
                  <span>รวมเงิน</span>
                  <span>{formatNumber(billingInvoice.subtotal)}</span>
                </div>
                {billingInvoice.discount_amount > 0 && (
                  <div className="flex justify-between py-2 border-b text-red-600">
                    <span>
                      ส่วนลด{" "}
                      {billingInvoice.discount_type === "percent"
                        ? `(${billingInvoice.discount_value}%)`
                        : ""}
                    </span>
                    <span>-{formatNumber(billingInvoice.discount_amount)}</span>
                  </div>
                )}
                {billingInvoice.vat_rate > 0 && (
                  <>
                    <div className="flex justify-between py-2 border-b">
                      <span>มูลค่าก่อน VAT</span>
                      <span>{formatNumber(billingInvoice.amount_before_vat)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>VAT {billingInvoice.vat_rate}%</span>
                      <span>{formatNumber(billingInvoice.vat_amount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-3 font-bold text-lg bg-primary/10 px-3 -mx-3 rounded">
                  <span>รวมทั้งสิ้น</span>
                  <span>{formatNumber(billingInvoice.total_amount)} บาท</span>
                </div>
              </div>
            </div>

            {/* Thai Text */}
            <div className="flex items-center justify-between -mt-12 mb-6">
              <span className="text-base text-muted-foreground">
                ({numberToThaiText(billingInvoice.total_amount)})
              </span>
            </div>

            {/* Notes */}
            {billingInvoice.notes && (
              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-1">หมายเหตุ</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {billingInvoice.notes}
                </p>
              </div>
            )}

            {/* Bank Info */}
            {settings?.bank_name && (
              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-2">ข้อมูลการชำระเงิน</h4>
                <div className="text-sm">
                  <p>
                    ธนาคาร: {settings.bank_name} สาขา {settings.bank_branch}
                  </p>
                  <p>ชื่อบัญชี: {settings.account_name}</p>
                  <p>เลขที่บัญชี: {settings.account_number}</p>
                </div>
              </div>
            )}

            {/* Signature */}
            <div className="signature-section mt-8 pt-6 border-t">
              <div className="grid grid-cols-3 items-end">
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1 h-6 w-32 mx-auto"></div>
                  <p className="text-xs text-muted-foreground">ผู้รับสินค้า/บริการ</p>
                  <p className="text-xs text-muted-foreground">วันที่ ____/____/____</p>
                </div>
                <div className="flex items-end justify-center">
                  {showStamp && settings?.stamp_url ? (
                    <img src={settings.stamp_url} alt="Company Stamp" className="w-[180px] h-[180px] object-contain" />
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-6">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">ประทับตรา</p>
                        <p className="text-xs text-gray-400">(ถ้ามี)</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  {showSignature && settings?.signature_url && (
                    <img src={settings.signature_url} alt="Signature" className="h-10 mx-auto -mb-4 object-contain" />
                  )}
                  <div className="border-b border-gray-400 mb-2 h-8 w-36 mx-auto"></div>
                  {showSignature && settings?.signatory_name ? (
                    <>
                      <p className="text-xs font-medium">{settings.signatory_name}</p>
                      {settings?.signatory_position && (
                        <p className="text-xs text-muted-foreground">{settings.signatory_position}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">ผู้ออกใบแจ้งหนี้</p>
                      <p className="text-xs text-muted-foreground">วันที่ ____/____/____</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกใบแจ้งหนี้</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>คุณต้องการยกเลิกใบแจ้งหนี้เลขที่ <strong>{billingInvoice.invoice_number}</strong> ใช่หรือไม่?</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>เอกสารที่ยกเลิกจะไม่สามารถใช้งานได้</li>
                  <li>เอกสารจะถูกเก็บไว้เป็นหลักฐานและไม่สามารถลบได้</li>
                  <li>หากต้องการแก้ไข ให้สร้างใบแจ้งหนี้ใหม่โดยคัดลอกจากใบนี้</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังยกเลิก...
                </>
              ) : (
                "ยืนยัน ยกเลิกใบแจ้งหนี้"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Issue Confirmation Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการออกใบแจ้งหนี้</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>คุณต้องการออกใบแจ้งหนี้เลขที่ <strong>{billingInvoice?.invoice_number}</strong> ใช่หรือไม่?</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>เมื่อออกใบแจ้งหนี้แล้ว จะไม่สามารถแก้ไขข้อมูลได้</li>
                  <li>สามารถพิมพ์และดาวน์โหลด PDF ได้หลังจากออกใบแจ้งหนี้</li>
                  <li>หากต้องการยกเลิก สามารถทำได้หลังจากออกใบแจ้งหนี้แล้ว</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleIssue}
              disabled={isSubmitting}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังออกใบแจ้งหนี้...
                </>
              ) : (
                "ยืนยัน ออกใบแจ้งหนี้"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการบันทึกชำระเงิน</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>คุณต้องการบันทึกว่าใบแจ้งหนี้เลขที่ <strong>{billingInvoice?.invoice_number}</strong> ได้รับการชำระเงินแล้วใช่หรือไม่?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsPaid}
              disabled={isSubmitting}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "ยืนยัน ชำระแล้ว"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 190mm !important;
            height: auto;
            margin: 0;
            padding: 0;
          }
          #print-area > div {
            position: relative;
            page-break-inside: avoid;
            break-inside: avoid;
            padding: 8mm;
            padding-bottom: 60mm;
            box-sizing: border-box;
            margin: 0;
            width: 100%;
            max-width: 190mm;
            min-height: 277mm;
          }
          .signature-section {
            position: absolute !important;
            bottom: 8mm !important;
            left: 8mm !important;
            right: 8mm !important;
            margin-top: 0 !important;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            background: white;
          }
          .signature-section img {
            max-width: 120px !important;
            max-height: 120px !important;
          }
          .draft-watermark,
          .cancelled-watermark {
            display: flex !important;
            visibility: visible !important;
          }
          .draft-watermark span,
          .cancelled-watermark span {
            color: rgba(239, 68, 68, 0.3) !important;
            font-size: 80px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
