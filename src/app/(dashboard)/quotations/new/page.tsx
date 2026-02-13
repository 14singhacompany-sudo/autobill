"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { QuotationForm } from "@/components/forms/QuotationForm";
import { ShareDialog } from "@/components/documents/ShareDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuotationStore, type QuotationFormData } from "@/stores/quotationStore";
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

function NewQuotationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const { createQuotation, getQuotation, updateQuotationFull } = useQuotationStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { checkCanCreateQuotation, fetchSubscription, fetchUsage } = useSubscriptionStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings } = useCompanyStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!duplicateId);
  const [initialData, setInitialData] = useState<Partial<QuotationFormData> | undefined>(undefined);
  const [savedDocumentId, setSavedDocumentId] = useState<string | undefined>(undefined);

  // Ref to prevent race condition when creating quotation
  const isCreatingRef = useRef(false);
  const savedDocumentIdRef = useRef<string | undefined>(undefined);

  // Share dialog state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [sentQuotationData, setSentQuotationData] = useState<{
    id: string;
    quotation_number: string;
    quotationData: any;
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
        const result = await getQuotation(duplicateId);
        if (result) {
          const { quotation, items } = result;
          setInitialData({
            customer_name: quotation.customer_name || "",
            customer_address: quotation.customer_address || "",
            customer_tax_id: quotation.customer_tax_id || "",
            customer_contact: quotation.customer_contact || "",
            customer_phone: quotation.customer_phone || "",
            customer_email: quotation.customer_email || "",
            issue_date: getLocalDateString(), // วันที่ใหม่ (local timezone)
            valid_until: getLocalDateString(new Date(Date.now() + (companySettings?.qt_validity_days || 30) * 24 * 60 * 60 * 1000)), // ใช้ค่าจากการตั้งค่า
            items: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent,
              price_includes_vat: false,
            })),
            vat_rate: quotation.vat_rate || 7,
            discount_type: (quotation.discount_type as "fixed" | "percent") || "fixed",
            discount_value: quotation.discount_value || 0,
            notes: quotation.notes || "",
            terms_conditions: quotation.terms_conditions || "",
          });
        }
      } catch (error) {
        console.error("Error loading quotation for duplication:", error);
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
  }, [duplicateId, getQuotation, toast]);

  // Auto-save handler with race condition protection
  const handleAutoSave = async (data: QuotationFormData) => {
    try {
      // Use ref for immediate check (state might be stale)
      if (savedDocumentIdRef.current) {
        // Update existing draft
        const result = await updateQuotationFull(savedDocumentIdRef.current, data, "draft");
        if (result) {
          return { id: result.id, quotation_number: result.quotation_number };
        }
      } else {
        // Prevent race condition - if already creating, skip
        if (isCreatingRef.current) {
          return null;
        }

        // Mark as creating
        isCreatingRef.current = true;

        // Create new draft
        const result = await createQuotation(data, "draft");
        if (result) {
          savedDocumentIdRef.current = result.id;
          setSavedDocumentId(result.id);
          return { id: result.id, quotation_number: result.quotation_number };
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
    data: Parameters<NonNullable<React.ComponentProps<typeof QuotationForm>["onSubmit"]>>[0],
    action: "save" | "send"
  ) => {
    setIsSubmitting(true);
    try {
      const status = action === "save" ? "draft" : "pending";

      // Check usage limit if not saving as draft
      if (status !== "draft") {
        const canCreate = await checkCanCreateQuotation();
        if (!canCreate) {
          toast({
            title: "เกินจำนวนที่กำหนด",
            description: "คุณใช้จำนวนใบเสนอราคาครบตามแพ็คเกจแล้ว กรุณาอัพเกรดเพื่อใช้งานต่อ",
            variant: "destructive",
          });
          router.push("/pricing");
          return;
        }
      }

      // บันทึกข้อมูลลูกค้าลงในระบบ (ถ้ามีชื่อลูกค้า) - ทำ background ไม่ block การบันทึก quotation
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

      let quotation;
      // Use ref for immediate check (state might be stale due to race condition)
      const existingId = savedDocumentIdRef.current || savedDocumentId;
      if (existingId) {
        // Update existing auto-saved draft
        quotation = await updateQuotationFull(existingId, data, status);
      } else {
        // Prevent race condition - if already creating, wait for it
        if (isCreatingRef.current) {
          // Wait a bit and check again
          await new Promise(resolve => setTimeout(resolve, 500));
          if (savedDocumentIdRef.current) {
            quotation = await updateQuotationFull(savedDocumentIdRef.current, data, status);
          } else {
            return;
          }
        } else {
          // Create new quotation
          isCreatingRef.current = true;
          quotation = await createQuotation(data, status);
          if (quotation) {
            savedDocumentIdRef.current = quotation.id;
          }
          isCreatingRef.current = false;
        }
      }

      if (quotation) {
        toast({
          title: action === "save" ? "บันทึกร่างสำเร็จ" : "ส่งใบเสนอราคาสำเร็จ",
          description: `เลขที่: ${quotation.quotation_number}`,
        });

        if (action === "send") {
          // Redirect ไปหน้า preview เลย
          router.push(`/quotations/${quotation.id}/preview`);
        } else {
          // Draft: อยู่หน้าเดิม แค่ update document ID
          savedDocumentIdRef.current = quotation.id;
          setSavedDocumentId(quotation.id);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกใบเสนอราคาได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting quotation:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบเสนอราคาได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title={duplicateId ? "คัดลอกใบเสนอราคา" : "สร้างใบเสนอราคาใหม่"} />
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
      <Header title={duplicateId ? "คัดลอกใบเสนอราคา" : "สร้างใบเสนอราคาใหม่"} />

      <div className="p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/quotations">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
        </div>

        {/* Form */}
        <QuotationForm
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          isSubmitting={isSubmitting}
          initialData={initialData}
        />
      </div>

      {/* Share Dialog after sending quotation */}
      {sentQuotationData && (
        <ShareDialog
          open={isShareDialogOpen}
          onOpenChange={(open) => {
            setIsShareDialogOpen(open);
            if (!open) {
              // When dialog closes, redirect to preview
              router.push(`/quotations/${sentQuotationData.id}/preview`);
            }
          }}
          documentType="quotation"
          documentId={sentQuotationData.id}
          documentNumber={sentQuotationData.quotation_number}
          documentStatus="sent"
          customerEmail={sentQuotationData.quotationData?.customer_email || ""}
          documentData={sentQuotationData.quotationData}
          documentItems={sentQuotationData.items.map((item) => ({
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

export default function NewQuotationPage() {
  return (
    <Suspense
      fallback={
        <div>
          <Header title="สร้างใบเสนอราคาใหม่" />
          <div className="p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewQuotationPageContent />
    </Suspense>
  );
}
