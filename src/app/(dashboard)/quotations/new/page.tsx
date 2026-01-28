"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { QuotationForm } from "@/components/forms/QuotationForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuotationStore, type QuotationFormData } from "@/stores/quotationStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useToast } from "@/hooks/use-toast";

function NewQuotationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const { createQuotation, getQuotation } = useQuotationStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!duplicateId);
  const [initialData, setInitialData] = useState<Partial<QuotationFormData> | undefined>(undefined);

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
            issue_date: new Date().toISOString().split("T")[0], // วันที่ใหม่
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 วัน
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

  const handleSubmit = async (
    data: Parameters<NonNullable<React.ComponentProps<typeof QuotationForm>["onSubmit"]>>[0],
    action: "save" | "send"
  ) => {
    setIsSubmitting(true);
    try {
      const status = action === "save" ? "draft" : "pending";

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

      const quotation = await createQuotation(data, status);

      if (quotation) {
        toast({
          title: action === "save" ? "บันทึกร่างสำเร็จ" : "ส่งใบเสนอราคาสำเร็จ",
          description: `เลขที่: ${quotation.quotation_number}`,
        });
        // Redirect to the new quotation's preview page so user can see the new quotation number
        router.push(`/quotations/${quotation.id}/preview`);
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
          isSubmitting={isSubmitting}
          initialData={initialData}
        />
      </div>
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
