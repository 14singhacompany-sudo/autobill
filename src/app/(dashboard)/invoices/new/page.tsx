"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { InvoiceForm, type InvoiceFormData } from "@/components/forms/InvoiceForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useToast } from "@/hooks/use-toast";

function NewInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const { createInvoice, getInvoice } = useInvoiceStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!duplicateId);
  const [initialData, setInitialData] = useState<Partial<InvoiceFormData> | undefined>(undefined);

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
            issue_date: new Date().toISOString().split("T")[0], // วันที่ใหม่
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
            due_date: new Date().toISOString().split("T")[0],
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

  const handleSubmit = async (
    data: InvoiceFormData,
    action: "save" | "send"
  ) => {
    setIsSubmitting(true);
    try {
      const status = action === "save" ? "draft" : "issued";

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

      const result = await createInvoice(data, status);

      if (result) {
        toast({
          title: action === "save" ? "บันทึกร่างสำเร็จ" : "ออกใบกำกับภาษีสำเร็จ",
          description: `เลขที่: ${result.invoice_number}`,
        });
        // Redirect to the new invoice's preview page so user can see the new invoice number
        router.push(`/invoices/${result.id}/preview`);
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
