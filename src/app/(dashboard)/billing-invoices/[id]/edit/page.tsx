"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BillingInvoiceForm, type BillingInvoiceFormData } from "@/components/forms/BillingInvoiceForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useBillingInvoiceStore } from "@/stores/billingInvoiceStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useToast } from "@/hooks/use-toast";

export default function EditBillingInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { getBillingInvoice, updateBillingInvoice } = useBillingInvoiceStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<Partial<BillingInvoiceFormData> | undefined>(undefined);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceStatus, setInvoiceStatus] = useState<string>("draft");

  const id = params.id as string;

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const result = await getBillingInvoice(id);
        if (result) {
          const { billingInvoice, items } = result;
          setInvoiceNumber(billingInvoice.invoice_number);
          setInvoiceStatus(billingInvoice.status);
          setInitialData({
            customer_name: billingInvoice.customer_name || "",
            customer_name_en: billingInvoice.customer_name_en || "",
            customer_address: billingInvoice.customer_address || "",
            customer_tax_id: billingInvoice.customer_tax_id || "",
            customer_branch_code: billingInvoice.customer_branch_code || "00000",
            issue_date: billingInvoice.issue_date,
            due_date: billingInvoice.due_date,
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
            notes: billingInvoice.notes || "",
            payment_terms: billingInvoice.payment_terms || "ชำระภายใน 30 วัน",
          });
        } else {
          router.push("/billing-invoices");
        }
      } catch (error) {
        console.error("Error fetching billing invoice:", error);
        router.push("/billing-invoices");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchInvoiceData();
    }
  }, [id, router, getBillingInvoice]);

  const handleAutoSave = async (data: BillingInvoiceFormData) => {
    try {
      const result = await updateBillingInvoice(id, data, "draft");
      if (result) {
        return { id: result.id, invoice_number: result.invoice_number };
      }
      return null;
    } catch (error) {
      console.error("Auto-save error:", error);
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

      const result = await updateBillingInvoice(id, data, status);

      if (result) {
        toast({
          title: action === "save" ? "บันทึกร่างสำเร็จ" : "ออกใบแจ้งหนี้สำเร็จ",
          description: `เลขที่: ${result.invoice_number}`,
        });

        if (action === "send") {
          router.push(`/billing-invoices/${result.id}/preview`);
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
        <Header title="แก้ไขใบแจ้งหนี้" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  // If billing invoice is issued or paid, show read-only view
  const isReadOnly = invoiceStatus === "issued" || invoiceStatus === "paid" || invoiceStatus === "cancelled";

  return (
    <div>
      <Header title={isReadOnly ? `ใบแจ้งหนี้ ${invoiceNumber}` : "แก้ไขใบแจ้งหนี้"} />

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
          onSubmit={isReadOnly ? undefined : handleSubmit}
          onAutoSave={isReadOnly ? undefined : handleAutoSave}
          isSubmitting={isSubmitting}
          initialData={initialData}
          documentId={id}
          documentNumber={invoiceNumber}
          documentStatus={invoiceStatus}
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
