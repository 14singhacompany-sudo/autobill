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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIExtractor, type ExtractedCustomerData } from "@/components/ai/AIExtractor";
import { DocumentItemsTable } from "@/components/documents/DocumentItemsTable";
import { DocumentSummary } from "@/components/documents/DocumentSummary";
import { CustomerSearch } from "@/components/documents/CustomerSearch";
import { Plus, Save, Send, Eye, Loader2, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProductStore, type Product } from "@/stores/productStore";
import { useCompanyStore } from "@/stores/companyStore";
import { useToast } from "@/hooks/use-toast";
import type { ExtractedItem, Customer } from "@/types/database";

interface DocumentItem extends ExtractedItem {
  id?: string;
  discount_percent?: number;
  price_includes_vat?: boolean;
}

export interface ReceiptFormData {
  customer_name: string;
  customer_name_en?: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
  issue_date: string;
  items: DocumentItem[];
  vat_rate: number;
  discount_type: "fixed" | "percent";
  discount_value: number;
  notes: string;
  payment_method: string;
  sales_channel?: string;
}

interface ReceiptFormProps {
  initialData?: Partial<ReceiptFormData>;
  onSubmit?: (data: ReceiptFormData, action: "save" | "send") => Promise<void>;
  onAutoSave?: (data: ReceiptFormData) => Promise<{ id: string; receipt_number: string } | null>;
  isSubmitting?: boolean;
  documentId?: string;
  documentNumber?: string;
  documentStatus?: string;
  readOnly?: boolean;
}

