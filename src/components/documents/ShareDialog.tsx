"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { pdf } from "@react-pdf/renderer";
import { QuotationPDF } from "@/lib/pdf/QuotationPDF";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";

interface QuotationData {
  quotation_number: string;
  issue_date: string;
  valid_until: string | null;
  customer_name: string;
  customer_name_en?: string | null;
  customer_address: string | null;
  customer_tax_id: string | null;
  customer_branch_code: string | null;
  customer_contact: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes: string | null;
  terms_conditions: string | null;
}

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  customer_name: string;
  customer_name_en?: string | null;
  customer_address: string | null;
  customer_tax_id: string | null;
  customer_branch_code: string | null;
  customer_contact: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes: string | null;
  terms_conditions: string | null;
}

interface DocumentItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

interface CompanyData {
  company_name: string;
  company_name_en?: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
  branch_code?: string;
  branch_name?: string;
  bank_name?: string;
  bank_branch?: string;
  account_name?: string;
  account_number?: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: "quotation" | "invoice" | "billing-invoice";
  documentId?: string;
  documentNumber?: string;
  documentStatus?: string;
  customerEmail?: string;
  documentData?: QuotationData | InvoiceData;
  documentItems?: DocumentItem[];
  companyData?: CompanyData;
  onSendEmail?: (email: string, pdfBlob: Blob) => Promise<void>;
}

export function ShareDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  documentNumber,
  documentStatus,
  customerEmail,
  documentData,
  documentItems,
  companyData,
  onSendEmail,
}: ShareDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(customerEmail || "");
  const [isSending, setIsSending] = useState(false);

  const documentTypeThai = documentType === "quotation"
    ? "ใบเสนอราคา"
    : documentType === "billing-invoice"
      ? "ใบแจ้งหนี้"
      : "ใบกำกับภาษี";
  const previewPath = documentType === "quotation"
    ? "quotations"
    : documentType === "billing-invoice"
      ? "billing-invoices"
      : "invoices";

  // Generate shareable link
  const shareableLink = documentId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${previewPath}/${documentId}/preview`
    : "";

  // Generate PDF blob
  const generatePDFBlob = useCallback(async (): Promise<Blob | null> => {
    if (!documentData || !documentItems) return null;

    try {
      let pdfDocument;
      if (documentType === "quotation") {
        pdfDocument = (
          <QuotationPDF
            quotation={documentData as QuotationData}
            items={documentItems}
            company={companyData}
          />
        );
      } else {
        pdfDocument = (
          <InvoicePDF
            invoice={documentData as InvoiceData}
            items={documentItems}
            company={companyData}
            documentTitle={documentType === "billing-invoice" ? "ใบแจ้งหนี้" : undefined}
            copyCount={documentType === "billing-invoice" ? 0 : undefined}
          />
        );
      }

      const blob = await pdf(pdfDocument).toBlob();
      return blob;
    } catch (error) {
      console.error("Error generating PDF:", error);
      return null;
    }
  }, [documentData, documentItems, documentType, companyData]);

  const handleSendEmail = async () => {
    if (!email.trim()) {
      toast({
        title: "กรุณากรอกอีเมล",
        description: "กรุณากรอกอีเมลผู้รับ",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Generate PDF first
      const pdfBlob = await generatePDFBlob();

      if (onSendEmail && pdfBlob) {
        await onSendEmail(email, pdfBlob);
        toast({
          title: "ส่งอีเมลสำเร็จ",
          description: `ส่ง${documentTypeThai}ไปยัง ${email} แล้ว`,
        });
        onOpenChange(false);
      } else {
        // Fallback: Open default email client with link
        // Note: Can't attach file directly via mailto, so include link
        const subject = encodeURIComponent(
          `${documentTypeThai} ${documentNumber || ""}`
        );
        const body = encodeURIComponent(
          `สวัสดีครับ/ค่ะ\n\nส่ง${documentTypeThai}มาให้ตามลิงก์ด้านล่าง:\n${shareableLink}\n\n(กรุณาดาวน์โหลด PDF จากระบบเพื่อแนบไฟล์)\n\nขอบคุณครับ/ค่ะ`
        );
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");

        // Also download PDF for manual attachment
        if (pdfBlob) {
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${documentNumber || documentType}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        toast({
          title: "เปิดอีเมลแล้ว",
          description: "PDF ถูกดาวน์โหลดแล้ว กรุณาแนบไฟล์ในอีเมล",
        });
        onOpenChange(false);
      }
    } catch {
      toast({
        title: "ส่งอีเมลไม่สำเร็จ",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const canGeneratePDF = documentData && documentItems && documentItems.length > 0;
  const isDraft = documentStatus === "draft";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ส่ง{documentTypeThai}</DialogTitle>
          <DialogDescription>
            ส่ง{documentTypeThai}ทางอีเมล
            {documentNumber && ` เลขที่ ${documentNumber}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Draft Warning */}
          {isDraft && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>ไม่สามารถส่งเอกสารฉบับร่างได้</AlertTitle>
              <AlertDescription>
                {documentTypeThai}นี้ยังอยู่ในสถานะ &quot;ฉบับร่าง&quot;
                กรุณา{documentType === "quotation" ? "ส่งใบเสนอราคา" : "ออกใบกำกับภาษี"}ก่อนจึงจะสามารถส่งหรือแชร์ได้
              </AlertDescription>
            </Alert>
          )}

          {/* Email Section */}
          {!isDraft && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">ส่งทางอีเมล</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={isSending || !email.trim() || !documentId}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  ส่ง
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {canGeneratePDF
                  ? "ระบบจะเปิดโปรแกรมอีเมลและดาวน์โหลด PDF กรุณาแนบไฟล์ก่อนกดส่ง"
                  : "กรุณาบันทึกเอกสารก่อนส่ง"}
              </p>
            </div>
          )}

          {!documentId && !isDraft && (
            <p className="text-sm text-muted-foreground text-center py-2">
              กรุณาบันทึกเอกสารก่อนส่ง
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
