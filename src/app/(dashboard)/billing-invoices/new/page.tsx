"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BillingInvoiceForm, type BillingInvoiceFormData } from "@/components/forms/BillingInvoiceForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useBillingInvoiceStore } from "@/stores/billingInvoiceStore";
import { useQuotationStore } from "@/stores/quotationStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useCompanyStore } from "@/stores/companyStore";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultDueDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return getLocalDateString(d);
};

function NewBillingInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const sourceQuotationId = searchParams.get("from_quotation");
  const installmentIndex = Number(searchParams.get("installment") ?? "-1");
  const { createBillingInvoice, getBillingInvoice, updateBillingInvoice } = useBillingInvoiceStore();
  const { getQuotation } = useQuotationStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings } = useCompanyStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!duplicateId || !!sourceQuotationId);
  const [initialData, setInitialData] = useState<Partial<BillingInvoiceFormData> | undefined>(undefined);
  const [savedDocumentId, setSavedDocumentId] = useState<string | undefined>(undefined);

  const isCreatingRef = useRef(false);
  const savedDocumentIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    fetchCompanySettings();
  }, [fetchCompanySettings]);

  useEffect(() => {
    const loadDuplicateData = async () => {
      if (!duplicateId) return;

      try {
        const result = await getBillingInvoice(duplicateId);
        if (result) {
          const { billingInvoice, items } = result;
          setInitialData({
            customer_name: billingInvoice.customer_name || "",
            customer_address: billingInvoice.customer_address || "",
            customer_tax_id: billingInvoice.customer_tax_id || "",
            customer_branch_code: billingInvoice.customer_branch_code || "00000",
            issue_date: getLocalDateString(),
            due_date: getDefaultDueDate(),
            items: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent,
              price_includes_vat: item.price_includes_vat || false,
            })),
            vat_rate: billingInvoice.vat_rate || 7,
            customer_contact: billingInvoice.customer_contact || "",
            customer_phone: billingInvoice.customer_phone || "",
            customer_email: billingInvoice.customer_email || "",
            discount_type: (billingInvoice.discount_type as "fixed" | "percent") || "fixed",
            discount_value: billingInvoice.discount_value || 0,
            discount1_type: (billingInvoice.discount1_type || billingInvoice.discount_type || "fixed") as "fixed" | "percent",
            discount1_value: billingInvoice.discount1_value ?? billingInvoice.discount_value ?? 0,
            discount2_type: (billingInvoice.discount2_type || "fixed") as "fixed" | "percent",
            discount2_value: billingInvoice.discount2_value ?? 0,
            notes: billingInvoice.notes || "",
            payment_terms: billingInvoice.payment_terms || "ชำระภายใน 30 วัน",
          });
        }
      } catch (error) {
        console.error("Error loading billing invoice for duplication:", error);
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
  }, [duplicateId, getBillingInvoice, toast]);

  useEffect(() => {
    const loadQuotationInstallment = async () => {
      if (!sourceQuotationId || installmentIndex < 0) return;

      try {
        const supabase = createClient();
        const { data: existing } = await supabase
          .from("billing_invoices")
          .select("id, status")
          .eq("source_quotation_id", sourceQuotationId)
          .eq("source_installment_index", installmentIndex)
          .neq("status", "cancelled")
          .maybeSingle();
        if (existing) {
          router.replace(existing.status === "draft" ? `/billing-invoices/${existing.id}/edit` : `/billing-invoices/${existing.id}/preview`);
          return;
        }
        const result = await getQuotation(sourceQuotationId);
        const quotation = result?.quotation;
        const installment = quotation?.payment_installments?.[installmentIndex];
        if (!quotation || !installment) throw new Error("Installment not found");

        const installmentAmount = Number(quotation.total_amount || 0) * Number(installment.percent || 0) / 100;
        setInitialData({
          source_quotation_id: quotation.id,
          source_installment_index: installmentIndex,
          customer_name: quotation.customer_name || "",
          customer_name_en: quotation.customer_name_en || "",
          customer_address: quotation.customer_address || "",
          customer_tax_id: quotation.customer_tax_id || "",
          customer_branch_code: quotation.customer_branch_code || "00000",
          customer_contact: quotation.customer_contact || "",
          customer_phone: quotation.customer_phone || "",
          customer_email: quotation.customer_email || "",
          issue_date: getLocalDateString(),
          due_date: installment.due_date || getDefaultDueDate(),
          items: [{
            description: `${quotation.project_name ? `${quotation.project_name} - ` : ""}${installment.label} (${installment.percent}%)`,
            quantity: 1,
            unit: "งวด",
            unit_price: installmentAmount,
            discount_percent: 0,
            price_includes_vat: Number(quotation.vat_rate || 0) > 0,
          }],
          vat_rate: Number(quotation.vat_rate || 0),
          discount_type: "fixed",
          discount_value: 0,
          discount1_type: "fixed",
          discount1_value: 0,
          discount2_type: "fixed",
          discount2_value: 0,
          notes: `อ้างอิงใบเสนอราคา ${quotation.quotation_number}`,
          payment_terms: installment.due_date ? `ชำระภายในวันที่ ${installment.due_date}` : "ชำระภายใน 30 วัน",
        });
      } catch (error) {
        console.error("Error loading quotation installment:", error);
        toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถโหลดข้อมูลงวดงานได้", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    loadQuotationInstallment();
  }, [getQuotation, installmentIndex, router, sourceQuotationId, toast]);

  const handleAutoSave = async (data: BillingInvoiceFormData) => {
    try {
      if (savedDocumentIdRef.current) {
        const result = await updateBillingInvoice(savedDocumentIdRef.current, data, "draft");
        if (result) {
          return { id: result.id, invoice_number: result.invoice_number };
        }
      } else {
        if (isCreatingRef.current) {
          return null;
        }

        isCreatingRef.current = true;
        const result = await createBillingInvoice(data, "draft");
        if (result) {
          savedDocumentIdRef.current = result.id;
          setSavedDocumentId(result.id);
          return { id: result.id, invoice_number: result.invoice_number };
        }
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
    data: BillingInvoiceFormData,
    action: "save" | "send"
  ) => {
    setIsSubmitting(true);
    try {
      const status = action === "save" ? "draft" : "issued";

      // บันทึกข้อมูลลูกค้าลงในระบบ
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
      const existingId = savedDocumentIdRef.current || savedDocumentId;
      if (existingId) {
        result = await updateBillingInvoice(existingId, data, status);
      } else {
        if (isCreatingRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (savedDocumentIdRef.current) {
            result = await updateBillingInvoice(savedDocumentIdRef.current, data, status);
          } else {
            return;
          }
        } else {
          isCreatingRef.current = true;
          result = await createBillingInvoice(data, status);
          if (result) {
            savedDocumentIdRef.current = result.id;
          }
          isCreatingRef.current = false;
        }
      }

      if (result) {
        toast({
          title: action === "save" ? "บันทึกร่างสำเร็จ" : "ออกใบแจ้งหนี้สำเร็จ",
          description: `เลขที่: ${result.invoice_number}`,
        });

        if (action === "send") {
          router.push(`/billing-invoices/${result.id}/preview`);
        } else {
          savedDocumentIdRef.current = result.id;
          setSavedDocumentId(result.id);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกใบแจ้งหนี้ได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting billing invoice:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบแจ้งหนี้ได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title={duplicateId ? "คัดลอกใบแจ้งหนี้" : sourceQuotationId ? "สร้างใบแจ้งหนี้ตามงวด" : "สร้างใบแจ้งหนี้ใหม่"} />
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
      <Header title={duplicateId ? "คัดลอกใบแจ้งหนี้" : sourceQuotationId ? "สร้างใบแจ้งหนี้ตามงวด" : "สร้างใบแจ้งหนี้ใหม่"} />

      <div className="p-6">
        <div className="mb-6">
          <Link href="/billing-invoices">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
        </div>

        <BillingInvoiceForm
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          isSubmitting={isSubmitting}
          initialData={initialData}
        />
      </div>
    </div>
  );
}

export default function NewBillingInvoicePage() {
  return (
    <Suspense
      fallback={
        <div>
          <Header title="สร้างใบแจ้งหนี้ใหม่" />
          <div className="p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewBillingInvoicePageContent />
    </Suspense>
  );
}
