"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AIExtractor, type ExtractedCustomerData } from "@/components/ai/AIExtractor";
import { DocumentItemsTable } from "@/components/documents/DocumentItemsTable";
import { DocumentSummary } from "@/components/documents/DocumentSummary";
import { ShareDialog } from "@/components/documents/ShareDialog";
import { CustomerSearch } from "@/components/documents/CustomerSearch";
import { Plus, Save, Send, Eye, Loader2, Package, Search } from "lucide-react";
import Link from "next/link";
import { useProductStore, type Product } from "@/stores/productStore";
import { useCompanyStore } from "@/stores/companyStore";
import { formatCurrency } from "@/lib/utils";
import type { ExtractedItem, Customer } from "@/types/database";

interface DocumentItem extends ExtractedItem {
  id?: string;
  discount_percent?: number;
  price_includes_vat?: boolean;
}

export interface InvoiceFormData {
  // ข้อมูลบังคับตามกฎหมาย (มาตรา 86/4)
  customer_name: string;           // ชื่อผู้ซื้อ (บังคับ)
  customer_name_en?: string;       // ชื่อผู้ซื้อภาษาอังกฤษ (ไม่บังคับ)
  customer_address: string;        // ที่อยู่ผู้ซื้อ (บังคับ)
  customer_tax_id: string;         // เลขประจำตัวผู้เสียภาษี
  customer_branch_code: string;    // รหัสสาขา (00000 = สำนักงานใหญ่)
  issue_date: string;              // วันที่ออกเอกสาร (บังคับ)
  items: DocumentItem[];           // รายการสินค้า/บริการ (บังคับ)
  vat_rate: number;                // อัตรา VAT (บังคับ)

  // ข้อมูลเพิ่มเติม (ไม่บังคับ)
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  due_date: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  notes: string;
  terms_conditions: string;
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit?: (data: InvoiceFormData, action: "save" | "send") => Promise<void>;
  onAutoSave?: (data: InvoiceFormData) => Promise<{ id: string; invoice_number: string } | null>;
  isSubmitting?: boolean;
  documentId?: string;
  documentNumber?: string;
  documentStatus?: string;
  readOnly?: boolean;
}

