"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2, AlertTriangle, XCircle, Copy, Stamp, PenTool, Send } from "lucide-react";
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
import { useInvoiceStore } from "@/stores/invoiceStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { numberToThaiText } from "@/lib/utils/numberToThaiText";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import { ShareDialog } from "@/components/documents/ShareDialog";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

interface InvoiceData {
  id: string;
  invoice_number: string;
  // ข้อมูลบังคับตามกฎหมาย (มาตรา 86/4)
  customer_name: string;
  customer_name_en: string | null;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  issue_date: string;
  subtotal: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  // ข้อมูลเพิ่มเติม
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  due_date: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  notes: string;
  terms_conditions: string;
  sales_channel: string | null;
  status: string;
}

interface InvoiceItem {
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

export default function InvoicePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, fetchSettings } = useCompanyStore();
  const { getInvoice, cancelInvoice, updateInvoice } = useInvoiceStore();
  const { checkCanCreateInvoice } = useSubscriptionStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showStamp, setShowStamp] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const result = await getInvoice(id);
        if (result) {
          setInvoice(result.invoice as InvoiceData);
          setItems(result.items as InvoiceItem[]);
        } else {
          router.push("/invoices");
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
        router.push("/invoices");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchInvoiceData();
    }
  }, [id, router, getInvoice]);

  const handlePrint = async () => {
    if (!invoice || !settings) return;

    try {
      const blob = await pdf(
        <InvoicePDF invoice={invoice} items={items} company={settings} showStamp={showStamp} showSignature={showSignature} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error("Error generating PDF for print:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปิด PDF สำหรับพิมพ์ได้",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice || !settings) return;

    try {
      const blob = await pdf(
        <InvoicePDF invoice={invoice} items={items} company={settings} showStamp={showStamp} showSignature={showSignature} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดาวน์โหลด PDF ได้",
        variant: "destructive",
      });
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

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelInvoice(id);
      if (result.success) {
        toast({
          title: "ยกเลิกใบกำกับภาษีสำเร็จ",
          description: "ใบกำกับภาษีถูกยกเลิกแล้ว",
        });
        // Refresh the page data
        const refreshed = await getInvoice(id);
        if (refreshed) {
          setInvoice(refreshed.invoice as InvoiceData);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถยกเลิกใบกำกับภาษีได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกใบกำกับภาษีได้",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setIsCancelDialogOpen(false);
    }
  };

  // Handler สำหรับออกใบกำกับภาษี (เปลี่ยนสถานะจาก draft เป็น issued)
  const handleIssueInvoice = async () => {
    if (!invoice || !items.length) return;

    setIsSubmitting(true);
    try {
      // Check usage limit
      const canCreate = await checkCanCreateInvoice();
      if (!canCreate) {
        toast({
          title: "เกินจำนวนที่กำหนด",
          description: "คุณใช้จำนวนใบกำกับภาษีครบตามแพ็คเกจแล้ว กรุณาอัพเกรดเพื่อใช้งานต่อ",
          variant: "destructive",
        });
        router.push("/pricing");
        return;
      }

      // Prepare data for update
      const formData = {
        customer_name: invoice.customer_name,
        customer_name_en: invoice.customer_name_en || "",
        customer_address: invoice.customer_address,
        customer_tax_id: invoice.customer_tax_id,
        customer_branch_code: invoice.customer_branch_code,
        customer_contact: invoice.customer_contact,
        customer_phone: invoice.customer_phone,
        customer_email: invoice.customer_email,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        vat_rate: invoice.vat_rate,
        discount_type: invoice.discount_type as "fixed" | "percent",
        discount_value: invoice.discount_value,
        notes: invoice.notes,
        terms_conditions: invoice.terms_conditions,
        sales_channel: invoice.sales_channel || undefined,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          price_includes_vat: item.price_includes_vat,
        })),
      };

      const result = await updateInvoice(invoice.id, formData, "issued");
      if (result) {
        toast({
          title: "ออกใบกำกับภาษีสำเร็จ",
          description: `เลขที่: ${result.invoice_number}`,
        });
        // Refresh invoice data
        const refreshed = await getInvoice(id);
        if (refreshed) {
          setInvoice(refreshed.invoice as InvoiceData);
          setItems(refreshed.items as InvoiceItem[]);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถออกใบกำกับภาษีได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error issuing invoice:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกใบกำกับภาษีได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title="พรีวิวใบกำกับภาษี" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div>
        <Header title="พรีวิวใบกำกับภาษี" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">ไม่พบข้อมูลใบกำกับภาษี</p>
          <Link href="/invoices">
            <Button variant="outline" className="mt-4">
              กลับไปหน้ารายการ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check invoice status
  const isDraft = invoice.status === "draft";
  const isCancelled = invoice.status === "cancelled";
  const isIssued = invoice.status === "issued";

  return (
    <div>
      <Header title="พรีวิวใบกำกับภาษี" />

      <div className="p-6">
        {/* Draft Warning */}
        {isDraft && (
          <Alert variant="destructive" className="mb-6 print:hidden">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ไม่สามารถพิมพ์เอกสารฉบับร่างได้</AlertTitle>
            <AlertDescription>
              ใบกำกับภาษีนี้ยังอยู่ในสถานะ &quot;ฉบับร่าง&quot; กรุณาออกใบกำกับภาษีก่อนจึงจะสามารถพิมพ์หรือดาวน์โหลดได้
              <div className="mt-2">
                <Link
                  href={`/invoices/${id}/edit`}
                  className="text-sm underline hover:no-underline"
                >
                  คลิกเพื่อแก้ไขและออกใบกำกับภาษี
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cancelled Notice */}
        {isCancelled && (
          <Alert className="mb-6 print:hidden border-orange-500 bg-orange-50">
            <XCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">ใบกำกับภาษีนี้ถูกยกเลิกแล้ว</AlertTitle>
            <AlertDescription className="text-orange-700">
              เอกสารนี้ถูกยกเลิกและไม่สามารถใช้งานได้ หากต้องการออกใบใหม่ กรุณาสร้างใบกำกับภาษีใหม่
              <div className="mt-2">
                <Link
                  href={`/invoices/new?duplicate=${id}`}
                  className="text-sm underline hover:no-underline"
                >
                  คลิกเพื่อคัดลอกและสร้างใบกำกับภาษีใหม่
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href="/invoices">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับ
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
            {/* ปุ่มออกใบกำกับภาษี (สำหรับ draft) */}
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
                ออกใบกำกับภาษี
              </Button>
            )}
            {/* ปุ่มคัดลอกเพื่อสร้างใบใหม่ (สำหรับใบที่ยกเลิกแล้ว) */}
            {isCancelled && (
              <Link href={`/invoices/new?duplicate=${id}`}>
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
                ยกเลิกใบกำกับภาษี
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

        {/* Invoice Preview - 2 แผ่น (ต้นฉบับ + สำเนา) */}
        <div id="print-area" ref={printRef}>
          {/* ต้นฉบับ */}
          <div className="bg-white border rounded-lg shadow-sm max-w-4xl mx-auto p-8 print:shadow-none print:border-none relative overflow-hidden">
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
                <h1 className="text-2xl font-bold text-primary mb-2">ใบกำกับภาษี/ใบเสร็จรับเงิน</h1>
                <p className="text-lg font-medium">{invoice.invoice_number}</p>
                <div className="mt-4 text-sm">
                  <p>
                    <span className="text-muted-foreground">วันที่:</span>{" "}
                    {formatDate(invoice.issue_date)}
                  </p>
                  {invoice.sales_channel && (
                    <p className="mt-1">
                      <span className="text-muted-foreground">ช่องทาง:</span>{" "}
                      <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${
                        invoice.sales_channel.toLowerCase() === "shopee" ? "bg-orange-500" :
                        invoice.sales_channel.toLowerCase() === "lazada" ? "bg-purple-600" :
                        invoice.sales_channel.toLowerCase() === "facebook" ? "bg-blue-500" :
                        invoice.sales_channel.toLowerCase() === "tiktok" ? "bg-black" :
                        invoice.sales_channel.toLowerCase() === "line" ? "bg-green-500" : "bg-gray-400"
                      }`}>
                        {invoice.sales_channel.toLowerCase() === "shopee" ? "Shopee" :
                         invoice.sales_channel.toLowerCase() === "lazada" ? "Lazada" :
                         invoice.sales_channel.toLowerCase() === "facebook" ? "Facebook" :
                         invoice.sales_channel.toLowerCase() === "tiktok" ? "TikTok" :
                         invoice.sales_channel.toLowerCase() === "line" ? "Line" : invoice.sales_channel}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">ลูกค้า</h3>
              <p className="font-medium">{invoice.customer_name}</p>
              {invoice.customer_name_en && (
                <p className="text-sm text-muted-foreground">{invoice.customer_name_en}</p>
              )}
              {invoice.customer_address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {invoice.customer_address}
                </p>
              )}
              {invoice.customer_tax_id && (
                <p className="text-sm text-muted-foreground">
                  เลขประจำตัวผู้เสียภาษี: {invoice.customer_tax_id}
                  {invoice.customer_branch_code && (
                    <span className="ml-2">
                      ({invoice.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${invoice.customer_branch_code}`})
                    </span>
                  )}
                </p>
              )}
              {invoice.customer_phone && (
                <p className="text-sm text-muted-foreground">โทร: {invoice.customer_phone}</p>
              )}
              {invoice.customer_email && (
                <p className="text-sm text-muted-foreground">อีเมล: {invoice.customer_email}</p>
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
                  <span>{formatNumber(invoice.subtotal)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between py-2 border-b text-red-600">
                    <span>
                      ส่วนลด{" "}
                      {invoice.discount_type === "percent"
                        ? `(${invoice.discount_value}%)`
                        : ""}
                    </span>
                    <span>-{formatNumber(invoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span>มูลค่าก่อน VAT</span>
                  <span>{formatNumber(invoice.amount_before_vat)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>VAT {invoice.vat_rate}%</span>
                  <span>{formatNumber(invoice.vat_amount)}</span>
                </div>
                <div className="flex justify-between py-3 font-bold text-lg bg-primary/10 px-3 -mx-3 rounded">
                  <span>รวมทั้งสิ้น</span>
                  <span>{formatNumber(invoice.total_amount)} บาท</span>
                </div>
              </div>
            </div>

            {/* Thai Text - ชิดซ้ายสุด บรรทัดเดียวกับยอดรวม */}
            <div className="flex items-center justify-between -mt-12 mb-6">
              <span className="text-base text-muted-foreground">
                ({numberToThaiText(invoice.total_amount)})
              </span>
            </div>

            {/* Notes & Terms */}
            {(invoice.notes || invoice.terms_conditions) && (
              <div className="border-t pt-4 mt-6">
                {invoice.notes && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-1">หมายเหตุ</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {invoice.notes}
                    </p>
                  </div>
                )}
                {invoice.terms_conditions && (
                  <div>
                    <h4 className="font-semibold mb-1">เงื่อนไข</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {invoice.terms_conditions}
                    </p>
                  </div>
                )}
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
            <div className="mt-12 pt-8">
              {/* Signature boxes - 3 columns */}
              <div className="grid grid-cols-3 items-end">
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-2 h-8 w-36 mx-auto"></div>
                  <p className="text-sm text-muted-foreground">ผู้รับสินค้า/บริการ</p>
                  <p className="text-xs text-muted-foreground mt-1">วันที่ ____/____/____</p>
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
                      <p className="text-sm font-medium">{settings.signatory_name}</p>
                      {settings?.signatory_position && (
                        <p className="text-xs text-muted-foreground">{settings.signatory_position}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">ผู้มีอำนาจลงนาม</p>
                      <p className="text-xs text-muted-foreground mt-1">วันที่ ____/____/____</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* สำเนา */}
          <div className="bg-white border rounded-lg shadow-sm max-w-4xl mx-auto p-8 print:shadow-none print:border-none mt-8 print:mt-0 print:break-before-page relative overflow-hidden">
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
                <p className="text-sm font-semibold text-blue-600 mb-1">(สำเนา)</p>
                <h1 className="text-2xl font-bold text-primary mb-2">ใบกำกับภาษี/ใบเสร็จรับเงิน</h1>
                <p className="text-lg font-medium">{invoice.invoice_number}</p>
                <div className="mt-4 text-sm">
                  <p>
                    <span className="text-muted-foreground">วันที่:</span>{" "}
                    {formatDate(invoice.issue_date)}
                  </p>
                  {invoice.sales_channel && (
                    <p className="mt-1">
                      <span className="text-muted-foreground">ช่องทาง:</span>{" "}
                      <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${
                        invoice.sales_channel.toLowerCase() === "shopee" ? "bg-orange-500" :
                        invoice.sales_channel.toLowerCase() === "lazada" ? "bg-purple-600" :
                        invoice.sales_channel.toLowerCase() === "facebook" ? "bg-blue-500" :
                        invoice.sales_channel.toLowerCase() === "tiktok" ? "bg-black" :
                        invoice.sales_channel.toLowerCase() === "line" ? "bg-green-500" : "bg-gray-400"
                      }`}>
                        {invoice.sales_channel.toLowerCase() === "shopee" ? "Shopee" :
                         invoice.sales_channel.toLowerCase() === "lazada" ? "Lazada" :
                         invoice.sales_channel.toLowerCase() === "facebook" ? "Facebook" :
                         invoice.sales_channel.toLowerCase() === "tiktok" ? "TikTok" :
                         invoice.sales_channel.toLowerCase() === "line" ? "Line" : invoice.sales_channel}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">ลูกค้า</h3>
              <p className="font-medium">{invoice.customer_name}</p>
              {invoice.customer_name_en && (
                <p className="text-sm text-muted-foreground">{invoice.customer_name_en}</p>
              )}
              {invoice.customer_address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {invoice.customer_address}
                </p>
              )}
              {invoice.customer_tax_id && (
                <p className="text-sm text-muted-foreground">
                  เลขประจำตัวผู้เสียภาษี: {invoice.customer_tax_id}
                  {invoice.customer_branch_code && (
                    <span className="ml-2">
                      ({invoice.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${invoice.customer_branch_code}`})
                    </span>
                  )}
                </p>
              )}
              {invoice.customer_phone && (
                <p className="text-sm text-muted-foreground">โทร: {invoice.customer_phone}</p>
              )}
              {invoice.customer_email && (
                <p className="text-sm text-muted-foreground">อีเมล: {invoice.customer_email}</p>
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
                  <span>{formatNumber(invoice.subtotal)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between py-2 border-b text-red-600">
                    <span>
                      ส่วนลด{" "}
                      {invoice.discount_type === "percent"
                        ? `(${invoice.discount_value}%)`
                        : ""}
                    </span>
                    <span>-{formatNumber(invoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span>มูลค่าก่อน VAT</span>
                  <span>{formatNumber(invoice.amount_before_vat)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>VAT {invoice.vat_rate}%</span>
                  <span>{formatNumber(invoice.vat_amount)}</span>
                </div>
                <div className="flex justify-between py-3 font-bold text-lg bg-primary/10 px-3 -mx-3 rounded">
                  <span>รวมทั้งสิ้น</span>
                  <span>{formatNumber(invoice.total_amount)} บาท</span>
                </div>
              </div>
            </div>

            {/* Thai Text - ชิดซ้ายสุด บรรทัดเดียวกับยอดรวม */}
            <div className="flex items-center justify-between -mt-12 mb-6">
              <span className="text-base text-muted-foreground">
                ({numberToThaiText(invoice.total_amount)})
              </span>
            </div>

            {/* Notes & Terms */}
            {(invoice.notes || invoice.terms_conditions) && (
              <div className="border-t pt-4 mt-6">
                {invoice.notes && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-1">หมายเหตุ</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {invoice.notes}
                    </p>
                  </div>
                )}
                {invoice.terms_conditions && (
                  <div>
                    <h4 className="font-semibold mb-1">เงื่อนไข</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {invoice.terms_conditions}
                    </p>
                  </div>
                )}
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
            <div className="mt-12 pt-8">
              {/* Signature boxes - 3 columns */}
              <div className="grid grid-cols-3 items-end">
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-2 h-8 w-36 mx-auto"></div>
                  <p className="text-sm text-muted-foreground">ผู้รับสินค้า/บริการ</p>
                  <p className="text-xs text-muted-foreground mt-1">วันที่ ____/____/____</p>
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
                      <p className="text-sm font-medium">{settings.signatory_name}</p>
                      {settings?.signatory_position && (
                        <p className="text-xs text-muted-foreground">{settings.signatory_position}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">ผู้มีอำนาจลงนาม</p>
                      <p className="text-xs text-muted-foreground mt-1">วันที่ ____/____/____</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Issue Invoice Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการออกใบกำกับภาษี</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>เมื่อออกใบกำกับภาษีแล้ว:</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li className="text-destructive font-medium">ไม่สามารถลบเอกสารได้</li>
                  <li>สามารถยกเลิกเอกสารได้เท่านั้น (เพื่อเก็บประวัติ)</li>
                  <li>เลขที่เอกสารจะถูกบันทึกถาวร</li>
                </ul>
                <p className="pt-2">คุณต้องการดำเนินการต่อหรือไม่?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsConfirmDialogOpen(false);
                handleIssueInvoice();
              }}
            >
              ยืนยัน ออกใบกำกับภาษี
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกใบกำกับภาษี</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>คุณต้องการยกเลิกใบกำกับภาษีเลขที่ <strong>{invoice.invoice_number}</strong> ใช่หรือไม่?</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>เอกสารที่ยกเลิกจะไม่สามารถใช้งานได้</li>
                  <li>เอกสารจะถูกเก็บไว้เป็นหลักฐานและไม่สามารถลบได้</li>
                  <li>หากต้องการแก้ไข ให้สร้างใบกำกับภาษีใหม่โดยคัดลอกจากใบนี้</li>
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
                "ยืนยัน ยกเลิกใบกำกับภาษี"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        documentType="invoice"
        documentId={invoice.id}
        documentNumber={invoice.invoice_number}
        documentStatus={invoice.status}
        customerEmail={invoice.customer_email || ""}
        documentData={invoice}
        documentItems={items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          amount: item.amount,
        }))}
        companyData={settings ? {
          company_name: settings.company_name || "",
          company_name_en: settings.company_name_en || "",
          address: settings.address || "",
          phone: settings.phone || "",
          email: settings.email || "",
          tax_id: settings.tax_id || "",
          branch_code: settings.branch_code || "",
          branch_name: settings.branch_name || "",
          bank_name: settings.bank_name || "",
          bank_branch: settings.bank_branch || "",
          account_name: settings.account_name || "",
          account_number: settings.account_number || "",
        } : undefined}
      />

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:break-before-page {
            break-before: page;
          }
          .draft-watermark,
          .cancelled-watermark {
            display: flex !important;
            visibility: visible !important;
          }
          .draft-watermark span,
          .cancelled-watermark span {
            color: rgba(239, 68, 68, 0.3) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
