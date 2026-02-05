"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useCompanyStore } from "@/stores/companyStore";
import { useQuotationStore } from "@/stores/quotationStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { numberToThaiText } from "@/lib/utils/numberToThaiText";
import { pdf } from "@react-pdf/renderer";
import { QuotationPDF } from "@/lib/pdf/QuotationPDF";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";

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

interface QuotationWithItems {
  quotation: QuotationData;
  items: QuotationItem[];
}

function QuotationsPrintPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids")?.split(",") || [];
  const { settings, fetchSettings } = useCompanyStore();
  const { getQuotation } = useQuotationStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [quotationsData, setQuotationsData] = useState<QuotationWithItems[]>([]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchAllQuotations = async () => {
      if (ids.length === 0) {
        router.push("/quotations");
        return;
      }

      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            const result = await getQuotation(id);
            if (result) {
              return {
                quotation: result.quotation as QuotationData,
                items: result.items as QuotationItem[],
              };
            }
            return null;
          })
        );

        const validResults = results.filter((r): r is QuotationWithItems => r !== null);
        setQuotationsData(validResults);
      } catch (error) {
        console.error("Error fetching quotations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllQuotations();
  }, [ids, router, getQuotation]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!settings || quotationsData.length === 0) return;

    setIsDownloading(true);
    try {
      if (quotationsData.length === 1) {
        // Single quotation - download directly
        const { quotation, items } = quotationsData[0];
        const blob = await pdf(
          <QuotationPDF quotation={quotation} items={items} company={settings} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${quotation.quotation_number}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Multiple quotations - create zip file
        const zip = new JSZip();

        for (const { quotation, items } of quotationsData) {
          const blob = await pdf(
            <QuotationPDF quotation={quotation} items={items} company={settings} />
          ).toBlob();
          zip.file(`${quotation.quotation_number}.pdf`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `quotations_${new Date().toISOString().slice(0, 10)}.zip`;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "ดาวน์โหลดสำเร็จ",
        description: quotationsData.length === 1
          ? "ดาวน์โหลดใบเสนอราคาเรียบร้อยแล้ว"
          : `ดาวน์โหลดใบเสนอราคา ${quotationsData.length} รายการเรียบร้อยแล้ว`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดาวน์โหลด PDF ได้",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
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
        <Header title="พิมพ์ใบเสนอราคา" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (quotationsData.length === 0) {
    return (
      <div>
        <Header title="พิมพ์ใบเสนอราคา" />
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

  // Check if any quotation is still in draft status
  const draftQuotations = quotationsData.filter(({ quotation }) => quotation.status === "draft");
  const hasDraftQuotations = draftQuotations.length > 0;

  return (
    <div>
      <Header title={`พิมพ์ใบเสนอราคา (${quotationsData.length} รายการ)`} />

      <div className="p-6">
        {/* Draft Warning */}
        {hasDraftQuotations && (
          <Alert variant="destructive" className="mb-6 print:hidden">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ไม่สามารถพิมพ์เอกสารฉบับร่างได้</AlertTitle>
            <AlertDescription>
              มีใบเสนอราคา {draftQuotations.length} รายการที่ยังอยู่ในสถานะ &quot;ฉบับร่าง&quot;
              กรุณาส่งใบเสนอราคาก่อนจึงจะสามารถพิมพ์หรือดาวน์โหลดได้
              <div className="mt-2">
                {draftQuotations.map(({ quotation }) => (
                  <Link
                    key={quotation.id}
                    href={`/quotations/${quotation.id}/edit`}
                    className="block text-sm underline hover:no-underline"
                  >
                    {quotation.quotation_number} - คลิกเพื่อแก้ไขและส่งใบเสนอราคา
                  </Link>
                ))}
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePrint}
              disabled={hasDraftQuotations}
            >
              <Printer className="h-4 w-4" />
              พิมพ์ทั้งหมด
            </Button>
            <Button
              className="gap-2"
              onClick={handleDownloadPDF}
              disabled={hasDraftQuotations || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด PDF"}
            </Button>
          </div>
        </div>

        {/* All Quotations Preview */}
        <div id="print-area">
          {quotationsData.map(({ quotation, items }, index) => {
            const isThisDraft = quotation.status === "draft";
            return (
            <div
              key={quotation.id}
              className={`quotation-page bg-white border rounded-lg shadow-sm max-w-4xl mx-auto p-6 pb-24 print:p-4 print:pb-20 print:shadow-none print:border-none relative overflow-hidden ${
                index > 0 ? "mt-8 print:mt-0 print:break-before-page" : ""
              }`}
            >
              {/* Draft Watermark */}
              {isThisDraft && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 draft-watermark">
                  <span className="text-[120px] font-bold text-red-500/30 -rotate-45 select-none whitespace-nowrap">
                    ฉบับร่าง
                  </span>
                </div>
              )}
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  {settings?.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="h-12 mb-1" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center mb-1">
                      <span className="text-gray-400 text-xs">LOGO</span>
                    </div>
                  )}
                  <h2 className="text-lg font-bold">{settings?.company_name || "ชื่อบริษัท"}</h2>
                  {settings?.company_name_en && (
                    <p className="text-xs text-muted-foreground">{settings.company_name_en}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
                    {settings?.address || "ที่อยู่บริษัท"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    โทร: {settings?.phone || "-"} | อีเมล: {settings?.email || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    เลขประจำตัวผู้เสียภาษี: {settings?.tax_id || "-"}
                    <span className="ml-1">
                      ({!settings?.branch_code || settings.branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${settings.branch_name || settings.branch_code}`})
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <h1 className="text-xl font-bold text-primary mb-1">ใบเสนอราคา</h1>
                  <p className="text-base font-medium">{quotation.quotation_number}</p>
                  <div className="mt-2 text-xs">
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
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <h3 className="font-semibold mb-1 text-sm">ลูกค้า</h3>
                <p className="font-medium text-sm">{quotation.customer_name}</p>
                {quotation.customer_name_en && (
                  <p className="text-xs text-muted-foreground">{quotation.customer_name_en}</p>
                )}
                {quotation.customer_address && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {quotation.customer_address}
                  </p>
                )}
                {quotation.customer_tax_id && (
                  <p className="text-xs text-muted-foreground">
                    เลขประจำตัวผู้เสียภาษี: {quotation.customer_tax_id}
                    <span className="ml-2">
                      ({!quotation.customer_branch_code || quotation.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${quotation.customer_branch_code}`})
                    </span>
                  </p>
                )}
                {quotation.customer_contact && (
                  <p className="text-xs text-muted-foreground">ติดต่อ: {quotation.customer_contact}</p>
                )}
                {quotation.customer_phone && (
                  <p className="text-xs text-muted-foreground">โทร: {quotation.customer_phone}</p>
                )}
                {quotation.customer_email && (
                  <p className="text-xs text-muted-foreground">อีเมล: {quotation.customer_email}</p>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full mb-4 text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-1.5 px-1 font-semibold w-10">ลำดับ</th>
                    <th className="text-left py-1.5 px-1 font-semibold">รายการ</th>
                    <th className="text-right py-1.5 px-1 font-semibold w-16">จำนวน</th>
                    <th className="text-center py-1.5 px-1 font-semibold w-14">หน่วย</th>
                    <th className="text-right py-1.5 px-1 font-semibold w-24">ราคา/หน่วย</th>
                    <th className="text-right py-1.5 px-1 font-semibold w-24">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted-foreground">
                        ไม่มีรายการ
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-1.5 px-1">{idx + 1}</td>
                        <td className="py-1.5 px-1">{item.description}</td>
                        <td className="py-1.5 px-1 text-right">{formatNumber(item.quantity)}</td>
                        <td className="py-1.5 px-1 text-center">{item.unit}</td>
                        <td className="py-1.5 px-1 text-right">{formatNumber(item.unit_price)}</td>
                        <td className="py-1.5 px-1 text-right">{formatNumber(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-end mb-4">
                <div className="w-64 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span>รวมเงิน</span>
                    <span>{formatNumber(quotation.subtotal)}</span>
                  </div>
                  {quotation.discount_amount > 0 && (
                    <div className="flex justify-between py-1 border-b text-red-600">
                      <span>
                        ส่วนลด{" "}
                        {quotation.discount_type === "percent"
                          ? `(${quotation.discount_value}%)`
                          : ""}
                      </span>
                      <span>-{formatNumber(quotation.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b">
                    <span>มูลค่าก่อน VAT</span>
                    <span>{formatNumber(quotation.amount_before_vat)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>VAT {quotation.vat_rate}%</span>
                    <span>{formatNumber(quotation.vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-sm bg-primary/10 px-2 -mx-2 rounded">
                    <span>รวมทั้งสิ้น</span>
                    <span>{formatNumber(quotation.total_amount)} บาท</span>
                  </div>
                </div>
              </div>

              {/* Thai Text */}
              <div className="flex items-center justify-between -mt-2 mb-3">
                <span className="text-xs text-muted-foreground">
                  ({numberToThaiText(quotation.total_amount)})
                </span>
              </div>

              {/* Notes & Terms */}
              {(quotation.notes || quotation.terms_conditions) && (
                <div className="border-t pt-2 mt-3 text-xs">
                  {quotation.notes && (
                    <div className="mb-2">
                      <h4 className="font-semibold mb-0.5">หมายเหตุ</h4>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {quotation.notes}
                      </p>
                    </div>
                  )}
                  {quotation.terms_conditions && (
                    <div>
                      <h4 className="font-semibold mb-0.5">เงื่อนไข</h4>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {quotation.terms_conditions}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bank Info */}
              {settings?.bank_name && (
                <div className="border-t pt-2 mt-3 text-xs">
                  <h4 className="font-semibold mb-1">ข้อมูลการชำระเงิน</h4>
                  <div>
                    <p>
                      ธนาคาร: {settings.bank_name} สาขา {settings.bank_branch}
                    </p>
                    <p>ชื่อบัญชี: {settings.account_name}</p>
                    <p>เลขที่บัญชี: {settings.account_number}</p>
                  </div>
                </div>
              )}

              {/* Signature - fixed at bottom */}
              <div className="signature-section absolute bottom-4 left-6 right-6 print:bottom-4 print:left-4 print:right-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1 h-10"></div>
                  <p className="text-xs text-muted-foreground">ผู้เสนอราคา</p>
                  <p className="text-xs text-muted-foreground">วันที่ ______/______/______</p>
                </div>
                {/* ประทับตรา */}
                <div className="flex items-center justify-center">
                  <div className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400">ประทับตรา</p>
                      <p className="text-[10px] text-gray-400">(ถ้ามี)</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-400 mb-1 h-10"></div>
                  <p className="text-xs text-muted-foreground">ผู้อนุมัติ</p>
                  <p className="text-xs text-muted-foreground">วันที่ ______/______/______</p>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </div>

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
          #print-area > div > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* ทำให้ทั้งหน้าอยู่ในหน้าเดียวและลายเซ็นอยู่ท้ายหน้า */
          .quotation-page {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 277mm; /* A4 height (297mm) - margin (10mm*2) */
            min-height: 277mm;
            position: relative;
            box-sizing: border-box;
          }
          .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print\\:break-before-page {
            break-before: page;
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
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}

export default function QuotationsPrintPage() {
  return (
    <Suspense
      fallback={
        <div>
          <Header title="พิมพ์ใบเสนอราคา" />
          <div className="p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      }
    >
      <QuotationsPrintPageContent />
    </Suspense>
  );
}