export function InvoiceForm({
  initialData,
  onSubmit,
  onAutoSave,
  isSubmitting,
  documentId,
  documentNumber,
  documentStatus,
  readOnly = false,
}: InvoiceFormProps) {
  const { products, fetchProducts } = useProductStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings } = useCompanyStore();
  const activeProducts = products.filter((p) => p.active);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // Fetch products and company settings on mount
  useEffect(() => {
    fetchProducts();
    fetchCompanySettings();
  }, [fetchProducts, fetchCompanySettings]);

  // ฟังก์ชันสำหรับดึงวันที่ปัจจุบันใน format YYYY-MM-DD (local timezone)
  const getLocalDateString = (date?: Date) => {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // ฟังก์ชันคำนวณวันครบกำหนดชำระ
  const getDefaultDueDate = (issueDate?: string) => {
    const dueDays = companySettings?.iv_due_days ?? 0;
    if (dueDays === 0) {
      // ชำระทันที - ใช้วันเดียวกับวันที่ออก
      return issueDate || getLocalDateString();
    }
    // กำหนดเอง - บวกจำนวนวัน
    const baseDate = issueDate ? new Date(issueDate) : new Date();
    return getLocalDateString(new Date(baseDate.getTime() + dueDays * 24 * 60 * 60 * 1000));
  };

  const [formData, setFormData] = useState<InvoiceFormData>({
    // ข้อมูลบังคับตามกฎหมาย
    customer_name: "",
    customer_name_en: "",
    customer_address: "",
    customer_tax_id: "",
    customer_branch_code: "00000", // 00000 = สำนักงานใหญ่
    issue_date: getLocalDateString(),
    items: [],
    vat_rate: 7,

    // ข้อมูลเพิ่มเติม
    customer_contact: "",
    customer_phone: "",
    customer_email: "",
    due_date: getLocalDateString(), // default = วันเดียวกับวันที่ออก (ชำระทันที)
    discount_type: "fixed",
    discount_value: 0,
    notes: "",
    terms_conditions: "",
    ...initialData,
  });

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Auto-save state
  const [currentDocumentId, setCurrentDocumentId] = useState(documentId);
  const [currentDocumentNumber, setCurrentDocumentNumber] = useState(documentNumber);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);
  const isFirstRender = useRef(true);

  // Auto-save function with debounce
  const triggerAutoSave = useCallback(async () => {
    if (!onAutoSave || isSubmitting || isAutoSaving) return;
    if (!hasChangesRef.current) return;

    setIsAutoSaving(true);
    try {
      const result = await onAutoSave(formData);
      if (result) {
        setCurrentDocumentId(result.id);
        setCurrentDocumentNumber(result.invoice_number);
        setLastSavedAt(new Date());
        hasChangesRef.current = false;
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [formData, onAutoSave, isSubmitting, isAutoSaving]);

  // Watch for form changes and trigger auto-save
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Mark as having changes
    hasChangesRef.current = true;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      triggerAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, triggerAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Update due_date เมื่อ companySettings โหลดเสร็จ (เฉพาะเอกสารใหม่)
  useEffect(() => {
    if (companySettings && !initialData?.due_date) {
      setFormData(prev => ({
        ...prev,
        due_date: getDefaultDueDate(prev.issue_date),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companySettings]);

  const filteredProducts = activeProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const updateField = <K extends keyof InvoiceFormData>(
    field: K,
    value: InvoiceFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAIExtractedItems = (extractedItems: ExtractedItem[]) => {
    const newItems: DocumentItem[] = extractedItems.map((item) => ({
      ...item,
      discount_percent: 0,
    }));
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, ...newItems],
    }));
  };

  const handleAIExtractedCustomer = (customer: ExtractedCustomerData) => {
    setFormData((prev) => ({
      ...prev,
      customer_name: customer.customer_name || prev.customer_name,
      customer_address: customer.customer_address || prev.customer_address,
      customer_tax_id: customer.customer_tax_id || prev.customer_tax_id,
      customer_branch_code: customer.customer_branch_code || prev.customer_branch_code,
      customer_contact: customer.customer_contact || prev.customer_contact,
      customer_phone: customer.customer_phone || prev.customer_phone,
      customer_email: customer.customer_email || prev.customer_email,
    }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setFormData((prev) => ({
      ...prev,
      customer_name: customer.name || "",
      customer_address: customer.address || "",
      customer_tax_id: customer.tax_id || "",
      customer_branch_code: customer.branch_code || "00000",
      customer_contact: customer.contact_name || "",
      customer_phone: customer.phone || "",
      customer_email: customer.email || "",
    }));
  };

  const addEmptyItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: "",
          quantity: 1,
          unit: "ชิ้น",
          unit_price: 0,
          discount_percent: 0,
          price_includes_vat: false, // ค่าเริ่มต้น = ราคาไม่รวม VAT
        },
      ],
    }));
  };

  const addProductItem = (product: Product) => {
    // แสดงราคาเดียวกับที่ตั้งไว้ในหน้าสินค้า พร้อมเก็บสถานะ VAT
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: product.name,
          quantity: 1,
          unit: product.unit,
          unit_price: product.price,
          discount_percent: 0,
          price_includes_vat: product.price_includes_vat,
        },
      ],
    }));
    setIsProductDialogOpen(false);
    setProductSearch("");
  };

  const updateItem = (index: number, item: DocumentItem) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((i, idx) => (idx === index ? item : i)),
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Calculate totals
  const totals = useMemo(() => {
    // 1. คำนวณยอดรวมที่แสดง (ราคาตามที่ตั้งไว้ หลังหักส่วนลดรายการ)
    const displayTotal = formData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
      return sum + (itemTotal - itemDiscount);
    }, 0);

    // 2. คำนวณส่วนลดรวมจากยอดที่แสดง
    const discountAmount =
      formData.discount_type === "percent"
        ? displayTotal * (formData.discount_value / 100)
        : formData.discount_value;

    // 3. ยอดหลังหักส่วนลดรวม (ยังเป็นราคาที่แสดงอยู่)
    const displayAfterDiscount = displayTotal - discountAmount;

    // 4. คำนวณแยกตามประเภทราคา
    // สัดส่วนของยอดหลังหักส่วนลดต่อยอดรวม
    const discountRatio = displayTotal > 0 ? displayAfterDiscount / displayTotal : 1;

    // แยกคำนวณสินค้าที่รวม VAT และไม่รวม VAT
    let totalIncVat = 0; // ยอดรวมของสินค้าที่ราคารวม VAT แล้ว (หลังหักส่วนลด)
    let totalExcVat = 0; // ยอดรวมของสินค้าที่ราคาไม่รวม VAT (หลังหักส่วนลด)

    formData.items.forEach((item) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
      const itemAfterItemDiscount = itemTotal - itemDiscount;
      const itemAfterAllDiscount = itemAfterItemDiscount * discountRatio;

      if (item.price_includes_vat) {
        totalIncVat += itemAfterAllDiscount;
      } else {
        totalExcVat += itemAfterAllDiscount;
      }
    });

    // สินค้าที่รวม VAT: ยอดหลังหักส่วนลดคือยอดสุดท้าย แยก VAT ออกมา
    const amountBeforeVatFromIncVat = totalIncVat / (1 + formData.vat_rate / 100);
    const vatFromIncVat = totalIncVat - amountBeforeVatFromIncVat;

    // สินค้าที่ไม่รวม VAT: บวก VAT เพิ่ม
    const vatFromExcVat = totalExcVat * (formData.vat_rate / 100);

    const amountBeforeVat = amountBeforeVatFromIncVat + totalExcVat;
    const vatAmount = vatFromIncVat + vatFromExcVat;
    const totalAmount = totalIncVat + totalExcVat + vatFromExcVat;

    return {
      subtotal: displayTotal, // แสดงยอดรวมตามราคาที่ตั้งไว้
      discountAmount,
      amountBeforeVat,
      vatAmount,
      totalAmount,
    };
  }, [formData.items, formData.discount_type, formData.discount_value, formData.vat_rate]);

  const handleSubmit = async (action: "save" | "send") => {
    // Cancel any pending auto-save to prevent race condition
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    hasChangesRef.current = false; // Prevent auto-save from running

    if (onSubmit) {
      await onSubmit(formData, action);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer & Document Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ข้อมูลผู้ซื้อ (บังคับตามกฎหมาย) */}
        <Card>
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">ข้อมูลผู้ซื้อ</CardTitle>
            {!readOnly && <CustomerSearch onSelect={handleCustomerSelect} />}
          </CardHeader>
          <CardContent className="space-y-5">
            {/* ชื่อผู้ซื้อ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="customer_name" className="text-sm font-medium">
                  ชื่อผู้ซื้อ / บริษัท <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => updateField("customer_name", e.target.value)}
                  placeholder="ชื่อบริษัท หรือ ชื่อ-นามสกุล"
                  className="h-10"
                  required
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer_name_en" className="text-sm font-medium">
                  ชื่อภาษาอังกฤษ
                </Label>
                <Input
                  id="customer_name_en"
                  value={formData.customer_name_en || ""}
                  onChange={(e) => updateField("customer_name_en", e.target.value)}
                  placeholder="Customer name (optional)"
                  className="h-10"
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* ที่อยู่ */}
            <div className="space-y-1.5">
              <Label htmlFor="customer_address" className="text-sm font-medium">
                ที่อยู่ผู้ซื้อ <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="customer_address"
                value={formData.customer_address}
                onChange={(e) => updateField("customer_address", e.target.value)}
                placeholder="ที่อยู่สำหรับออกใบกำกับภาษี"
                rows={3}
                className="resize-none"
                required
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>

            {/* เลขประจำตัวผู้เสียภาษี + สาขา */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="customer_tax_id" className="text-sm font-medium">
                  เลขประจำตัวผู้เสียภาษี
                </Label>
                <Input
                  id="customer_tax_id"
                  value={formData.customer_tax_id}
                  onChange={(e) => updateField("customer_tax_id", e.target.value)}
                  placeholder="0-0000-00000-00-0"
                  className="h-10"
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">สถานประกอบการ</Label>
                <div className="flex items-center gap-4 h-10">
                  <label className={`flex items-center gap-2 text-sm ${readOnly ? "cursor-default" : "cursor-pointer"}`}>
                    <input
                      type="radio"
                      name="branch_type"
                      checked={formData.customer_branch_code === "00000"}
                      onChange={() => updateField("customer_branch_code", "00000")}
                      className="w-4 h-4 accent-primary"
                      disabled={readOnly}
                    />
                    <span>สำนักงานใหญ่</span>
                  </label>
                  <label className={`flex items-center gap-2 text-sm ${readOnly ? "cursor-default" : "cursor-pointer"}`}>
                    <input
                      type="radio"
                      name="branch_type"
                      checked={formData.customer_branch_code !== "00000"}
                      onChange={() => updateField("customer_branch_code", "")}
                      className="w-4 h-4 accent-primary"
                      disabled={readOnly}
                    />
                    <span>สาขา</span>
                  </label>
                  {formData.customer_branch_code !== "00000" && (
                    <Input
                      id="customer_branch_code"
                      value={formData.customer_branch_code}
                      onChange={(e) => updateField("customer_branch_code", e.target.value)}
                      placeholder="00001"
                      className="h-10 w-24"
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ข้อมูลติดต่อ */}
            <div className="pt-4 border-t border-dashed">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">ข้อมูลติดต่อ</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customer_contact" className="text-sm font-medium">ผู้ติดต่อ</Label>
                  <Input
                    id="customer_contact"
                    value={formData.customer_contact}
                    onChange={(e) => updateField("customer_contact", e.target.value)}
                    placeholder="ชื่อผู้ติดต่อ"
                    className="h-10"
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer_phone" className="text-sm font-medium">โทรศัพท์</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => updateField("customer_phone", e.target.value)}
                    placeholder="0xx-xxx-xxxx"
                    className="h-10"
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer_email" className="text-sm font-medium">อีเมล</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => updateField("customer_email", e.target.value)}
                    placeholder="email@example.com"
                    className="h-10"
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ข้อมูลเอกสาร */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">ข้อมูลเอกสาร</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* วันที่ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="issue_date" className="text-sm font-medium">
                  วันที่ออกใบกำกับภาษี <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => updateField("issue_date", e.target.value)}
                  className="h-10"
                  required
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due_date" className="text-sm font-medium">ครบกำหนดชำระ</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => updateField("due_date", e.target.value)}
                  className="h-10"
                  readOnly={readOnly}
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* หมายเหตุและเงื่อนไข */}
            <div className="pt-4 border-t border-dashed">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">หมายเหตุและเงื่อนไข</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-sm font-medium">หมายเหตุ</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม"
                    rows={3}
                    className="resize-none"
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="terms_conditions" className="text-sm font-medium">เงื่อนไข</Label>
                  <Textarea
                    id="terms_conditions"
                    value={formData.terms_conditions}
                    onChange={(e) => updateField("terms_conditions", e.target.value)}
                    placeholder="เงื่อนไขการชำระเงิน, การจัดส่ง ฯลฯ"
                    rows={3}
                    className="resize-none"
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Extractor - ซ่อนเมื่อ readOnly */}
      {!readOnly && (
        <AIExtractor
          onItemsExtracted={handleAIExtractedItems}
          onCustomerExtracted={handleAIExtractedCustomer}
        />
      )}

      {/* รายการสินค้า/บริการ (บังคับตามกฎหมาย) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">รายการสินค้า / บริการ {!readOnly && "(บังคับ)"}</CardTitle>
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProductDialogOpen(true)}
              >
                <Package className="h-4 w-4 mr-2" />
                เลือกจากรายการ
              </Button>
              <Button variant="outline" size="sm" onClick={addEmptyItem}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มรายการใหม่
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <DocumentItemsTable
            items={formData.items}
            onUpdate={readOnly ? undefined : updateItem}
            onRemove={readOnly ? undefined : removeItem}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex justify-end">
        <DocumentSummary
          subtotal={totals.subtotal}
          discountType={formData.discount_type}
          discountValue={formData.discount_value}
          discountAmount={totals.discountAmount}
          amountBeforeVat={totals.amountBeforeVat}
          vatRate={formData.vat_rate}
          vatAmount={totals.vatAmount}
          totalAmount={totals.totalAmount}
          onDiscountTypeChange={readOnly ? undefined : (type) => updateField("discount_type", type)}
          onDiscountValueChange={readOnly ? undefined : (value) => updateField("discount_value", value)}
          onVatRateChange={readOnly ? undefined : (rate) => updateField("vat_rate", rate)}
          readOnly={readOnly}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center gap-4 pt-4 border-t">
        {/* Auto-save status / Read-only notice */}
        <div className="text-sm text-muted-foreground">
          {readOnly ? (
            <span className="text-orange-600 font-medium">
              ใบกำกับภาษีที่ออกแล้ว - ไม่สามารถแก้ไขได้
            </span>
          ) : isAutoSaving ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              กำลังบันทึก...
            </span>
          ) : lastSavedAt ? (
            <span className="text-green-600">
              บันทึกอัตโนมัติเมื่อ {lastSavedAt.toLocaleTimeString("th-TH")}
            </span>
          ) : currentDocumentNumber ? (
            <span>เลขที่: {currentDocumentNumber}</span>
          ) : null}
        </div>

        <div className="flex gap-4">
          {readOnly ? (
            /* ReadOnly mode - แสดงเฉพาะปุ่มส่งออก */
            <>
              {currentDocumentId && (
                <Link href={`/invoices/${currentDocumentId}/preview`}>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    พรีวิว
                  </Button>
                </Link>
              )}
              <Button onClick={() => setIsShareDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                ส่งออกใบกำกับภาษี
              </Button>
            </>
          ) : (
            /* Normal mode - แสดงปุ่มทั้งหมด */
            <>
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleSubmit("save")}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                บันทึกร่าง
              </Button>
              {currentDocumentId && (
                <Link href={`/invoices/${currentDocumentId}/preview`}>
                  <Button variant="outline" disabled={isSubmitting}>
                    <Eye className="h-4 w-4 mr-2" />
                    พรีวิว
                  </Button>
                </Link>
              )}
              {/* ถ้าเป็น draft ให้กดออกใบกำกับ, ถ้าออกแล้วให้กดแชร์ */}
              {documentStatus === "draft" || !documentStatus ? (
                <Button disabled={isSubmitting} onClick={() => setIsConfirmDialogOpen(true)}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  ออกใบกำกับภาษี
                </Button>
              ) : (
                <Button disabled={isSubmitting} onClick={() => setIsShareDialogOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  แชร์ใบกำกับภาษี
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm Issue Invoice Dialog */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการออกใบกำกับภาษี</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>เมื่อออกใบกำกับภาษีแล้ว:</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li className="text-destructive font-medium">ไม่สามารถลบเอกสารได้</li>
                  <li>สามารถยกเลิกเอกสารได้เท่านั้น (เพื่อเก็บประวัติ)</li>
                  <li>เลขที่เอกสารจะถูกบันทึกถาวร</li>
                </ul>
                <p className="pt-2">คุณต้องการดำเนินการต่อหรือไม่?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsConfirmDialogOpen(false);
                handleSubmit("send");
              }}
            >
              ยืนยัน ออกใบกำกับภาษี
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        documentType="invoice"
        documentId={currentDocumentId}
        documentNumber={currentDocumentNumber}
        documentStatus={documentStatus}
        customerEmail={formData.customer_email}
        documentData={{
          invoice_number: currentDocumentNumber || "",
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          customer_name: formData.customer_name,
          customer_name_en: formData.customer_name_en,
          customer_address: formData.customer_address,
          customer_tax_id: formData.customer_tax_id,
          customer_branch_code: formData.customer_branch_code,
          customer_contact: formData.customer_contact,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          subtotal: totals.subtotal,
          discount_type: formData.discount_type,
          discount_value: formData.discount_value,
          discount_amount: totals.discountAmount,
          amount_before_vat: totals.amountBeforeVat,
          vat_rate: formData.vat_rate,
          vat_amount: totals.vatAmount,
          total_amount: totals.totalAmount,
          notes: formData.notes,
          terms_conditions: formData.terms_conditions,
        }}
        documentItems={formData.items.map((item) => {
          const itemTotal = item.quantity * item.unit_price;
          const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
          return {
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            amount: itemTotal - itemDiscount,
          };
        })}
        companyData={companySettings ? {
          company_name: companySettings.company_name,
          company_name_en: companySettings.company_name_en,
          address: companySettings.address,
          phone: companySettings.phone,
          email: companySettings.email,
          tax_id: companySettings.tax_id,
          branch_code: companySettings.branch_code,
          branch_name: companySettings.branch_name,
          bank_name: companySettings.bank_name,
          bank_branch: companySettings.bank_branch,
          account_name: companySettings.account_name,
          account_number: companySettings.account_number,
        } : undefined}
      />

      {/* Product Selection Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>เลือกสินค้า/บริการ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาสินค้า/บริการ..."
                className="pl-9"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            {/* Product List */}
            <div className="max-h-[400px] overflow-y-auto border rounded-lg divide-y">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>ไม่พบสินค้า/บริการ</p>
                  <p className="text-sm">ลองค้นหาด้วยคำอื่น หรือเพิ่มสินค้าใหม่ในหน้าสินค้า</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.code}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                    onClick={() => addProductItem(product)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded ${
                          product.type === "service"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.code} • {product.category} • {product.unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.price)}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.type === "service" ? "บริการ" : "สินค้า"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
