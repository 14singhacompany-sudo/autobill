"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { InvoiceForm, type InvoiceFormData } from "@/components/forms/InvoiceForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { getInvoice, updateInvoice } = useInvoiceStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { checkCanCreateInvoice, fetchSubscription, fetchUsage } = useSubscriptionStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const id = params.id as string;

  // Fetch subscription and usage on mount
  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, [fetchSubscription, fetchUsage]);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const result = await getInvoice(id);
        if (result) {
          setInvoice(result.invoice);
          setItems(result.items);
        } else {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถโหลดข้อมูลใบกำกับภาษีได้",
            variant: "destructive",
          });
          router.push("/invoices");
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลใบกำกับภาษีได้",
          variant: "destructive",
        });
        router.push("/invoices");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id, router, toast, getInvoice]);

  const handleSubmit = async (
    data: InvoiceFormData,
    action: "save" | "send"
  ) => {
    setIsSubmitting(true);
    try {
      const status = action === "save" ? "draft" : "issued";

      // Check usage limit if changing from draft to non-draft
      if (invoice?.status === "draft" && status !== "draft") {
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

      const result = await updateInvoice(id, data, status);

      if (result) {
        toast({
          title: action === "save" ? "บันทึกสำเร็จ" : "ออกใบกำกับภาษีสำเร็จ",
          description: `เลขที่: ${result.invoice_number}`,
        });

        if (action === "send") {
          // รอให้ข้อมูลอัพเดทเสร็จก่อน redirect ไปหน้า preview
          await new Promise(resolve => setTimeout(resolve, 300));
          router.push(`/invoices/${result.id}/preview`);
        }
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกใบกำกับภาษีได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกใบกำกับภาษีได้",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-save handler for edit page
  const handleAutoSave = async (data: InvoiceFormData) => {
    try {
      const result = await updateInvoice(id, data, "draft");
      if (result) {
        return { id: result.id, invoice_number: result.invoice_number };
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
        <Header title="แก้ไขใบกำกับภาษี" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div>
        <Header title="แก้ไขใบกำกับภาษี" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground">ไม่พบข้อมูลใบกำกับภาษี</p>
          <Link href="/invoices">
            <Button variant="outline" className="mt-4">
              กลับไปหน้ารายการ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ตรวจสอบว่าเป็น draft หรือไม่ สำหรับ readOnly mode
  const isReadOnly = invoice.status !== "draft";

  // Prepare initial data for form
  const initialData: Partial<InvoiceFormData> = {
    // ข้อมูลบังคับตามกฎหมาย
    customer_name: invoice.customer_name || "",
    customer_name_en: invoice.customer_name_en || "",
    customer_address: invoice.customer_address || "",
    customer_tax_id: invoice.customer_tax_id || "",
    customer_branch_code: invoice.customer_branch_code || "00000",
    issue_date: invoice.issue_date || "",
    items: items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      price_includes_vat: item.price_includes_vat || false,
    })),
    vat_rate: invoice.vat_rate || 7,

    // ข้อมูลเพิ่มเติม
    customer_contact: invoice.customer_contact || "",
    customer_phone: invoice.customer_phone || "",
    customer_email: invoice.customer_email || "",
    due_date: invoice.due_date || "",
    discount_type: (invoice.discount_type as "fixed" | "percent") || "fixed",
    discount_value: invoice.discount_value || 0,
    notes: invoice.notes || "",
    terms_conditions: invoice.terms_conditions || "",
    sales_channel: invoice.sales_channel || "",
  };

  return (
    <div>
      <Header title={isReadOnly ? `ใบกำกับภาษี ${invoice.invoice_number}` : `แก้ไขใบกำกับภาษี ${invoice.invoice_number}`} />

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
          onSubmit={isReadOnly ? undefined : handleSubmit}
          onAutoSave={invoice.status === "draft" ? handleAutoSave : undefined}
          isSubmitting={isSubmitting}
          initialData={initialData}
          documentId={id}
          documentNumber={invoice.invoice_number}
          documentStatus={invoice.status}
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
