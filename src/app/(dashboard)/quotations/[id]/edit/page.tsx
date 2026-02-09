"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { QuotationForm } from "@/components/forms/QuotationForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useQuotationStore, type QuotationFormData } from "@/stores/quotationStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { getQuotation, updateQuotationFull } = useQuotationStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { checkCanCreateQuotation, fetchSubscription, fetchUsage } = useSubscriptionStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const id = params.id as string;

  // Fetch subscription and usage on mount
  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, [fetchSubscription, fetchUsage]);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const result = await getQuotation(id);
        if (result) {
          setQuotation(result.quotation);
          setItems(result.items);
        } else {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถโหลดข้อมูลใบเสนอราคาได้",
            variant: "destructive",
          });
          router.push("/quotations");
        }
      } catch (error) {
        console.error("Error fetching quotation:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลใบเสนอราคาได้",
          variant: "destructive",
        });
        router.push("/quotations");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchQuotation();
    }
  }, [id, router, toast, getQuotation]);

  const handleSubmit = async (
    data: QuotationFormData,
    action: "save" | "send"
  ) => {
    console.log("[EditPage] handleSubmit called with action:", action);
    setIsSubmitting(true);
    try {
      const status = action === "save" ? "draft" : "sent";
      console.log("[EditPage] Will update with status:", status);

      // Check usage limit if changing from draft to non-draft
      if (quotation?.status === "draft" && status !== "draft") {
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

      // บันทึกข้อมูลลูกค้าลงในระบบ (ถ้ามีชื่อลูกค้า)
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

      console.log("[EditPage] Calling updateQuotationFull...");
      const result = await updateQuotationFull(id, data, status);
      console.log("[EditPage] updateQuotationFull result:", result);

      if (result) {
        toast({
          title: action === "save" ? "บันทึกสำเร็จ" : "ส่งใบเสนอราคาสำเร็จ",
          description: `เลขที่: ${result.quotation_number}`,
        });

        if (action === "send") {
          // รอให้ข้อมูลอัพเดทเสร็จก่อน redirect ไปหน้า preview
          await new Promise(resolve => setTimeout(resolve, 300));
          router.push(`/quotations/${result.id}/preview`);
        }
      } else {
        console.log("[EditPage] updateQuotationFull returned null!");
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกใบเสนอราคาได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[EditPage] Error updating quotation:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบเสนอราคาได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-save handler for edit page
  const handleAutoSave = async (data: QuotationFormData) => {
    try {
      const result = await updateQuotationFull(id, data, "draft");
      if (result) {
        return { id: result.id, quotation_number: result.quotation_number };
      }
      return null;
    } catch (error) {
      console.error("Auto-save error:", error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title="แก้ไขใบเสนอราคา" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div>
        <Header title="แก้ไขใบเสนอราคา" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">ไม่พบข้อมูลใบเสนอราคา</p>
          <Link href="/quotations">
            <Button variant="outline" className="mt-4">
              กลับไปหน้ารายการ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ตรวจสอบว่าเป็น draft หรือไม่ สำหรับ readOnly mode
  const isReadOnly = quotation.status !== "draft";

  // Prepare initial data for form
  const initialData: Partial<QuotationFormData> = {
    customer_name: quotation.customer_name || "",
    customer_name_en: quotation.customer_name_en || "",
    customer_address: quotation.customer_address || "",
    customer_tax_id: quotation.customer_tax_id || "",
    customer_branch_code: quotation.customer_branch_code || "00000",
    customer_contact: quotation.customer_contact || "",
    customer_phone: quotation.customer_phone || "",
    customer_email: quotation.customer_email || "",
    issue_date: quotation.issue_date || "",
    valid_until: quotation.valid_until || "",
    items: items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      price_includes_vat: item.price_includes_vat || false,
    })),
    vat_rate: quotation.vat_rate || 7,
    discount_type: (quotation.discount_type as "fixed" | "percent") || "fixed",
    discount_value: quotation.discount_value || 0,
    notes: quotation.notes || "",
    terms_conditions: quotation.terms_conditions || "",
    sales_channel: quotation.sales_channel || "",
  };

  return (
    <div>
      <Header title={isReadOnly ? `ใบเสนอราคา ${quotation.quotation_number}` : `แก้ไขใบเสนอราคา ${quotation.quotation_number}`} />

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
          onSubmit={isReadOnly ? undefined : handleSubmit}
          onAutoSave={quotation.status === "draft" ? handleAutoSave : undefined}
          isSubmitting={isSubmitting}
          initialData={initialData}
          documentId={id}
          documentNumber={quotation.quotation_number}
          documentStatus={quotation.status}
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
