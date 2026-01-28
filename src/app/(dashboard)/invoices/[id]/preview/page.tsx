"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCompanyStore } from "@/stores/companyStore";
import { useInvoiceStore } from "@/stores/invoiceStore";

interface InvoiceData {
  id: string;
  invoice_number: string;
  // ข้อมูลบังคับตามกฎหมาย (มาตรา 86/4)
  customer_name: string;
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
}

export default function InvoicePreviewPage() {
  const router = useRouter();
  const params = useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const { settings, fetchSettings } = useCompanyStore();
  const { getInvoice } = useInvoiceStore();

  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);

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

  const handlePrint = () => {
    window.print();
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

  return (
    <div>
      <Header title="พรีวิวใบกำกับภาษี" />

      <div className="p-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link href="/invoices">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              พิมพ์
            </Button>
            <Button className="gap-2" onClick={handlePrint}>
              <Download className="h-4 w-4" />
              ดาวน์โหลด PDF
            </Button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div
          id="print-area"
          ref={printRef}
          className="bg-white border rounded-lg shadow-sm max-w-4xl mx-auto p-8 print:shadow-none print:border-none"
        >
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
                โทร: {settings?.phone || "-"} | อีเมล: {settings?.email || "-"}
              </p>
              <p className="text-sm text-muted-foreground">
                เลขประจำตัวผู้เสียภาษี: {settings?.tax_id || "-"}
                {settings?.branch_code && (
                  <span className="ml-1">
                    ({settings.branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${settings.branch_name || settings.branch_code}`})
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-primary mb-2">ใบกำกับภาษี/ใบเสร็จรับเงิน</h1>
              <p className="text-lg font-medium">{invoice.invoice_number}</p>
              <div className="mt-4 text-sm">
                <p>
                  <span className="text-muted-foreground">วันที่:</span>{" "}
                  {formatDate(invoice.issue_date)}
                </p>
{/* <p>
                  <span className="text-muted-foreground">ครบกำหนดชำระ:</span>{" "}
                  {formatDate(invoice.due_date)}
                </p> */}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">ลูกค้า</h3>
            <p className="font-medium">{invoice.customer_name}</p>
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
                    (สาขา: {invoice.customer_branch_code === "00000" ? "สำนักงานใหญ่" : invoice.customer_branch_code})
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
          <div className="grid grid-cols-2 gap-8 mt-12 pt-8">
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 h-16"></div>
              <p className="text-sm text-muted-foreground">ผู้รับสินค้า/บริการ</p>
              <p className="text-xs text-muted-foreground mt-1">วันที่ ______/______/______</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 h-16"></div>
              <p className="text-sm text-muted-foreground">ผู้มีอำนาจลงนาม</p>
              <p className="text-xs text-muted-foreground mt-1">วันที่ ______/______/______</p>
            </div>
          </div>
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
        }
      `}</style>
    </div>
  );
}
