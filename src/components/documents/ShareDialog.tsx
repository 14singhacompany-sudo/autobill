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
  MessageCircle,
  Link2,
  Check,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pdf } from "@react-pdf/renderer";
import { QuotationPDF } from "@/lib/pdf/QuotationPDF";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";

interface QuotationData {
  quotation_number: string;
  issue_date: string;
  valid_until: string | null;
  customer_name: string;
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
  documentType: "quotation" | "invoice";
  documentId?: string;
  documentNumber?: string;
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
  customerEmail,
  documentData,
  documentItems,
  companyData,
  onSendEmail,
}: ShareDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(customerEmail || "");
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copied, setCopied] = useState(false);

  const documentTypeThai =
    documentType === "quotation" ? "ใบเสนอราคา" : "ใบกำกับภาษี";
  const previewPath = documentType === "quotation" ? "quotations" : "invoices";

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

  // Download PDF
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const blob = await generatePDFBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${documentNumber || documentType}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "ดาวน์โหลดสำเร็จ",
          description: `ดาวน์โหลด ${documentTypeThai} เรียบร้อยแล้ว`,
        });
      } else {
        throw new Error("ไม่สามารถสร้าง PDF ได้");
      }
    } catch {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดาวน์โหลด PDF ได้",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareableLink) return;

    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      toast({
        title: "คัดลอกลิงก์แล้ว",
        description: "ลิงก์ถูกคัดลอกไปยังคลิปบอร์ดแล้ว",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "ไม่สามารถคัดลอกได้",
        description: "กรุณาคัดลอกลิงก์ด้วยตนเอง",
        variant: "destructive",
      });
    }
  };

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

  const handleShareLine = async () => {
    setIsGeneratingPDF(true);
    try {
      // Generate and download PDF first
      const pdfBlob = await generatePDFBlob();
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

      // Open LINE share (LINE doesn't support direct file share from web, so share link)
      const text = encodeURIComponent(
        `${documentTypeThai} ${documentNumber || ""}\n${shareableLink}`
      );
      window.open(`https://line.me/R/msg/text/?${text}`, "_blank");

      toast({
        title: "PDF ดาวน์โหลดแล้ว",
        description: "กรุณาแนบไฟล์ PDF ใน LINE",
      });
      onOpenChange(false);
    } catch {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแชร์ได้",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleOpenPreview = () => {
    if (shareableLink) {
      window.open(shareableLink, "_blank");
    }
  };

  const canGeneratePDF = documentData && documentItems && documentItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ส่ง{documentTypeThai}</DialogTitle>
          <DialogDescription>
            เลือกช่องทางที่ต้องการส่ง{documentTypeThai}
            {documentNumber && ` เลขที่ ${documentNumber}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download PDF */}
          {canGeneratePDF && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              ดาวน์โหลด PDF
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ส่งไปยัง
              </span>
            </div>
          </div>

          {/* Email Section */}
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
                ? "จะดาวน์โหลด PDF อัตโนมัติเพื่อแนบในอีเมล"
                : "กรุณาบันทึกเอกสารก่อนส่ง"}
            </p>
          </div>

          {/* Other Share Options */}
          <div className="grid grid-cols-2 gap-3">
            {/* LINE */}
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={handleShareLine}
              disabled={!documentId || isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <MessageCircle className="h-6 w-6 text-green-500" />
              )}
              <span className="text-sm">ส่งทาง LINE</span>
              <span className="text-xs text-muted-foreground">+ PDF</span>
            </Button>

            {/* Copy Link */}
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={handleCopyLink}
              disabled={!documentId}
            >
              {copied ? (
                <Check className="h-6 w-6 text-green-500" />
              ) : (
                <Link2 className="h-6 w-6 text-blue-500" />
              )}
              <span className="text-sm">
                {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
              </span>
              <span className="text-xs text-muted-foreground">แชร์ลิงก์</span>
            </Button>
          </div>

          {/* Link Preview */}
          {documentId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">ลิงก์สำหรับแชร์</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareableLink}
                  className="flex-1 text-xs bg-muted"
                />
                <Button variant="outline" size="icon" onClick={handleOpenPreview}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {!documentId && (
            <p className="text-sm text-muted-foreground text-center py-2">
              กรุณาบันทึกเอกสารก่อนส่ง
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
