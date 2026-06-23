"use client";

import { useState, useEffect } from "react";
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
import { useReceiptStore } from "@/stores/receiptStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { numberToThaiText } from "@/lib/utils/numberToThaiText";

interface ReceiptData {
  id: string;
  receipt_number: string;
  customer_name: string;
  customer_name_en: string | null;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes: string;
  terms_conditions?: string | null;
  payment_method: string;
  sales_channel: string | null;
  status: string;
}

interface ReceiptItem {
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

export default function ReceiptPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const { settings, fetchSettings } = useCompanyStore();
  const { getReceipt, cancelReceipt, updateReceipt } = useReceiptStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStamp, setShowStamp] = useState(true);
  const [showSignature, setShowSignature] = useState(true);

  const id = params.id as string;

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        const result = await getReceipt(id);
        if (result) {
          setReceipt(result.receipt as ReceiptData);
          setItems(result.items as ReceiptItem[]);
        } else {
          router.push("/receipts");
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
        router.push("/receipts");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchReceiptData();
    }
  }, [id, router, getReceipt]);

  // Format date สำหรับชื่อไฟล์ (YYYY-MM-DD)
  const formatDateForFilename = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  const handlePrint = () => {
    if (!receipt || !settings) return;
    const originalTitle = document.title;
    const customerName = receipt.customer_name || "ลูกค้า";
    const issueDate = formatDateForFilename(receipt.issue_date);
    document.title = `ใบเสร็จรับเงิน_${customerName}_${issueDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const handleDownloadPDF = () => {
    if (!receipt || !settings) return;
    const originalTitle = document.title;
    const customerName = receipt.customer_name || "ลูกค้า";
    const issueDate = formatDateForFilename(receipt.issue_date);
    document.title = `ใบเสร็จรับเงิน_${customerName}_${issueDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelReceipt(id);
      if (result.success) {
        toast({
          title: "ยกเลิกสำเร็จ",
          description: "ใบเสร็จถูกยกเลิกแล้ว",
        });
        const updatedResult = await getReceipt(id);
        if (updatedResult) {
          setReceipt(updatedResult.receipt as ReceiptData);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.reason || "ไม่สามารถยกเลิกได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cancelling receipt:", error);
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

  const handleDuplicate = () => {
    router.push(`/receipts/new?duplicate=${id}`);
  };

  const handleIssue = async () => {
    if (!receipt) return;
    setIsSubmitting(true);
    try {
      // Prepare form data from existing receipt
      const formData = {
        customer_name: receipt.customer_name || "",
        customer_name_en: receipt.customer_name_en || "",
        customer_address: receipt.customer_address || "",
        customer_tax_id: receipt.customer_tax_id || "",
        customer_branch_code: receipt.customer_branch_code || "",
        customer_contact: receipt.customer_contact || "",
        customer_phone: receipt.customer_phone || "",
        customer_email: receipt.customer_email || "",
        issue_date: receipt.issue_date || new Date().toISOString().split("T")[0],
        subtotal: receipt.subtotal || 0,
        discount_type: (receipt.discount_type as "percent" | "fixed") || "percent",
        discount_value: receipt.discount_value || 0,
        discount_amount: receipt.discount_amount || 0,
        amount_before_vat: receipt.amount_before_vat || 0,
        vat_rate: receipt.vat_rate || 0,
        vat_amount: receipt.vat_amount || 0,
        total_amount: receipt.total_amount || 0,
        notes: receipt.notes || "",
        payment_method: receipt.payment_method || "cash",
        sales_channel: receipt.sales_channel || "",
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

      const result = await updateReceipt(id, formData, "issued");

      if (result) {
        toast({
          title: "ออกใบเสร็จสำเร็จ",
          description: `เลขที่: ${result.receipt_number}`,
        });
        // Refresh receipt data
        const refreshed = await getReceipt(id);
        if (refreshed) {
          setReceipt(refreshed.receipt as ReceiptData);
          setItems(refreshed.items as ReceiptItem[]);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถออกใบเสร็จได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error issuing receipt:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกใบเสร็จได้",
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

  const paymentMethodLabels: Record<string, string> = {
    cash: "เงินสด",
    transfer: "โอนเงิน",
    credit_card: "บัตรเครดิต",
    qr_code: "QR Code",
    check: "เช็ค",
    other: "อื่นๆ",
  };

  if (isLoading) {
    return (
      <div>
        <Header title="พรีวิวใบเสร็จรับเงิน" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div>
        <Header title="พรีวิวใบเสร็จรับเงิน" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">ไม่พบข้อมูลใบเสร็จรับเงิน</p>
          <Link href="/receipts">
            <Button variant="outline" className="mt-4">
              กลับไปหน้ารายการ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = receipt.status === "cancelled";
  const isDraft = receipt.status === "draft";
  const isIssued = receipt.status === "issued";

  return (
    <div>
      <div className="print:hidden">
        <Header title="พรีวิวใบเสร็จรับเงิน" />
      </div>

      <div className="p-6 print:p-0">
        {/* Draft Warning */}
        {isDraft && (
          <Alert variant="destructive" className="mb-6 print:hidden">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ไม่สามารถพิมพ์เอกสารฉบับร่างได้</AlertTitle>
            <AlertDescription>
              ใบเสร็จนี้ยังอยู่ในสถานะ &quot;ฉบับร่าง&quot; กรุณาออกใบเสร็จก่อนจึงจะสามารถพิมพ์หรือดาวน์โหลดได้
              <div className="mt-2">
                <Link
                  href={`/receipts/${id}/edit`}
                  className="text-sm underline hover:no-underline"
                >
                  คลิกเพื่อแก้ไขและออกใบเสร็จ
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cancelled Notice */}
        {isCancelled && (
          <Alert className="mb-6 print:hidden border-orange-500 bg-orange-50">
            <XCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">ใบเสร็จนี้ถูกยกเลิกแล้ว</AlertTitle>
            <AlertDescription className="text-orange-700">
              เอกสารนี้ถูกยกเลิกและไม่สามารถใช้งานได้ หากต้องการออกใบใหม่ กรุณาสร้างใบเสร็จใหม่
              <div className="mt-2">
                <Link
                  href={`/receipts/new?duplicate=${id}`}
                  className="text-sm underline hover:no-underline"
                >
                  คลิกเพื่อคัดลอกและสร้างใบเสร็จใหม่
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href={isDraft ? `/receipts/${id}/edit` : "/receipts"}>
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
              {/* ปุ่มออกใบเสร็จ (สำหรับ draft) */}
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
                  ออกใบเสร็จ
                </Button>
              )}
              {/* ปุ่มคัดลอกเพื่อสร้างใบใหม่ (สำหรับใบที่ยกเลิกแล้ว) */}
              {isCancelled && (
                <Link href={`/receipts/new?duplicate=${id}`}>
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
                  ยกเลิกใบเสร็จ
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

        {/* Receipt Preview */}
        <div id="print-area" className="print:mx-0">
          <div className="document-page bg-white border rounded-lg shadow-sm max-w-4xl mx-auto p-8 print:shadow-none print:border-none print:max-w-none relative overflow-hidden">
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
            {/* Content Wrapper */}
            <div className="document-content">
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
                <h1 className="text-2xl font-bold text-primary mb-2">ใบเสร็จรับเงิน</h1>
                <p className="text-lg font-medium">{receipt.receipt_number}</p>
                <div className="mt-4 text-sm">
                  <p>
                    <span className="text-muted-foreground">วันที่:</span>{" "}
                    {formatDate(receipt.issue_date)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">ชำระโดย:</span>{" "}
                    {paymentMethodLabels[receipt.payment_method] || receipt.payment_method || "-"}
                  </p>
                  {receipt.sales_channel && (
                    <p className="mt-1">
                      <span className="text-muted-foreground">ช่องทาง:</span>{" "}
                      <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${
                        receipt.sales_channel.toLowerCase() === "shopee" ? "bg-orange-500" :
                        receipt.sales_channel.toLowerCase() === "lazada" ? "bg-purple-600" :
                        receipt.sales_channel.toLowerCase() === "facebook" ? "bg-blue-500" :
                        receipt.sales_channel.toLowerCase() === "tiktok" ? "bg-black" :
                        receipt.sales_channel.toLowerCase() === "line" ? "bg-green-500" : "bg-gray-400"
                      }`}>
                        {receipt.sales_channel.toLowerCase() === "shopee" ? "Shopee" :
                         receipt.sales_channel.toLowerCase() === "lazada" ? "Lazada" :
                         receipt.sales_channel.toLowerCase() === "facebook" ? "Facebook" :
                         receipt.sales_channel.toLowerCase() === "tiktok" ? "TikTok" :
                         receipt.sales_channel.toLowerCase() === "line" ? "Line" : receipt.sales_channel}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">ลูกค้า</h3>
              <p className="font-medium">{receipt.customer_name}</p>
              {receipt.customer_name_en && (
                <p className="text-sm text-muted-foreground">{receipt.customer_name_en}</p>
              )}
              {receipt.customer_address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {receipt.customer_address}
                </p>
              )}
              {receipt.customer_tax_id && (
                <p className="text-sm text-muted-foreground">
                  เลขประจำตัวผู้เสียภาษี: {receipt.customer_tax_id}
                  {receipt.customer_branch_code && (
                    <span className="ml-2">
                      ({receipt.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${receipt.customer_branch_code}`})
                    </span>
                  )}
                </p>
              )}
              {receipt.customer_phone && (
                <p className="text-sm text-muted-foreground">โทร: {receipt.customer_phone}</p>
              )}
              {receipt.customer_email && (
                <p className="text-sm text-muted-foreground">อีเมล: {receipt.customer_email}</p>
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
                  <span>{formatNumber(receipt.subtotal)}</span>
                </div>
                {receipt.discount_amount > 0 && (
                  <div className="flex justify-between py-2 border-b text-red-600">
                    <span>
                      ส่วนลด{" "}
                      {receipt.discount_type === "percent"
                        ? `(${receipt.discount_value}%)`
                        : ""}
                    </span>
                    <span>-{formatNumber(receipt.discount_amount)}</span>
                  </div>
                )}
                {receipt.vat_rate > 0 && (
                  <>
                    <div className="flex justify-between py-2 border-b">
                      <span>มูลค่าก่อน VAT</span>
                      <span>{formatNumber(receipt.amount_before_vat)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>VAT {receipt.vat_rate}%</span>
                      <span>{formatNumber(receipt.vat_amount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-3 font-bold text-lg bg-primary/10 px-3 -mx-3 rounded">
                  <span>รวมทั้งสิ้น</span>
                  <span>{formatNumber(receipt.total_amount)} บาท</span>
                </div>
              </div>
            </div>

            {/* Thai Text */}
            <div className="flex items-center justify-between -mt-12 mb-6">
              <span className="text-base text-muted-foreground">
                ({numberToThaiText(receipt.total_amount)})
              </span>
            </div>

            {/* Notes */}
            {receipt.notes && (
              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-1">หมายเหตุ</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {receipt.notes}
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
            </div>{/* End Content Wrapper */}

            {/* Signature */}
            <div className="signature-section mt-8 pt-6 border-t">
              {/* Signature boxes - 3 columns */}
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
                      <p className="text-xs text-muted-foreground">ผู้รับเงิน</p>
                      <p className="text-xs text-muted-foreground">วันที่ ____/____/____</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>{/* End document-page */}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกใบเสร็จ</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>คุณต้องการยกเลิกใบเสร็จเลขที่ <strong>{receipt.receipt_number}</strong> ใช่หรือไม่?</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>เอกสารที่ยกเลิกจะไม่สามารถใช้งานได้</li>
                  <li>เอกสารจะถูกเก็บไว้เป็นหลักฐานและไม่สามารถลบได้</li>
                  <li>หากต้องการแก้ไข ให้สร้างใบเสร็จใหม่โดยคัดลอกจากใบนี้</li>
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
                "ยืนยัน ยกเลิกใบเสร็จ"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Issue Confirmation Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการออกใบเสร็จ</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>คุณต้องการออกใบเสร็จเลขที่ <strong>{receipt?.receipt_number}</strong> ใช่หรือไม่?</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>เมื่อออกใบเสร็จแล้ว จะไม่สามารถแก้ไขข้อมูลได้</li>
                  <li>สามารถพิมพ์และดาวน์โหลด PDF ได้หลังจากออกใบเสร็จ</li>
                  <li>หากต้องการยกเลิก สามารถทำได้หลังจากออกใบเสร็จแล้ว</li>
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
                  กำลังออกใบเสร็จ...
                </>
              ) : (
                "ยืนยัน ออกใบเสร็จ"
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
            width: 100%;
          }
          /* แต่ละหน้า - ใช้ flex เพื่อให้ signature อยู่ล่างสุด */
          .document-page {
            page-break-after: always;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            height: 277mm !important;
            min-height: 277mm !important;
            max-height: 277mm !important;
            padding: 5mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .document-page:last-child {
            page-break-after: auto;
          }
          /* Content wrapper - ยืดให้เต็มพื้นที่ */
          .document-content {
            flex: 1 !important;
            overflow: hidden !important;
          }
          /* ลดขนาด margins */
          .document-content .mb-8 {
            margin-bottom: 8px !important;
          }
          .document-content .mb-6 {
            margin-bottom: 6px !important;
          }
          .document-content .mt-6 {
            margin-top: 6px !important;
          }
          .document-content .p-4 {
            padding: 6px !important;
          }
          .document-content .pt-4 {
            padding-top: 4px !important;
          }
          /* ลดขนาด table rows */
          .document-content table .py-3 {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
          }
          .document-content table .py-8 {
            padding-top: 8px !important;
            padding-bottom: 8px !important;
          }
          /* Header logo */
          .document-content .h-16 {
            height: 48px !important;
          }
          /* Signature - อยู่ล่างสุดเสมอ */
          .signature-section {
            flex-shrink: 0 !important;
            margin-top: auto !important;
            padding-top: 6px !important;
            border-top: 1px solid #e5e7eb !important;
          }
          /* ลดขนาด stamp */
          .signature-section .w-\\[180px\\] {
            width: 80px !important;
          }
          .signature-section .h-\\[180px\\] {
            height: 80px !important;
          }
          /* ลดขนาด signature placeholder */
          .signature-section .w-20 {
            width: 50px !important;
          }
          .signature-section .h-20 {
            height: 50px !important;
          }
          .signature-section .mb-6 {
            margin-bottom: 4px !important;
          }
          /* ลดขนาด signature line */
          .signature-section .h-6 {
            height: 12px !important;
          }
          .signature-section .h-8 {
            height: 16px !important;
          }
          .signature-section .h-10 {
            height: 24px !important;
          }
          .signature-section .w-32 {
            width: 70px !important;
          }
          .signature-section .w-36 {
            width: 80px !important;
          }
          .signature-section .text-xs {
            font-size: 9px !important;
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
