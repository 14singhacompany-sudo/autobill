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
  const { createReceipt, getReceipt, updateReceipt } = useReceiptStore();
  const { findOrCreateCustomer } = useCustomerStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings } = useCompanyStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!duplicateId);
  const [initialData, setInitialData] = useState<Partial<ReceiptFormData> | undefined>(undefined);
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
        const result = await getReceipt(duplicateId);
        if (result) {
          const { receipt, items } = result;
          setInitialData({
            customer_name: receipt.customer_name || "",
            customer_address: receipt.customer_address || "",
            customer_tax_id: receipt.customer_tax_id || "",
            customer_branch_code: receipt.customer_branch_code || "00000",
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
            customer_contact: receipt.customer_contact || "",
            customer_phone: receipt.customer_phone || "",
            customer_email: receipt.customer_email || "",
            discount_type: (receipt.discount_type as "fixed" | "percent") || "fixed",
            discount_value: receipt.discount_value || 0,
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

  const handleAutoSave = async (data: ReceiptFormData) => {
    try {
      if (savedDocumentIdRef.current) {
        const result = await updateReceipt(savedDocumentIdRef.current, data, "draft");
        if (result) {
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

  if (isLoading) {
    return (
      <div>
        <Header title={duplicateId ? "คัดลอกใบเสร็จ" : "สร้างใบเสร็จรับเงินใหม่"} />
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
      <Header title={duplicateId ? "คัดลอกใบเสร็จ" : "สร้างใบเสร็จรับเงินใหม่"} />

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
