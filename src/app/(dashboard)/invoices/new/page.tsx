"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { InvoiceForm, type InvoiceFormData } from "@/components/forms/InvoiceForm";
import { ShareDialog } from "@/components/documents/ShareDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCompanyStore } from "@/stores/companyStore";
import { useToast } from "@/hooks/use-toast";

// ฟังก์ชันสำหรับดึงวันที่ใน format YYYY-MM-DD (local timezone)
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ฟังก์ชันคำนวณวันครบกำหนดชำระ
const getDueDateFromSettings = (issueDate: string, dueDays: number) => {
  if (dueDays === 0) {
    return issueDate; // ชำระทันที
  }
  const baseDate = new Date(issueDate);
  return getLocalDateString(new Date(baseDate.getTime() + dueDays * 24 * 60 * 60 * 1000));
};

function NewInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const { createInvoice, getInvoice, updateInvoice } = useInvoiceStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { checkCanCreateInvoice, fetchSubscription, fetchUsage } = useSubscriptionStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings } = useCompanyStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!duplicateId);
  const [initialData, setInitialData] = useState<Partial<InvoiceFormData> | undefined>(undefined);
  const [savedDocumentId, setSavedDocumentId] = useState<string | undefined>(undefined);

  // Ref to prevent race condition when creating invoice
  const isCreatingRef = useRef(false);
  const savedDocumentIdRef = useRef<string | undefined>(undefined);

  // Share dialog state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [issuedInvoiceData, setIssuedInvoiceData] = useState<{
    id: string;
    invoice_number: string;
    invoiceData: any;
    items: any[];
  } | null>(null);

  // Fetch subscription, usage, and company settings on mount
  useEffect(() => {
    fetchSubscription();
    fetchUsage();
    fetchCompanySettings();
  }, [fetchSubscription, fetchUsage, fetchCompanySettings]);

  // Load data if duplicating
  useEffect(() => {
    const loadDuplicateData = async () => {
      if (!duplicateId) return;

      try {
        const result = await getInvoice(duplicateId);
        if (result) {
          const { invoice, items } = result;
          setInitialData({
            customer_name: invoice.customer_name || "",
            customer_address: invoice.customer_address || "",
            customer_tax_id: invoice.customer_tax_id || "",
            customer_branch_code: invoice.customer_branch_code || "00000",
            issue_date: getLocalDateString(), // วันที่ใหม่ (local timezone)
            items: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent,
              price_includes_vat: item.price_includes_vat || false,
            })),
            vat_rate: invoice.vat_rate || 7,
            customer_contact: invoice.customer_contact || "",
            customer_phone: invoice.customer_phone || "",
            customer_email: invoice.customer_email || "",
            due_date: getDueDateFromSettings(getLocalDateString(), companySettings?.iv_due_days ?? 0),
            discount_type: (invoice.discount_type as "fixed" | "percent") || "fixed",
            discount_value: invoice.discount_value || 0,
            notes: invoice.notes || "",
            terms_conditions: invoice.terms_conditions || "",
          });
        }
      } catch (error) {
        console.error("Error loading invoice for duplication:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลสำหรับคัดลอกได้",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDuplicateData();
  }, [duplicateId, getInvoice, toast]);

  // Auto-save handler with race condition protection
  const handleAutoSave = async (data: InvoiceFormData) => {
    try {
      // Use ref for immediate check (state might be stale)
      if (savedDocumentIdRef.current) {
        // Update existing draft
        const result = await updateInvoice(savedDocumentIdRef.current, data, "draft");
        if (result) {
          return { id: result.id, invoice_number: result.invoice_number };
        }
      } else {
        // Prevent race condition - if already creating, skip
        if (isCreatingRef.current) {
          return null;
        }

        // Mark as creating
        isCreatingRef.current = true;

        // Create new draft
        const result = await createInvoice(data, "draft");
        if (result) {
          savedDocumentIdRef.current = result.id;
          setSavedDocumentId(result.id);
          return { id: result.id, invoice_number: result.invoice_number };
        }

        // Reset if failed
        isCreatingRef.current = false;
      }
      return null;
    } catch (error) {
      console.error("Auto-save error:", error);
      isCreatingRef.current = false;
      return null;
    }
  };

  const handleSubmit = async (
    data: InvoiceFormData,
    action: "save" | "send"
  ) => {
    setIsSubmitting(true);
    try {
      const status = action === "save" ? "draft" : "issued";

      // Check usage limit if not saving as draft
      if (status !== "draft") {
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
      }

      // บันทึกข้อมูลลูกค้าลงในระบบ (ถ้ามีชื่อลูกค้า) - ทำ background ไม่ block การบันทึก invoice
      if (data.customer_name && data.customer_name.trim() !== "") {
        findOrCreateCustomer({
          customer_type: "company",
          name: data.customer_name,
          tax_id: data.customer_tax_id || undefined,
          branch_code: data.customer_branch_code || "00000",
          address: data.customer_address || undefined,
          contact_name: data.customer_contact || undefined,
          phone: data.customer_phone || undefined,
          email: data.customer_email || undefined,
        }).catch((err) => console.error("Failed to save customer:", err));
      }

      let result;
      // Use ref for immediate check (state might be stale due to race condition)
      const existingId = savedDocumentIdRef.current || savedDocumentId;
      if (existingId) {
        // Update existing auto-saved draft
        result = await updateInvoice(existingId, data, status);
      } else {
        // Prevent race condition - if already creating, wait for it
        if (isCreatingRef.current) {
          // Wait a bit and check again
          await new Promise(resolve => setTimeout(resolve, 500));
          if (savedDocumentIdRef.current) {
            result = await updateInvoice(savedDocumentIdRef.current, data, status);
          } else {
            return;
          }
        } else {
          // Create new invoice
          isCreatingRef.current = true;
          result = await createInvoice(data, status);
          if (result) {
            savedDocumentIdRef.current = result.id;
          }
          isCreatingRef.current = false;
        }
      }

      if (result) {
        toast({
          title: action === "save" ? "บันทึกร่างสำเร็จ" : "ออกใบกำกับภาษีสำเร็จ",
          description: `เลขที่: ${result.invoice_number}`,
        });

        if (action === "send") {
          // Redirect ไปหน้า preview เลย
          router.push(`/invoices/${result.id}/preview`);
        } else {
          // Draft: อยู่หน้าเดิม แค่ update document ID
          savedDocumentIdRef.current = result.id;
          setSavedDocumentId(result.id);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกใบกำกับภาษีได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting invoice:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบกำกับภาษีได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title={duplicateId ? "คัดลอกใบกำกับภาษี" : "สร้างใบกำกับภาษีใหม่"} />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={duplicateId ? "คัดลอกใบกำกับภาษี" : "สร้างใบกำกับภาษีใหม่"} />

      <div className="p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/invoices">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
        </div>

        {/* Form */}
        <InvoiceForm
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          isSubmitting={isSubmitting}
          initialData={initialData}
        />
      </div>

      {/* Share Dialog after issuing invoice */}
      {issuedInvoiceData && (
        <ShareDialog
          open={isShareDialogOpen}
          onOpenChange={(open) => {
            setIsShareDialogOpen(open);
            if (!open) {
              // When dialog closes, redirect to preview
              router.push(`/invoices/${issuedInvoiceData.id}/preview`);
            }
          }}
          documentType="invoice"
          documentId={issuedInvoiceData.id}
          documentNumber={issuedInvoiceData.invoice_number}
          documentStatus="issued"
          customerEmail={issuedInvoiceData.invoiceData?.customer_email || ""}
          documentData={issuedInvoiceData.invoiceData}
          documentItems={issuedInvoiceData.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            amount: item.amount,
          }))}
          companyData={companySettings ? {
            company_name: companySettings.company_name || "",
            company_name_en: companySettings.company_name_en || "",
            address: companySettings.address || "",
            phone: companySettings.phone || "",
            email: companySettings.email || "",
            tax_id: companySettings.tax_id || "",
            branch_code: companySettings.branch_code || "",
            branch_name: companySettings.branch_name || "",
            bank_name: companySettings.bank_name || "",
            bank_branch: companySettings.bank_branch || "",
            account_name: companySettings.account_name || "",
            account_number: companySettings.account_number || "",
          } : undefined}
        />
      )}
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div>
          <Header title="สร้างใบกำกับภาษีใหม่" />
          <div className="p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewInvoicePageContent />
    </Suspense>
  );
}
