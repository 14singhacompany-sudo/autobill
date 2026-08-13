"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ReceiptForm, type ReceiptFormData } from "@/components/forms/ReceiptForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useReceiptStore } from "@/stores/receiptStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useCompanyStore } from "@/stores/companyStore";
import { useToast } from "@/hooks/use-toast";
import { useBillingInvoiceStore } from "@/stores/billingInvoiceStore";
import { useQuotationStore } from "@/stores/quotationStore";
import { createClient } from "@/lib/supabase/client";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function NewReceiptPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const sourceBillingInvoiceId = searchParams.get("from_billing_invoice");
  const sourceQuotationId = searchParams.get("from_quotation");
  const { createReceipt, getReceipt, updateReceipt } = useReceiptStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings } = useCompanyStore();
  const { toast } = useToast();
  const { checkCanCreateDocument } = useSubscriptionStore();
  const { getBillingInvoice } = useBillingInvoiceStore();
  const { getQuotation } = useQuotationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!duplicateId || !!sourceBillingInvoiceId || !!sourceQuotationId);
  const [initialData, setInitialData] = useState<Partial<ReceiptFormData> | undefined>(undefined);
  const [savedDocumentId, setSavedDocumentId] = useState<string | undefined>(undefined);

  const isCreatingRef = useRef(false);
  const savedDocumentIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    fetchCompanySettings();
  }, [fetchCompanySettings]);

  useEffect(() => {
    if (companySettings?.vat_registered === true && companySettings.vat_verification_status === "verified") {
      const source = sourceBillingInvoiceId
        ? `?from_billing_invoice=${sourceBillingInvoiceId}`
        : sourceQuotationId ? `?from_quotation=${sourceQuotationId}` : "";
      router.replace(`/invoices/new${source}`);
    }
  }, [companySettings?.vat_registered, companySettings?.vat_verification_status, router, sourceBillingInvoiceId, sourceQuotationId]);

  useEffect(() => {
    const loadDuplicateData = async () => {
      if (!duplicateId) return;

      try {
        const result = await getReceipt(duplicateId);
        if (result) {
          const { receipt, items } = result;
          setInitialData({
            customer_name: receipt.customer_name || "",
            customer_address: receipt.customer_address || "",
            customer_tax_id: receipt.customer_tax_id || "",
            customer_branch_code: receipt.customer_branch_code ?? "00000",
            issue_date: getLocalDateString(),
            items: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent,
              price_includes_vat: item.price_includes_vat || false,
            })),
            vat_rate: receipt.vat_rate || 0,
            withholding_tax_rate: receipt.withholding_tax_rate || 0,
            customer_contact: receipt.customer_contact || "",
            customer_phone: receipt.customer_phone || "",
            customer_email: receipt.customer_email || "",
            discount_type: (receipt.discount_type as "fixed" | "percent") || "fixed",
            discount_value: receipt.discount_value || 0,
            discount1_type: (receipt.discount1_type || receipt.discount_type || "fixed") as "fixed" | "percent",
            discount1_value: receipt.discount1_value ?? receipt.discount_value ?? 0,
            discount2_type: (receipt.discount2_type || "fixed") as "fixed" | "percent",
            discount2_value: receipt.discount2_value ?? 0,
            notes: receipt.notes || "",
            payment_method: receipt.payment_method || "cash",
          });
        }
      } catch (error) {
        console.error("Error loading receipt for duplication:", error);
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
  }, [duplicateId, getReceipt, toast]);

  useEffect(() => {
    const loadPaidBillingInvoice = async () => {
      if (!sourceBillingInvoiceId) return;
      try {
        const supabase = createClient();
        const { data: existingTaxInvoice } = await supabase.from("invoices").select("id").eq("source_billing_invoice_id", sourceBillingInvoiceId).neq("status", "cancelled").maybeSingle();
        if (existingTaxInvoice) {
          router.replace(`/invoices/${existingTaxInvoice.id}/preview`);
          return;
        }
        const { data: existing } = await supabase.from("receipts").select("id").eq("source_billing_invoice_id", sourceBillingInvoiceId).neq("status", "cancelled").maybeSingle();
        if (existing) {
          router.replace(`/receipts/${existing.id}/preview`);
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
          items: items.map((item) => ({ description: item.description, quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, discount_percent: item.discount_percent, price_includes_vat: item.price_includes_vat })),
          vat_rate: billingInvoice.vat_rate || 0,
          withholding_tax_rate: billingInvoice.withholding_tax_rate || 0,
          discount_type: (billingInvoice.discount_type as "fixed" | "percent") || "fixed",
          discount_value: billingInvoice.discount_value || 0,
          discount1_type: (billingInvoice.discount1_type || billingInvoice.discount_type || "fixed") as "fixed" | "percent",
          discount1_value: billingInvoice.discount1_value ?? billingInvoice.discount_value ?? 0,
          discount2_type: (billingInvoice.discount2_type || "fixed") as "fixed" | "percent",
          discount2_value: billingInvoice.discount2_value ?? 0,
          notes: `รับชำระตามใบแจ้งหนี้ ${billingInvoice.invoice_number}`,
          payment_method: "transfer",
        });
      } catch (error) {
        console.error("Error loading paid billing invoice:", error);
        toast({ title: "ไม่สามารถสร้างใบเสร็จได้", description: "กรุณาตรวจสอบว่าใบแจ้งหนี้ถูกบันทึกว่าชำระแล้ว", variant: "destructive" });
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
        const { data: existing } = await supabase.from("receipts").select("id, status").eq("source_quotation_id", sourceQuotationId).neq("status", "cancelled").maybeSingle();
        if (existing) {
          router.replace(existing.status === "draft" ? `/receipts/${existing.id}/edit` : `/receipts/${existing.id}/preview`);
          return;
        }
        const result = await getQuotation(sourceQuotationId);
        if (!result) throw new Error("Quotation not found");
        const { quotation, items } = result;
        setInitialData({
          source_quotation_id: sourceQuotationId,
          customer_name: quotation.customer_name || "",
          customer_name_en: quotation.customer_name_en || "",
          customer_address: quotation.customer_address || "",
          customer_tax_id: quotation.customer_tax_id || "",
          customer_branch_code: quotation.customer_branch_code ?? "00000",
          customer_contact: quotation.customer_contact || "",
          customer_phone: quotation.customer_phone || "",
          customer_email: quotation.customer_email || "",
          issue_date: getLocalDateString(),
          items: items.map((item) => ({ description: item.description, quantity: item.quantity, unit: item.unit, unit_price: item.unit_price, discount_percent: item.discount_percent, price_includes_vat: item.price_includes_vat })),
          vat_rate: 0,
          withholding_tax_rate: quotation.withholding_tax_rate || 0,
          discount_type: (quotation.discount_type || "fixed") as "fixed" | "percent",
          discount_value: quotation.discount_value || 0,
          discount1_type: (quotation.discount1_type || quotation.discount_type || "fixed") as "fixed" | "percent",
          discount1_value: quotation.discount1_value ?? quotation.discount_value ?? 0,
          discount2_type: (quotation.discount2_type || "fixed") as "fixed" | "percent",
          discount2_value: quotation.discount2_value ?? 0,
          notes: `รับชำระตามใบเสนอราคา ${quotation.quotation_number}`,
          payment_method: "transfer",
        });
      } catch (error) {
        console.error("Error loading quotation for receipt:", error);
        toast({ title: "ไม่สามารถสร้างใบเสร็จได้", description: "ไม่สามารถโหลดข้อมูลใบเสนอราคา", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadQuotation();
  }, [getQuotation, router, sourceQuotationId, toast]);

  const linkSourceDocument = async (receiptId: string) => {
    if (!sourceBillingInvoiceId && !sourceQuotationId) return;
    const supabase = createClient();
    const { error } = await supabase.from("receipts").update({
      source_billing_invoice_id: sourceBillingInvoiceId || null,
      source_quotation_id: sourceQuotationId || null,
    }).eq("id", receiptId);
    if (error) console.error("Unable to repair receipt source link:", error);
  };

  const handleAutoSave = async (data: ReceiptFormData) => {
    try {
      if (savedDocumentIdRef.current) {
        const result = await updateReceipt(savedDocumentIdRef.current, data, "draft");
        if (result) {
          await linkSourceDocument(result.id);
          return { id: result.id, receipt_number: result.receipt_number };
        }
      } else {
        if (isCreatingRef.current) {
          return null;
        }

        isCreatingRef.current = true;
        const result = await createReceipt(data, "draft");
        if (result) {
          savedDocumentIdRef.current = result.id;
          setSavedDocumentId(result.id);
          isCreatingRef.current = false;
          await linkSourceDocument(result.id);
          return { id: result.id, receipt_number: result.receipt_number };
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
    data: ReceiptFormData,
    action: "save" | "send"
  ) => {
    setIsSubmitting(true);
    try {
      const status = action === "save" ? "draft" : "issued";

      if (status !== "draft" && !(await checkCanCreateDocument())) {
        toast({ title: "เกินจำนวนที่กำหนด", description: "คุณใช้จำนวนเอกสารครบตามแพ็กเกจแล้ว กรุณาอัปเกรดเพื่อใช้งานต่อ", variant: "destructive" });
        router.push("/pricing");
        return;
      }

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
        result = await updateReceipt(existingId, data, status);
      } else {
        if (isCreatingRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (savedDocumentIdRef.current) {
            result = await updateReceipt(savedDocumentIdRef.current, data, status);
          } else {
            return;
          }
        } else {
          isCreatingRef.current = true;
          result = await createReceipt(data, status);
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
          title: action === "save" ? "บันทึกร่างสำเร็จ" : "ออกใบเสร็จสำเร็จ",
          description: `เลขที่: ${result.receipt_number}`,
        });

        if (action === "send") {
          router.push(`/receipts/${result.id}/preview`);
        } else {
          savedDocumentIdRef.current = result.id;
          setSavedDocumentId(result.id);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกใบเสร็จได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting receipt:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบเสร็จได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (companySettings?.vat_registered === true && companySettings.vat_verification_status === "verified") {
    return (
      <div>
        <Header title="กำลังเปิดใบกำกับภาษี/ใบเสร็จรับเงิน" />
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <Header title={duplicateId ? "คัดลอกใบเสร็จ" : sourceBillingInvoiceId ? "ออกใบเสร็จจากใบแจ้งหนี้" : "สร้างใบเสร็จรับเงินใหม่"} />
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
      <Header title={duplicateId ? "คัดลอกใบเสร็จ" : sourceBillingInvoiceId ? "ออกใบเสร็จจากใบแจ้งหนี้" : "สร้างใบเสร็จรับเงินใหม่"} />

      <div className="p-6">
        <div className="mb-6">
          <Link href="/receipts">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
        </div>

        <ReceiptForm
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          isSubmitting={isSubmitting}
          initialData={initialData}
        />
      </div>
    </div>
  );
}

export default function NewReceiptPage() {
  return (
    <Suspense
      fallback={
        <div>
          <Header title="สร้างใบเสร็จรับเงินใหม่" />
          <div className="p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewReceiptPageContent />
    </Suspense>
  );
}
