"use client";

import { useState, useMemo, useEffect } from "react";
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
import { AIExtractor, type ExtractedCustomerData } from "@/components/ai/AIExtractor";
import { DocumentItemsTable } from "@/components/documents/DocumentItemsTable";
import { DocumentSummary } from "@/components/documents/DocumentSummary";
import { ShareDialog } from "@/components/documents/ShareDialog";
import { Plus, Save, Send, Eye, Loader2, Package, Search } from "lucide-react";
import Link from "next/link";
import { useProductStore, type Product } from "@/stores/productStore";
import { useCompanyStore } from "@/stores/companyStore";
import { formatCurrency } from "@/lib/utils";
import type { ExtractedItem } from "@/types/database";

interface DocumentItem extends ExtractedItem {
  id?: string;
  discount_percent?: number;
  price_includes_vat?: boolean;
}

export interface InvoiceFormData {
  // ข้อมูลบังคับตามกฎหมาย (มาตรา 86/4)
  customer_name: string;           // ชื่อผู้ซื้อ (บังคับ)
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
  isSubmitting?: boolean;
  documentId?: string;
  documentNumber?: string;
}

export function InvoiceForm({
  initialData,
  onSubmit,
  isSubmitting,
  documentId,
  documentNumber,
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

  const [formData, setFormData] = useState<InvoiceFormData>({
    // ข้อมูลบังคับตามกฎหมาย
    customer_name: "",
    customer_address: "",
    customer_tax_id: "",
    customer_branch_code: "00000", // 00000 = สำนักงานใหญ่
    issue_date: new Date().toISOString().split("T")[0],
    items: [],
    vat_rate: 7,

    // ข้อมูลเพิ่มเติม
    customer_contact: "",
    customer_phone: "",
    customer_email: "",
    due_date: new Date().toISOString().split("T")[0], // default = วันเดียวกับวันที่ออก (ชำระทันที)
    discount_type: "fixed",
    discount_value: 0,
    notes: "",
    terms_conditions: "",
    ...initialData,
  });

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

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
      customer_contact: customer.customer_contact || prev.customer_contact,
      customer_phone: customer.customer_phone || prev.customer_phone,
      customer_email: customer.customer_email || prev.customer_email,
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
          <CardHeader>
            <CardTitle className="text-lg">ข้อมูลผู้ซื้อ (บังคับตามกฎหมาย)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">ชื่อผู้ซื้อ / บริษัท *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => updateField("customer_name", e.target.value)}
                placeholder="ชื่อบริษัท หรือ ชื่อ-นามสกุล"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_address">ที่อยู่ผู้ซื้อ *</Label>
              <Textarea
                id="customer_address"
                value={formData.customer_address}
                onChange={(e) => updateField("customer_address", e.target.value)}
                placeholder="ที่อยู่สำหรับออกใบกำกับภาษี"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_tax_id">เลขประจำตัวผู้เสียภาษี</Label>
              <Input
                id="customer_tax_id"
                value={formData.customer_tax_id}
                onChange={(e) => updateField("customer_tax_id", e.target.value)}
                placeholder="0-0000-00000-00-0"
              />
            </div>

            <div className="space-y-2">
              <Label>ประเภทสถานประกอบการ</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="branch_type"
                    checked={formData.customer_branch_code === "00000"}
                    onChange={() => updateField("customer_branch_code", "00000")}
                    className="w-4 h-4"
                  />
                  <span>สำนักงานใหญ่</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="branch_type"
                    checked={formData.customer_branch_code !== "00000"}
                    onChange={() => updateField("customer_branch_code", "")}
                    className="w-4 h-4"
                  />
                  <span>สาขา</span>
                </label>
                {formData.customer_branch_code !== "00000" && (
                  <Input
                    id="customer_branch_code"
                    value={formData.customer_branch_code}
                    onChange={(e) => updateField("customer_branch_code", e.target.value)}
                    placeholder="เลขที่สาขา เช่น 00001"
                    className="w-32"
                  />
                )}
              </div>
            </div>

            {/* ข้อมูลติดต่อ (ไม่บังคับ) */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">ข้อมูลติดต่อเพิ่มเติม (ไม่บังคับ)</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_contact">ผู้ติดต่อ</Label>
                  <Input
                    id="customer_contact"
                    value={formData.customer_contact}
                    onChange={(e) => updateField("customer_contact", e.target.value)}
                    placeholder="ชื่อผู้ติดต่อ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">โทรศัพท์</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => updateField("customer_phone", e.target.value)}
                    placeholder="0xx-xxx-xxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_email">อีเมล</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => updateField("customer_email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ข้อมูลเอกสาร */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ข้อมูลเอกสาร</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* วันที่ (บังคับตามกฎหมาย) */}
            <div className="space-y-2">
              <Label htmlFor="issue_date">วันที่ออกใบกำกับภาษี *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => updateField("issue_date", e.target.value)}
                required
              />
            </div>

            {/* ข้อมูลเพิ่มเติม (ไม่บังคับ) */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">ข้อมูลเพิ่มเติม (ไม่บังคับ)</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">ครบกำหนดชำระ</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => updateField("due_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">หมายเหตุ</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms_conditions">เงื่อนไข</Label>
                  <Textarea
                    id="terms_conditions"
                    value={formData.terms_conditions}
                    onChange={(e) => updateField("terms_conditions", e.target.value)}
                    placeholder="เงื่อนไขการชำระเงิน, การจัดส่ง ฯลฯ"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Extractor */}
      <AIExtractor
        onItemsExtracted={handleAIExtractedItems}
        onCustomerExtracted={handleAIExtractedCustomer}
      />

      {/* รายการสินค้า/บริการ (บังคับตามกฎหมาย) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">รายการสินค้า / บริการ (บังคับ)</CardTitle>
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
        </CardHeader>
        <CardContent>
          <DocumentItemsTable
            items={formData.items}
            onUpdate={updateItem}
            onRemove={removeItem}
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
          onDiscountTypeChange={(type) => updateField("discount_type", type)}
          onDiscountValueChange={(value) => updateField("discount_value", value)}
          onVatRateChange={(rate) => updateField("vat_rate", rate)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
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
        {documentId && (
          <Link href={`/invoices/${documentId}/preview`}>
            <Button variant="outline" disabled={isSubmitting}>
              <Eye className="h-4 w-4 mr-2" />
              พรีวิว
            </Button>
          </Link>
        )}
        <Button disabled={isSubmitting} onClick={() => setIsShareDialogOpen(true)}>
          <Send className="h-4 w-4 mr-2" />
          ออกใบกำกับภาษี
        </Button>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        documentType="invoice"
        documentId={documentId}
        documentNumber={documentNumber}
        customerEmail={formData.customer_email}
        documentData={{
          invoice_number: documentNumber || "",
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          customer_name: formData.customer_name,
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