export function ReceiptForm({
  initialData,
  onSubmit,
  onAutoSave,
  isSubmitting,
  documentId,
  documentNumber,
  documentStatus,
  readOnly = false,
}: ReceiptFormProps) {
  const router = useRouter();
  const { products, fetchProducts } = useProductStore();
  const { settings: companySettings, fetchSettings: fetchCompanySettings } = useCompanyStore();
  const { toast } = useToast();
  const activeProducts = products.filter((p) => p.active);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCompanySettings();
  }, [fetchProducts, fetchCompanySettings]);

  const getLocalDateString = (date?: Date) => {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<ReceiptFormData>({
    customer_name: "",
    customer_name_en: "",
    customer_address: "",
    customer_tax_id: "",
    customer_branch_code: "00000",
    customer_contact: "",
    customer_phone: "",
    customer_email: "",
    issue_date: getLocalDateString(),
    items: [],
    vat_rate: 0, // ใบเสร็จรับเงินไม่มี VAT เป็นค่าเริ่มต้น
    discount_type: "fixed",
    discount_value: 0,
    notes: "",
    payment_method: "cash",
    sales_channel: "",
    ...initialData,
  });

  const initialDataLoadedRef = useRef(false);
  const lastDocumentIdRef = useRef(documentId);

  useEffect(() => {
    if (documentId !== lastDocumentIdRef.current) {
      initialDataLoadedRef.current = false;
      lastDocumentIdRef.current = documentId;
    }

    if (initialData && !initialDataLoadedRef.current) {
      initialDataLoadedRef.current = true;
      setFormData({
        customer_name: initialData.customer_name || "",
        customer_name_en: initialData.customer_name_en || "",
        customer_address: initialData.customer_address || "",
        customer_tax_id: initialData.customer_tax_id || "",
        customer_branch_code: initialData.customer_branch_code || "00000",
        customer_contact: initialData.customer_contact || "",
        customer_phone: initialData.customer_phone || "",
        customer_email: initialData.customer_email || "",
        issue_date: initialData.issue_date || getLocalDateString(),
        items: initialData.items || [],
        vat_rate: initialData.vat_rate ?? 0,
        discount_type: initialData.discount_type || "fixed",
        discount_value: initialData.discount_value ?? 0,
        notes: initialData.notes || "",
        payment_method: initialData.payment_method || "cash",
        sales_channel: initialData.sales_channel || "",
      });
      isFirstRender.current = true;
    }
  }, [initialData, documentId]);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const salesChannelOptions = [
    { value: "shopee", label: "Shopee", color: "bg-orange-500" },
    { value: "lazada", label: "Lazada", color: "bg-purple-600" },
    { value: "facebook", label: "Facebook", color: "bg-blue-500" },
    { value: "tiktok", label: "TikTok", color: "bg-black" },
    { value: "line", label: "Line", color: "bg-green-500" },
    { value: "other", label: "อื่นๆ", color: "bg-gray-400" },
  ];

  const paymentMethodOptions = [
    { value: "cash", label: "เงินสด" },
    { value: "transfer", label: "โอนเงิน" },
    { value: "credit_card", label: "บัตรเครดิต" },
    { value: "qr_code", label: "QR Code" },
    { value: "check", label: "เช็ค" },
    { value: "other", label: "อื่นๆ" },
  ];

  const isCustomSalesChannel = formData.sales_channel &&
    !salesChannelOptions.some(opt => opt.value === formData.sales_channel) &&
    formData.sales_channel !== "";

  const [showCustomChannel, setShowCustomChannel] = useState(isCustomSalesChannel);

  // Auto-save state
  const [currentDocumentId, setCurrentDocumentId] = useState(documentId);
  const [currentDocumentNumber, setCurrentDocumentNumber] = useState(documentNumber);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);
  const isFirstRender = useRef(true);

  const triggerAutoSave = useCallback(async () => {
    if (!onAutoSave || isSubmitting || isAutoSaving) return;
    if (!hasChangesRef.current) return;

    const hasCustomerName = formData.customer_name && formData.customer_name.trim() !== "";
    const hasValidItems = formData.items.some(
      (item) => item.description && item.description.trim() !== ""
    );
    if (!hasCustomerName || !hasValidItems) return;

    setIsAutoSaving(true);
    try {
      const result = await onAutoSave(formData);
      if (result) {
        setCurrentDocumentId(result.id);
        setCurrentDocumentNumber(result.receipt_number);
        setLastSavedAt(new Date());
        hasChangesRef.current = false;
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [formData, onAutoSave, isSubmitting, isAutoSaving]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    hasChangesRef.current = true;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      triggerAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, triggerAutoSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const filteredProducts = activeProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const updateField = <K extends keyof ReceiptFormData>(
    field: K,
    value: ReceiptFormData[K]
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
          price_includes_vat: false,
        },
      ],
    }));
  };

  const addProductItem = (product: Product) => {
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
    const displayTotal = formData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemDiscount = itemTotal * ((item.discount_percent || 0) / 100);
      return sum + (itemTotal - itemDiscount);
    }, 0);

    const discountAmount =
      formData.discount_type === "percent"
        ? displayTotal * (formData.discount_value / 100)
        : formData.discount_value;

    const displayAfterDiscount = displayTotal - discountAmount;
    const discountRatio = displayTotal > 0 ? displayAfterDiscount / displayTotal : 1;

    let totalIncVat = 0;
    let totalExcVat = 0;

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

    const amountBeforeVatFromIncVat = totalIncVat / (1 + formData.vat_rate / 100);
    const vatFromIncVat = totalIncVat - amountBeforeVatFromIncVat;
    const vatFromExcVat = totalExcVat * (formData.vat_rate / 100);

    const amountBeforeVat = amountBeforeVatFromIncVat + totalExcVat;
    const vatAmount = vatFromIncVat + vatFromExcVat;
    const totalAmount = totalIncVat + totalExcVat + vatFromExcVat;

    return {
      subtotal: displayTotal,
      discountAmount,
      amountBeforeVat,
      vatAmount,
      totalAmount,
    };
  }, [formData.items, formData.discount_type, formData.discount_value, formData.vat_rate]);

  const handleSubmit = async (action: "save" | "send") => {
    if (action === "send") {
      if (!formData.customer_name || formData.customer_name.trim() === "") {
        toast({
          title: "กรุณากรอกข้อมูลให้ครบ",
          description: "กรุณาระบุชื่อผู้ซื้อก่อนออกใบเสร็จ",
          variant: "destructive",
        });
        return;
      }

      const validItems = formData.items.filter(
        (item) => item.description && item.description.trim() !== ""
      );
      if (validItems.length === 0) {
        toast({
          title: "กรุณากรอกข้อมูลให้ครบ",
          description: "กรุณาเพิ่มรายการสินค้า/บริการอย่างน้อย 1 รายการ",
          variant: "destructive",
        });
        return;
      }
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    hasChangesRef.current = false;

    if (onSubmit) {
      await onSubmit(formData, action);
    }
  };

  const handlePreview = async () => {
    if (!currentDocumentId) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    if (isAutoSaving) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsPreviewLoading(true);
    try {
      if (hasChangesRef.current && onAutoSave) {
        const result = await onAutoSave(formData);
        if (result) {
          setCurrentDocumentId(result.id);
          setCurrentDocumentNumber(result.receipt_number);
        }
      }
      hasChangesRef.current = false;
      router.push(`/receipts/${currentDocumentId}/preview`);
    } catch (error) {
      console.error("Error saving before preview:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกก่อนพรีวิวได้",
        variant: "destructive",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer & Document Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ข้อมูลผู้ซื้อ */}
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
                ที่อยู่ผู้ซื้อ
              </Label>
              <Textarea
                id="customer_address"
                value={formData.customer_address}
                onChange={(e) => updateField("customer_address", e.target.value)}
                placeholder="ที่อยู่"
                rows={3}
                className="resize-none"
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>

            {/* เลขประจำตัวผู้เสียภาษี */}
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
                  วันที่ออกใบเสร็จ <span className="text-red-500">*</span>
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
                <Label htmlFor="payment_method" className="text-sm font-medium">วิธีชำระเงิน</Label>
                {readOnly ? (
                  <Input
                    value={paymentMethodOptions.find(p => p.value === formData.payment_method)?.label || formData.payment_method || "-"}
                    className="h-10"
                    readOnly
                    disabled
                  />
                ) : (
                  <Select
                    value={formData.payment_method || "cash"}
                    onValueChange={(value) => updateField("payment_method", value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="เลือกวิธีชำระเงิน" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* ช่องทางขาย */}
            <div className="space-y-1.5">
              <Label htmlFor="sales_channel" className="text-sm font-medium">ช่องทางขาย</Label>
              {readOnly ? (
                <Input
                  value={formData.sales_channel || "-"}
                  className="h-10"
                  readOnly
                  disabled
                />
              ) : (
                <div className="space-y-2">
                  <Select
                    value={showCustomChannel ? "other" : (formData.sales_channel || "")}
                    onValueChange={(value) => {
                      if (value === "other") {
                        setShowCustomChannel(true);
                        updateField("sales_channel", "");
                      } else {
                        setShowCustomChannel(false);
                        updateField("sales_channel", value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="เลือกช่องทางขาย" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesChannelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${option.color}`}>
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showCustomChannel && (
                    <Input
                      placeholder="ระบุช่องทางขาย"
                      value={formData.sales_channel || ""}
                      onChange={(e) => updateField("sales_channel", e.target.value)}
                      className="h-10"
                    />
                  )}
                </div>
              )}
            </div>

            {/* หมายเหตุ */}
            <div className="pt-4 border-t border-dashed">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Extractor */}
      {!readOnly && (
        <AIExtractor
          onItemsExtracted={handleAIExtractedItems}
          onCustomerExtracted={handleAIExtractedCustomer}
        />
      )}

      {/* รายการสินค้า/บริการ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">รายการสินค้า / บริการ</CardTitle>
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
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <DocumentSummary
            subtotal={totals.subtotal}
            discountType={formData.discount_type}
            discountValue={formData.discount_value}
            discountAmount={totals.discountAmount}
            vatRate={formData.vat_rate}
            amountBeforeVat={totals.amountBeforeVat}
            vatAmount={totals.vatAmount}
            totalAmount={totals.totalAmount}
            onDiscountTypeChange={(type) => updateField("discount_type", type)}
            onDiscountValueChange={(value) => updateField("discount_value", value)}
            onVatRateChange={(rate) => updateField("vat_rate", rate)}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {isAutoSaving && (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                กำลังบันทึก...
              </span>
            )}
            {!isAutoSaving && lastSavedAt && (
              <span>บันทึกล่าสุด: {lastSavedAt.toLocaleTimeString("th-TH")}</span>
            )}
            {currentDocumentNumber && (
              <span className="ml-4 text-primary font-medium">
                เลขที่: {currentDocumentNumber}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {currentDocumentId && (
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isSubmitting || isPreviewLoading}
              >
                {isPreviewLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                พรีวิว
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleSubmit("save")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              บันทึกร่าง
            </Button>
            <Button onClick={() => handleSubmit("send")} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              ออกใบเสร็จ
            </Button>
          </div>
        </div>
      )}

      {/* Product Selection Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>เลือกสินค้า</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="ค้นหาสินค้า..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  ไม่พบสินค้า
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => addProductItem(product)}
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.code} | {product.unit}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {product.price.toLocaleString("th-TH")} บาท
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
