"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2, AlertTriangle, XCircle, Copy, Stamp, PenTool } from "lucide-react";
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
import { pdf } from "@react-pdf/renderer";
import { ReceiptPDF } from "@/lib/pdf/ReceiptPDF";

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
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, fetchSettings } = useCompanyStore();
  const { getReceipt, cancelReceipt } = useReceiptStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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

  const handlePrint = async () => {
    if (!receipt || !settings) return;

    try {
      const blob = await pdf(
        <ReceiptPDF receipt={receipt} items={items} company={settings} showStamp={showStamp} showSignature={showSignature} />
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
    if (!receipt || !settings) return;

    try {
      const blob = await pdf(
        <ReceiptPDF receipt={receipt} items={items} company={settings} showStamp={showStamp} showSignature={showSignature} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${receipt.receipt_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้าง PDF ได้",
        variant: "destructive",
      });
    }
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
        // Refresh data
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateBE = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString("th-TH", { month: "long" });
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
        <Header title="ใบเสร็จรับเงิน" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div>
        <Header title="ใบเสร็จรับเงิน" />
        <div className="p-6">
          <p>ไม่พบข้อมูล</p>
        </div>
      </div>
    );
  }

  const isCancelled = receipt.status === "cancelled";
  const isDraft = receipt.status === "draft";

  return (
    <div>
      <Header title="ใบเสร็จรับเงิน" />

      <div className="p-6">
        {/* Top Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/receipts">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {/* Options */}
            <div className="flex items-center gap-4 mr-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Switch id="showStamp" checked={showStamp} onCheckedChange={setShowStamp} />
                <Label htmlFor="showStamp" className="flex items-center gap-1 cursor-pointer">
                  <Stamp className="h-3 w-3" />
                  ตราประทับ
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="showSignature" checked={showSignature} onCheckedChange={setShowSignature} />
                <Label htmlFor="showSignature" className="flex items-center gap-1 cursor-pointer">
                  <PenTool className="h-3 w-3" />
                  ลายเซ็น
                </Label>
              </div>
            </div>
            <Button variant="outline" onClick={handleDuplicate} className="gap-2">
              <Copy className="h-4 w-4" />
              คัดลอก
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              พิมพ์
            </Button>
            <Button onClick={handleDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              ดาวน์โหลด PDF
            </Button>
          </div>
        </div>

        {/* Cancelled Warning */}
        {isCancelled && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ใบเสร็จถูกยกเลิก</AlertTitle>
            <AlertDescription>
              ใบเสร็จนี้ถูกยกเลิกแล้ว ไม่สามารถใช้งานได้
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        <div ref={printRef} className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="flex justify-between mb-6">
            <div>
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-12 mb-2" />
              )}
              <h2 className="text-lg font-bold">{settings?.company_name || "บริษัท"}</h2>
              {settings?.company_name_en && (
                <p className="text-sm text-muted-foreground">{settings.company_name_en}</p>
              )}
              <p className="text-sm text-muted-foreground">{settings?.address}</p>
              <p className="text-sm text-muted-foreground">
                เลขประจำตัวผู้เสียภาษี: {settings?.tax_id || "-"} ({settings?.branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา ${settings?.branch_code}`})
              </p>
              <p className="text-sm text-muted-foreground">
                โทร: {settings?.phone || "-"} | อีเมล: {settings?.email || "-"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-red-500 font-bold">(ต้นฉบับ)</p>
              <h1 className="text-2xl font-bold text-primary">ใบเสร็จรับเงิน</h1>
              <p className="font-bold">{receipt.receipt_number}</p>
              <p className="text-sm text-muted-foreground">วันที่: {formatDateBE(receipt.issue_date)}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">ลูกค้า</h3>
            <p className="font-medium">{receipt.customer_name}</p>
            {receipt.customer_name_en && <p className="text-sm text-muted-foreground">{receipt.customer_name_en}</p>}
            <p className="text-sm">{receipt.customer_address}</p>
            {receipt.customer_tax_id && (
              <p className="text-sm">
                เลขประจำตัวผู้เสียภาษี: {receipt.customer_tax_id} ({receipt.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา ${receipt.customer_branch_code}`})
              </p>
            )}
            {receipt.customer_phone && <p className="text-sm">โทร: {receipt.customer_phone}</p>}
          </div>

          {/* Items Table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2">
                <th className="text-left py-2 w-12">ลำดับ</th>
                <th className="text-left py-2">รายการ</th>
                <th className="text-right py-2 w-20">จำนวน</th>
                <th className="text-center py-2 w-16">หน่วย</th>
                <th className="text-right py-2 w-24">ราคา/หน่วย</th>
                <th className="text-right py-2 w-24">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{formatCurrency(item.quantity)}</td>
                  <td className="py-2 text-center">{item.unit}</td>
                  <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-72">
              <div className="flex justify-between py-1">
                <span>รวมเงิน</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.discount_amount > 0 && (
                <div className="flex justify-between py-1 text-red-500">
                  <span>ส่วนลด</span>
                  <span>-{formatCurrency(receipt.discount_amount)}</span>
                </div>
              )}
              {receipt.vat_rate > 0 && (
                <>
                  <div className="flex justify-between py-1">
                    <span>มูลค่าก่อน VAT</span>
                    <span>{formatCurrency(receipt.amount_before_vat)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>VAT {receipt.vat_rate}%</span>
                    <span>{formatCurrency(receipt.vat_amount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2 border-t-2 font-bold text-lg bg-primary/10 px-2 rounded">
                <span>รวมทั้งสิ้น</span>
                <span>{formatCurrency(receipt.total_amount)} บาท</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ({numberToThaiText(receipt.total_amount)})
              </p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <p className="text-sm">
              <span className="font-medium">วิธีชำระเงิน:</span> {paymentMethodLabels[receipt.payment_method] || receipt.payment_method || "-"}
            </p>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="mb-6">
              <p className="font-medium">หมายเหตุ:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{receipt.notes}</p>
            </div>
          )}

          {/* Cancelled Watermark */}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-red-500 text-6xl font-bold opacity-20 rotate-[-30deg]">ยกเลิก</p>
            </div>
          )}
        </div>

        {/* Cancel Button */}
        {receipt.status === "issued" && (
          <div className="max-w-4xl mx-auto mt-6 flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setIsCancelDialogOpen(true)}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              ยกเลิกใบเสร็จ
            </Button>
          </div>
        )}

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
              <AlertDialogDescription>
                คุณต้องการยกเลิกใบเสร็จ &quot;{receipt.receipt_number}&quot; หรือไม่?
                การยกเลิกจะไม่สามารถย้อนกลับได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isCancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                ยืนยัน
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
