"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { InvoiceForm, type InvoiceFormData } from "@/components/forms/InvoiceForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useCompanyStore } from "@/stores/companyStore";
import { useToast } from "@/hooks/use-toast";
import { useBillingInvoiceStore } from "@/stores/billingInvoiceStore";
import { useQuotationStore } from "@/stores/quotationStore";
import { createClient } from "@/lib/supabase/client";

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
  const sourceBillingInvoiceId = searchParams.get("from_billing_invoice");
  const sourceQuotationId = searchParams.get("from_quotation");
  const { createInvoice, getInvoice, updateInvoice } = useInvoiceStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { checkCanCreateInvoice, fetchSubscription, fetchUsage } = useSubscriptionStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings, isLoading: isCompanyLoading } = useCompanyStore();
  const { toast } = useToast();
  const { getBillingInvoice } = useBillingInvoiceStore();
  const { getQuotation } = useQuotationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!duplicateId || !!sourceBillingInvoiceId || !!sourceQuotationId);
  const [initialData, setInitialData] = useState<Partial<InvoiceFormData> | undefined>(undefined);
  const [savedDocumentId, setSavedDocumentId] = useState<string | undefined>(undefined);

  // Ref to prevent race condition when creating invoice
  const isCreatingRef = useRef(false);
  const savedDocumentIdRef = useRef<string | undefined>(undefined);


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
            customer_branch_code: invoice.customer_branch_code ?? "00000",
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
            withholding_tax_rate: invoice.withholding_tax_rate || 0,
            customer_contact: invoice.customer_contact || "",
            customer_phone: invoice.customer_phone || "",
            customer_email: invoice.customer_email || "",
            due_date: getDueDateFromSettings(getLocalDateString(), companySettings?.iv_due_days ?? 0),
            discount_type: (invoice.discount_type as "fixed" | "percent") || "fixed",
            discount_value: invoice.discount_value || 0,
            discount1_type: (invoice.discount1_type || invoice.discount_type || "fixed") as "fixed" | "percent",
            discount1_value: invoice.discount1_value ?? invoice.discount_value ?? 0,
            discount2_type: (invoice.discount2_type || "fixed") as "fixed" | "percent",
            discount2_value: invoice.discount2_value ?? 0,
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

  useEffect(() => {
    const loadPaidBillingInvoice = async () => {
      if (!sourceBillingInvoiceId) return;
      try {
        const supabase = createClient();
        const { data: existingReceipt } = await supabase.from("receipts").select("id").eq("source_billing_invoice_id", sourceBillingInvoiceId).neq("status", "cancelled").maybeSingle();
        if (existingReceipt) {
          router.replace(`/receipts/${existingReceipt.id}/preview`);
          return;
        }
        const { data: existing } = await supabase.from("invoices").select("id").eq("source_billing_invoice_id", sourceBillingInvoiceId).neq("status", "cancelled").maybeSingle();
        if (existing) {
          router.replace(`/invoices/${existing.id}/preview`);
          return;
        }
        const result = await getBillingInvoice(sourceBillingInvoiceId);
        if (!result || result.billingInvoice.status !== "paid") throw new Error("Billing invoice is not paid");
        const { billingInvoice, items } = result;
        setInitialData({
          source_billing_invoice_id: sourceBillingInvoiceId,
          customer_name: billingInvoice.customer_name || "",
          customer_name_en: billingInvoice.customer_name_en || "",
          customer_address: billingInvoice.customer_address || "",
          customer_tax_id: billingInvoice.customer_tax_id || "",
          customer_branch_code: billingInvoice.customer_branch_code ?? "00000",
          customer_contact: billingInvoice.customer_contact || "",
          customer_phone: billingInvoice.customer_phone || "",
          customer_email: billingInvoice.customer_email || "",
          issue_date: getLocalDateString(),
          due_date: getLocalDateString(),
          items: items.map((item) => ({ description: item.description, quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, discount_percent: item.discount_percent, price_includes_vat: item.price_includes_vat })),
          vat_rate: billingInvoice.vat_rate || 7,
          withholding_tax_rate: billingInvoice.withholding_tax_rate || 0,
          discount_type: (billingInvoice.discount_type as "fixed" | "percent") || "fixed",
          discount_value: billingInvoice.discount_value || 0,
          discount1_type: (billingInvoice.discount1_type || billingInvoice.discount_type || "fixed") as "fixed" | "percent",
          discount1_value: billingInvoice.discount1_value ?? billingInvoice.discount_value ?? 0,
          discount2_type: (billingInvoice.discount2_type || "fixed") as "fixed" | "percent",
          discount2_value: billingInvoice.discount2_value ?? 0,
          notes: `รับชำระตามใบแจ้งหนี้ ${billingInvoice.invoice_number}`,
          terms_conditions: "รับชำระเงินเรียบร้อยแล้ว",
        });
      } catch (error) {
        console.error("Error loading paid billing invoice:", error);
        toast({ title: "ไม่สามารถสร้างใบกำกับภาษีได้", description: "กรุณาตรวจสอบสถานะ VAT และการชำระใบแจ้งหนี้", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadPaidBillingInvoice();
  }, [getBillingInvoice, router, sourceBillingInvoiceId, toast]);

  useEffect(() => {
    const loadQuotation = async () => {
      if (!sourceQuotationId) return;
      try {
        const supabase = createClient();
        const { data: existing } = await supabase.from("invoices").select("id, status").eq("quotation_id", sourceQuotationId).neq("status", "cancelled").maybeSingle();
        if (existing) {
          router.replace(existing.status === "draft" ? `/invoices/${existing.id}/edit` : `/invoices/${existing.id}/preview`);
          return;
        }
        const result = await getQuotation(sourceQuotationId);
        if (!result) throw new Error("Quotation not found");
        const { quotation, items } = result;
        setInitialData({
          quotation_id: sourceQuotationId,
          customer_name: quotation.customer_name || "",
          customer_name_en: quotation.customer_name_en || "",
          customer_address: quotation.customer_address || "",
          customer_tax_id: quotation.customer_tax_id || "",
          customer_branch_code: quotation.customer_branch_code ?? "00000",
          customer_contact: quotation.customer_contact || "",
          customer_phone: quotation.customer_phone || "",
          customer_email: quotation.customer_email || "",
          issue_date: getLocalDateString(),
          due_date: getLocalDateString(),
          items: items.map((item) => ({ description: item.description, quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, discount_percent: item.discount_percent, price_includes_vat: item.price_includes_vat })),
          vat_rate: quotation.vat_rate || 7,
          withholding_tax_rate: quotation.withholding_tax_rate || 0,
          discount_type: (quotation.discount_type || "fixed") as "fixed" | "percent",
          discount_value: quotation.discount_value || 0,
          discount1_type: (quotation.discount1_type || quotation.discount_type || "fixed") as "fixed" | "percent",
          discount1_value: quotation.discount1_value ?? quotation.discount_value ?? 0,
          discount2_type: (quotation.discount2_type || "fixed") as "fixed" | "percent",
          discount2_value: quotation.discount2_value ?? 0,
          notes: `รับชำระตามใบเสนอราคา ${quotation.quotation_number}`,
          terms_conditions: "รับชำระเงินเรียบร้อยแล้ว",
        });
      } catch (error) {
        console.error("Error loading quotation for tax invoice:", error);
        toast({ title: "ไม่สามารถสร้างใบกำกับภาษีได้", description: "ไม่สามารถโหลดข้อมูลใบเสนอราคา", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadQuotation();
  }, [getQuotation, router, sourceQuotationId, toast]);

  const linkSourceDocument = async (invoiceId: string) => {
    if (!sourceBillingInvoiceId && !sourceQuotationId) return;
    const supabase = createClient();
    const { error } = await supabase.from("invoices").update({
      source_billing_invoice_id: sourceBillingInvoiceId || null,
      quotation_id: sourceQuotationId || null,
    }).eq("id", invoiceId);
    if (error) console.error("Unable to repair invoice source link:", error);
  };

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
          isCreatingRef.current = false;
          await linkSourceDocument(result.id);
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
        savedDocumentIdRef.current = result.id;
        await linkSourceDocument(result.id);
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
        <Header title={duplicateId ? "คัดลอกใบกำกับภาษี" : sourceBillingInvoiceId ? "ออกใบกำกับภาษีจากใบแจ้งหนี้" : "สร้างใบกำกับภาษีใหม่"} />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isCompanyLoading && (
    companySettings?.vat_registered !== true || companySettings.vat_verification_status !== "verified"
  )) {
    return (
      <div>
        <Header title="สร้างใบกำกับภาษีใหม่" />
        <div className="mx-auto max-w-2xl p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-600" />
            <h2 className="text-lg font-semibold">ยังไม่สามารถออกใบกำกับภาษีได้</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ใบกำกับภาษีออกได้เฉพาะผู้ประกอบการที่จด VAT และผ่านการตรวจ ภ.พ.20 แล้ว กรุณากรอกข้อมูลและส่งเอกสารในหน้าตั้งค่า
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/receipts")}>ไปที่ใบเสร็จรับเงิน</Button>
              <Button onClick={() => router.push("/settings")}>ตั้งค่าข้อมูลกิจการ</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={duplicateId ? "คัดลอกใบกำกับภาษี" : sourceBillingInvoiceId ? "ออกใบกำกับภาษีจากใบแจ้งหนี้" : "สร้างใบกำกับภาษีใหม่"} />

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
