"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ReceiptForm, type ReceiptFormData } from "@/components/forms/ReceiptForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useReceiptStore } from "@/stores/receiptStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useToast } from "@/hooks/use-toast";

export default function EditReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const { getReceipt, updateReceipt } = useReceiptStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<Partial<ReceiptFormData> | undefined>(undefined);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [receiptStatus, setReceiptStatus] = useState<string>("draft");

  const id = params.id as string;

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        const result = await getReceipt(id);
        if (result) {
          const { receipt, items } = result;
          setReceiptNumber(receipt.receipt_number);
          setReceiptStatus(receipt.status);
          setInitialData({
            customer_name: receipt.customer_name || "",
            customer_name_en: receipt.customer_name_en || "",
            customer_address: receipt.customer_address || "",
            customer_tax_id: receipt.customer_tax_id || "",
            customer_branch_code: receipt.customer_branch_code || "00000",
            issue_date: receipt.issue_date,
            items: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent,
              price_includes_vat: item.price_includes_vat || false,
            })),
            vat_rate: receipt.vat_rate || 0,
            customer_contact: receipt.customer_contact || "",
            customer_phone: receipt.customer_phone || "",
            customer_email: receipt.customer_email || "",
            discount_type: (receipt.discount_type as "fixed" | "percent") || "fixed",
            discount_value: receipt.discount_value || 0,
            notes: receipt.notes || "",
            payment_method: receipt.payment_method || "cash",
            sales_channel: receipt.sales_channel || "",
          });
        } else {
          router.push("/receipts");
        }
      } catch (error) {
        console.error("Error fetching receipt:", error);
        router.push("/receipts");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchReceiptData();
    }
  }, [id, router, getReceipt]);

  const handleAutoSave = async (data: ReceiptFormData) => {
    try {
      const result = await updateReceipt(id, data, "draft");
      if (result) {
        return { id: result.id, receipt_number: result.receipt_number };
      }
      return null;
    } catch (error) {
      console.error("Auto-save error:", error);
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

      const result = await updateReceipt(id, data, status);

      if (result) {
        toast({
          title: action === "save" ? "บันทึกร่างสำเร็จ" : "ออกใบเสร็จสำเร็จ",
          description: `เลขที่: ${result.receipt_number}`,
        });

        if (action === "send") {
          router.push(`/receipts/${result.id}/preview`);
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

  if (isLoading) {
    return (
      <div>
        <Header title="แก้ไขใบเสร็จรับเงิน" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  // If receipt is issued, show read-only view
  const isReadOnly = receiptStatus === "issued" || receiptStatus === "cancelled";

  return (
    <div>
      <Header title={isReadOnly ? `ใบเสร็จ ${receiptNumber}` : "แก้ไขใบเสร็จรับเงิน"} />

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
          onSubmit={isReadOnly ? undefined : handleSubmit}
          onAutoSave={isReadOnly ? undefined : handleAutoSave}
          isSubmitting={isSubmitting}
          initialData={initialData}
          documentId={id}
          documentNumber={receiptNumber}
          documentStatus={receiptStatus}
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
