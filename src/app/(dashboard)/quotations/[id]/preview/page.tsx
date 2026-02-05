"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2, AlertTriangle, XCircle, Copy, Stamp, PenTool } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useCompanyStore } from "@/stores/companyStore";
import { useQuotationStore } from "@/stores/quotationStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { numberToThaiText } from "@/lib/utils/numberToThaiText";
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
import { pdf } from "@react-pdf/renderer";
import { QuotationPDF } from "@/lib/pdf/QuotationPDF";

interface QuotationData {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_name_en: string | null;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
  valid_until: string;
  subtotal: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  notes: string;
  terms_conditions: string;
  status: string;
}

interface QuotationItem {
  id: string;
  item_order: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  amount: number;
}

export default function QuotationPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, fetchSettings } = useCompanyStore();
  const { getQuotation, cancelQuotation } = useQuotationStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showStamp, setShowStamp] = useState(true);
  const [showSignature, setShowSignature] = useState(true);

  const id = params.id as string;

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchQuotationData = async () => {
      try {
        const result = await getQuotation(id);
        if (result) {
          setQuotation(result.quotation as QuotationData);
          setItems(result.items as QuotationItem[]);
        } else {
          router.push("/quotations");
        }
      } catch (error) {
        console.error("Error fetching quotation:", error);
        router.push("/quotations");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchQuotationData();
    }
  }, [id, router, getQuotation]);

  const handlePrint = async () => {
    if (!quotation || !settings) return;

    try {
      const blob = await pdf(
        <QuotationPDF quotation={quotation} items={items} company={settings} showStamp={showStamp} showSignature={showSignature} />
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
    if (!quotation || !settings) return;

    try {
      const blob = await pdf(
        <QuotationPDF quotation={quotation} items={items} company={settings} showStamp={showStamp} showSignature={showSignature} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${quotation.quotation_number}.pdf`;
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
      const result = await cancelQuotation(id);
      if (result.success) {
        toast({
          title: "ยกเลิกใบเสนอราคาสำเร็จ",
          description: "ใบเสนอราคาถูกยกเลิกแล้ว",
        });
        // Refresh the page data
        const refreshed = await getQuotation(id);
        if (refreshed) {
          setQuotation(refreshed.quotation as QuotationData);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถยกเลิกใบเสนอราคาได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกใบเสนอราคาได้",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setIsCancelDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title="พรีวิวใบเสนอราคา" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div>
        <Header title="พรีวิวใบเสนอราคา" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">ไม่พบข้อมูลใบเสนอราคา</p>
          <Link href="/quotations">
            <Button variant="outline" className="mt-4">
              กลับไปหน้ารายการ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check quotation status
  const isDraft = quotation.status === "draft";
  const isCancelled = quotation.status === "cancelled";
  const isSent = quotation.status === "pending" || quotation.status === "sent";

  return (
    <div>
      <Header title="พรีวิวใบเสนอราคา" />

      <div className="p-6">
        {/* Draft Warning */}
        {isDraft && (
          <Alert variant="destructive" className="mb-6 print:hidden">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ไม่สามารถพิมพ์เอกสารฉบับร่างได้</AlertTitle>
            <AlertDescription>
              ใบเสนอราคานี้ยังอยู่ในสถานะ &quot;ฉบับร่าง&quot; กรุณาส่งใบเสนอราคาก่อนจึงจะสามารถพิมพ์หรือดาวน์โหลดได้
              <div className="mt-2">
                <Link
                  href={`/quotations/${id}/edit`}
                  className="text-sm underline hover:no-underline"
                >
                  คลิกเพื่อแก้ไขและส่งใบเสนอราคา
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cancelled Notice */}
        {isCancelled && (
          <Alert className="mb-6 print:hidden border-orange-500 bg-orange-50">
            <XCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">ใบเสนอราคานี้ถูกยกเลิกแล้ว</AlertTitle>
            <AlertDescription className="text-orange-700">
              เอกสารนี้ถูกยกเลิกและไม่สามารถใช้งานได้ หากต้องการออกใบใหม่ กรุณาสร้างใบเสนอราคาใหม่
              <div className="mt-2">
                <Link
                  href={`/quotations/new?duplicate=${id}`}
                  className="text-sm underline hover:no-underline"
                >
                  คลิกเพื่อคัดลอกและสร้างใบเสนอราคาใหม่
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href="/quotations">
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
            {/* ปุ่มคัดลอกเพื่อสร้างใบใหม่ (สำหรับใบที่ยกเลิกแล้ว) */}
            {isCancelled && (
              <Link href={`/quotations/new?duplicate=${id}`}>
                <Button variant="outline" className="gap-2">
                  <Copy className="h-4 w-4" />
                  คัดลอกสร้างใบใหม่
                </Button>
              </Link>
            )}
            {/* ปุ่มยกเลิก (สำหรับใบที่ส่งแล้วและยังไม่ยกเลิก) */}
            {isSent && (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setIsCancelDialogOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                ยกเลิกใบเสนอราคา
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

        {/* Quotation Preview */}
        <div
          id="print-area"
          ref={printRef}
          className="bg-white border rounded-lg shadow-sm max-w-4xl mx-auto p-8 print:shadow-none print:border-none relative overflow-hidden"
        >
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
              <span className="text-[120px] font-bold text-orange-500/30 -rotate-45 select-none whitespace-nowrap">
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
                <span className="ml-1">
                  ({!settings?.branch_code || settings.branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${settings.branch_name || settings.branch_code}`})
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                โทร: {settings?.phone || "-"} | อีเมล: {settings?.email || "-"}
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-primary mb-2">ใบเสนอราคา</h1>
              <p className="text-lg font-medium">{quotation.quotation_number}</p>
              <div className="mt-4 text-sm">
                <p>
                  <span className="text-muted-foreground">วันที่:</span>{" "}
                  {formatDate(quotation.issue_date)}
                </p>
                <p>
                  <span className="text-muted-foreground">ใช้ได้ถึง:</span>{" "}
                  {formatDate(quotation.valid_until)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">ลูกค้า</h3>
            <p className="font-medium">{quotation.customer_name}</p>
            {quotation.customer_name_en && (
              <p className="text-sm text-muted-foreground">{quotation.customer_name_en}</p>
            )}
            {quotation.customer_address && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {quotation.customer_address}
              </p>
            )}
            {quotation.customer_tax_id && (
              <p className="text-sm text-muted-foreground">
                เลขประจำตัวผู้เสียภาษี: {quotation.customer_tax_id}
                <span className="ml-2">
                  ({!quotation.customer_branch_code || quotation.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${quotation.customer_branch_code}`})
                </span>
              </p>
            )}
            {quotation.customer_contact && (
              <p className="text-sm text-muted-foreground">ผู้ติดต่อ: {quotation.customer_contact}</p>
            )}
            {quotation.customer_phone && (
              <p className="text-sm text-muted-foreground">โทร: {quotation.customer_phone}</p>
            )}
            {quotation.customer_email && (
              <p className="text-sm text-muted-foreground">อีเมล: {quotation.customer_email}</p>
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
                <span>{formatNumber(quotation.subtotal)}</span>
              </div>
              {quotation.discount_amount > 0 && (
                <div className="flex justify-between py-2 border-b text-red-600">
                  <span>
                    ส่วนลด{" "}
                    {quotation.discount_type === "percent"
                      ? `(${quotation.discount_value}%)`
                      : ""}
                  </span>
                  <span>-{formatNumber(quotation.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span>มูลค่าก่อน VAT</span>
                <span>{formatNumber(quotation.amount_before_vat)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>VAT {quotation.vat_rate}%</span>
                <span>{formatNumber(quotation.vat_amount)}</span>
              </div>
              <div className="flex justify-between py-3 font-bold text-lg bg-primary/10 px-3 -mx-3 rounded">
                <span>รวมทั้งสิ้น</span>
                <span>{formatNumber(quotation.total_amount)} บาท</span>
              </div>
            </div>
          </div>

          {/* Thai Text - ชิดซ้ายสุด บรรทัดเดียวกับยอดรวม */}
          <div className="flex items-center justify-between -mt-12 mb-6">
            <span className="text-base text-muted-foreground">
              ({numberToThaiText(quotation.total_amount)})
            </span>
          </div>

          {/* Notes & Terms */}
          {(quotation.notes || quotation.terms_conditions) && (
            <div className="border-t pt-4 mt-6">
              {quotation.notes && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">หมายเหตุ</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {quotation.notes}
                  </p>
                </div>
              )}
              {quotation.terms_conditions && (
                <div>
                  <h4 className="font-semibold mb-1">เงื่อนไข</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {quotation.terms_conditions}
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
                    <p className="text-sm text-muted-foreground">ผู้เสนอราคา</p>
                    <p className="text-xs text-muted-foreground mt-1">วันที่ ____/____/____</p>
                  </>
                )}
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
                <div className="border-b border-gray-400 mb-2 h-8 w-36 mx-auto"></div>
                <p className="text-sm text-muted-foreground">ผู้อนุมัติ</p>
                <p className="text-xs text-muted-foreground mt-1">วันที่ ____/____/____</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกใบเสนอราคา</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>คุณต้องการยกเลิกใบเสนอราคาเลขที่ <strong>{quotation.quotation_number}</strong> ใช่หรือไม่?</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>เอกสารที่ยกเลิกจะไม่สามารถใช้งานได้</li>
                  <li>เอกสารจะถูกเก็บไว้เป็นหลักฐานและไม่สามารถลบได้</li>
                  <li>หากต้องการแก้ไข ให้สร้างใบเสนอราคาใหม่โดยคัดลอกจากใบนี้</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังยกเลิก...
                </>
              ) : (
                "ยืนยันยกเลิก"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          .draft-watermark {
            display: flex !important;
            visibility: visible !important;
          }
          .draft-watermark span {
            color: rgba(239, 68, 68, 0.3) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cancelled-watermark {
            display: flex !important;
            visibility: visible !important;
          }
          .cancelled-watermark span {
            color: rgba(249, 115, 22, 0.3) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
