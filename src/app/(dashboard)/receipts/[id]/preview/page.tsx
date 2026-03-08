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

  const handlePrint = () => {
    if (!receipt || !settings) return;
    window.print();
  };

  const handleDownloadPDF = () => {
    // ใช้ browser print แล้วเลือก "Save as PDF" จะได้ผลลัพธ์เหมือนหน้า preview
    window.print();
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
      <div className="print:hidden">
        <Header title="ใบเสร็จรับเงิน" />
      </div>

      <div className="p-6 print:p-0">
        {/* Top Actions - ซ่อนตอนพิมพ์ */}
        <div className="flex items-center justify-between mb-6 print:hidden">
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
            <Button
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
              disabled={isDraft}
              title={isDraft ? "ต้องออกใบเสร็จก่อนจึงจะพิมพ์ได้" : ""}
            >
              <Printer className="h-4 w-4" />
              พิมพ์
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="gap-2"
              disabled={isDraft}
              title={isDraft ? "ต้องออกใบเสร็จก่อนจึงจะดาวน์โหลดได้" : ""}
            >
              <Download className="h-4 w-4" />
              ดาวน์โหลด PDF
            </Button>
          </div>
        </div>

        {/* Draft Warning - ซ่อนตอนพิมพ์ */}
        {isDraft && (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 print:hidden">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">ฉบับร่าง</AlertTitle>
            <AlertDescription className="text-yellow-700">
              ใบเสร็จนี้ยังเป็นฉบับร่าง กรุณา<Link href={`/receipts/${id}/edit`} className="underline font-medium">แก้ไขและออกใบเสร็จ</Link>ก่อนจึงจะพิมพ์หรือดาวน์โหลดได้
            </AlertDescription>
          </Alert>
        )}

        {/* Cancelled Warning - ซ่อนตอนพิมพ์ */}
        {isCancelled && (
          <Alert variant="destructive" className="mb-6 print:hidden">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ใบเสร็จถูกยกเลิก</AlertTitle>
            <AlertDescription>
              ใบเสร็จนี้ถูกยกเลิกแล้ว ไม่สามารถใช้งานได้
            </AlertDescription>
          </Alert>
        )}

        {/* Preview - A4 size: 210mm x 297mm */}
        <div
          id="receipt-preview"
          ref={printRef}
          className="bg-white shadow-lg mx-auto relative print:shadow-none print:mx-0"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '15mm 20mm',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div className="flex justify-between mb-4">
            <div>
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-10 mb-1" />
              )}
              <h2 className="text-base font-bold">{settings?.company_name || "บริษัท"}</h2>
              {settings?.company_name_en && (
                <p className="text-xs text-muted-foreground">{settings.company_name_en}</p>
              )}
              <p className="text-xs text-muted-foreground">{settings?.address}</p>
              <p className="text-xs text-muted-foreground">
                เลขประจำตัวผู้เสียภาษี: {settings?.tax_id || "-"} ({settings?.branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา ${settings?.branch_code}`})
              </p>
              <p className="text-xs text-muted-foreground">
                โทร: {settings?.phone || "-"} | อีเมล: {settings?.email || "-"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-red-500 font-bold">(ต้นฉบับ)</p>
              <h1 className="text-xl font-bold text-primary">ใบเสร็จรับเงิน</h1>
              <p className="font-bold text-sm">{receipt.receipt_number}</p>
              <p className="text-xs text-muted-foreground">วันที่: {formatDateBE(receipt.issue_date)}</p>
              <p className="text-xs text-muted-foreground">ชำระโดย: {paymentMethodLabels[receipt.payment_method] || receipt.payment_method || "-"}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 p-3 rounded mb-3">
            <h3 className="font-semibold text-xs mb-1">ลูกค้า</h3>
            <p className="font-medium text-sm">{receipt.customer_name}</p>
            {receipt.customer_name_en && <p className="text-xs text-muted-foreground">{receipt.customer_name_en}</p>}
            <p className="text-xs">{receipt.customer_address}</p>
            {receipt.customer_tax_id && (
              <p className="text-xs">
                เลขประจำตัวผู้เสียภาษี: {receipt.customer_tax_id} ({receipt.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา ${receipt.customer_branch_code}`})
              </p>
            )}
            {receipt.customer_phone && <p className="text-xs">โทร: {receipt.customer_phone}</p>}
          </div>

          {/* Items Table */}
          <table className="w-full mb-3 text-xs">
            <thead>
              <tr className="border-b-2 bg-gray-100">
                <th className="text-center py-1.5 w-10">ลำดับ</th>
                <th className="text-left py-1.5 px-2">รายการ</th>
                <th className="text-right py-1.5 w-16">จำนวน</th>
                <th className="text-center py-1.5 w-14">หน่วย</th>
                <th className="text-right py-1.5 w-20">ราคา/หน่วย</th>
                <th className="text-right py-1.5 w-20">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b">
                  <td className="py-1.5 text-center">{index + 1}</td>
                  <td className="py-1.5 px-2">{item.description}</td>
                  <td className="py-1.5 text-right">{formatCurrency(item.quantity)}</td>
                  <td className="py-1.5 text-center">{item.unit}</td>
                  <td className="py-1.5 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-1.5 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="flex justify-between items-start mb-3">
            <div className="text-xs text-muted-foreground">
              <p>({numberToThaiText(receipt.total_amount)})</p>
            </div>
            <div className="w-56 text-xs">
              <div className="flex justify-between py-0.5 border-b">
                <span>รวมเงิน</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.discount_amount > 0 && (
                <div className="flex justify-between py-0.5 border-b text-red-500">
                  <span>ส่วนลด</span>
                  <span>-{formatCurrency(receipt.discount_amount)}</span>
                </div>
              )}
              {receipt.vat_rate > 0 && (
                <>
                  <div className="flex justify-between py-0.5 border-b">
                    <span>มูลค่าก่อน VAT</span>
                    <span>{formatCurrency(receipt.amount_before_vat)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b">
                    <span>VAT {receipt.vat_rate}%</span>
                    <span>{formatCurrency(receipt.vat_amount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1.5 font-bold text-sm bg-primary/10 px-2 rounded mt-1">
                <span>รวมทั้งสิ้น</span>
                <span>{formatCurrency(receipt.total_amount)} บาท</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="mb-3">
              <p className="font-medium text-xs">หมายเหตุ:</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{receipt.notes}</p>
            </div>
          )}

          {/* Signature Section - อยู่ล่างสุดเสมอเมื่อพิมพ์ */}
          <div className="signature-section flex justify-between items-end pt-6 mt-8 border-t">
            {/* ผู้รับสินค้า/บริการ */}
            <div className="text-center flex-1">
              <div className="w-24 border-b border-gray-400 mb-1 h-5 mx-auto"></div>
              <p className="text-xs text-muted-foreground">ผู้รับสินค้า/บริการ</p>
              <p className="text-xs text-muted-foreground">วันที่ ____/____/____</p>
            </div>

            {/* ตราประทับ */}
            <div className="text-center flex-1">
              {showStamp && settings?.stamp_url ? (
                <img src={settings.stamp_url} alt="ตราประทับ" className="w-[180px] h-[180px] object-contain mx-auto" />
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-xs text-gray-400">ประทับตรา</span>
                </div>
              )}
            </div>

            {/* ผู้รับเงิน */}
            <div className="text-center flex-1">
              {showSignature && settings?.signature_url && (
                <img src={settings.signature_url} alt="ลายเซ็น" className="h-10 object-contain mx-auto -mb-4" />
              )}
              <div className="w-36 border-b border-gray-400 mb-2 h-8 mx-auto"></div>
              {settings?.signatory_name ? (
                <>
                  <p className="font-medium text-xs">{settings.signatory_name}</p>
                  {settings?.signatory_position && (
                    <p className="text-xs text-muted-foreground">{settings.signatory_position}</p>
                  )}
                  <p className="text-xs text-muted-foreground">ผู้รับเงิน</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">ผู้รับเงิน</p>
                  <p className="text-xs text-muted-foreground">วันที่ ____/____/____</p>
                </>
              )}
            </div>
          </div>

          {/* Draft Watermark */}
          {isDraft && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-yellow-500 text-6xl font-bold opacity-30 rotate-[-30deg]">ฉบับร่าง</p>
            </div>
          )}

          {/* Cancelled Watermark */}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-red-500 text-6xl font-bold opacity-20 rotate-[-30deg]">ยกเลิก</p>
            </div>
          )}
        </div>

        {/* Cancel Button - ซ่อนตอนพิมพ์ */}
        {receipt.status === "issued" && (
          <div className="max-w-4xl mx-auto mt-6 flex justify-end print:hidden">
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

        {/* Cancel Confirmation Dialog - ซ่อนตอนพิมพ์ */}
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

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            html, body {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden;
            }
            #receipt-preview,
            #receipt-preview * {
              visibility: visible;
            }
            #receipt-preview {
              position: absolute;
              left: 50%;
              top: 0;
              transform: translateX(-50%);
              width: 210mm;
              min-height: 297mm;
              padding: 15mm 20mm;
              padding-bottom: 70mm; /* เว้นที่สำหรับ signature section */
              box-sizing: border-box;
            }
            .signature-section {
              position: absolute;
              bottom: 15mm;
              left: 20mm;
              right: 20mm;
              margin-top: 0 !important;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
              background: white;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
