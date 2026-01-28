"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Sparkles, X, Check, User, Image } from "lucide-react";
import { useAIExtraction } from "@/hooks/useAIExtraction";
import { formatCurrency } from "@/lib/utils";
import type { ExtractedItem } from "@/types/database";

export interface ExtractedCustomerData {
  customer_name: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code?: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
}

interface AIExtractorProps {
  onItemsExtracted: (items: ExtractedItem[]) => void;
  onCustomerExtracted?: (customer: ExtractedCustomerData) => void;
}

export function AIExtractor({ onItemsExtracted, onCustomerExtracted }: AIExtractorProps) {
  const [customerText, setCustomerText] = useState("");
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [extractedCustomer, setExtractedCustomer] = useState<ExtractedCustomerData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExtractingCustomer, setIsExtractingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const { isLoading, error, clearError } = useAIExtraction();

  const handleConfirmItems = () => {
    onItemsExtracted(extractedItems);
    setExtractedItems([]);
    setPreviewImage(null);
    clearError();
  };

  const handleConfirmCustomer = () => {
    if (extractedCustomer && onCustomerExtracted) {
      onCustomerExtracted(extractedCustomer);
    }
    setExtractedCustomer(null);
    setPreviewImage(null);
    setCustomerText("");
    setCustomerError(null);
  };

  const handleCancel = () => {
    setExtractedItems([]);
    setExtractedCustomer(null);
    setPreviewImage(null);
    setCustomerText("");
    setCustomerError(null);
  };

  const handleExtractCustomer = async (file: File) => {
    setIsExtractingCustomer(true);
    setCustomerError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/ai/extract-customer", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      setExtractedCustomer(data.customer);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsExtractingCustomer(false);
    }
  };

  const handleExtractCustomerFromText = async () => {
    if (!customerText.trim()) return;

    setIsExtractingCustomer(true);
    setCustomerError(null);

    try {
      const response = await fetch("/api/ai/extract-customer-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: customerText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      setExtractedCustomer(data.customer);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsExtractingCustomer(false);
    }
  };

  const onDropCustomer = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      handleExtractCustomer(file);
    },
    []
  );

  const {
    getRootProps: getCustomerRootProps,
    getInputProps: getCustomerInputProps,
    isDragActive: isCustomerDragActive,
  } = useDropzone({
    onDrop: onDropCustomer,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleRemoveItem = (index: number) => {
    setExtractedItems((items) => items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: keyof ExtractedItem,
    value: string | number
  ) => {
    setExtractedItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          แยกข้อมูลอัตโนมัติด้วย AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        {extractedItems.length === 0 && !extractedCustomer ? (
          onCustomerExtracted ? (
            <Tabs defaultValue="customer-text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer-text" className="gap-2">
                  <FileText className="h-4 w-4" />
                  แยกลูกค้า (ข้อความ)
                </TabsTrigger>
                <TabsTrigger value="customer-image" className="gap-2">
                  <Image className="h-4 w-4" />
                  แยกลูกค้า (รูปภาพ)
                </TabsTrigger>
              </TabsList>

              {/* แท็บ: แยกลูกค้าจากข้อความ */}
              <TabsContent value="customer-text" className="space-y-4 mt-4">
                {isExtractingCustomer ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center bg-white border-primary/50">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                    <p className="text-sm font-medium text-primary">
                      กำลังประมวลผล...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI กำลังแยกข้อมูลจากข้อความ
                    </p>
                  </div>
                ) : (
                  <>
                    <Textarea
                      placeholder={`วางข้อมูลลูกค้าที่นี่...

ตัวอย่าง:
===== ข้อมูลลูกค้า =====
ชื่อ: บริษัท ABC จำกัด
ที่อยู่: 123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110
โทรศัพท์: 02-123-4567
อีเมล: contact@abc.co.th
เลขประจำตัวผู้เสียภาษี: 1234567890123
รหัสสาขา: 00000`}
                      value={customerText}
                      onChange={(e) => setCustomerText(e.target.value)}
                      className="min-h-[150px] bg-white"
                    />
                    <Button
                      onClick={handleExtractCustomerFromText}
                      disabled={!customerText.trim()}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      แยกข้อมูลลูกค้า
                    </Button>
                  </>
                )}
                {customerError && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {customerError}
                  </div>
                )}
              </TabsContent>

              {/* แท็บ: แยกลูกค้าจากรูปภาพ */}
              <TabsContent value="customer-image" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  อัปโหลดรูปนามบัตร, หัวกระดาษบริษัท, หรือเอกสารที่มีข้อมูลลูกค้า
                </p>

                {isExtractingCustomer ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center bg-white border-primary/50">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                    <p className="text-sm font-medium text-primary">
                      กำลังประมวลผล...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI กำลังอ่านข้อมูลจากรูปภาพ
                    </p>
                  </div>
                ) : (
                  <div
                    {...getCustomerRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                      transition-colors bg-white
                      ${
                        isCustomerDragActive
                          ? "border-primary bg-primary/5"
                          : "border-gray-300 hover:border-primary/50"
                      }
                    `}
                  >
                    <input {...getCustomerInputProps()} />
                    <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    {isCustomerDragActive ? (
                      <p className="text-primary font-medium">
                        วางไฟล์ที่นี่...
                      </p>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          ลากรูปนามบัตรหรือเอกสารมาวางที่นี่
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, WEBP ขนาดไม่เกิน 10MB
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {customerError && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {customerError}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              ไม่มีตัวเลือกการแยกข้อมูล
            </div>
          )
        ) : extractedCustomer ? (
          // Preview extracted customer with image
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                ข้อมูลลูกค้าที่พบ
              </h4>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                ยกเลิก
              </Button>
            </div>

            {/* Show uploaded image for reference */}
            {previewImage && (
              <div className="bg-white rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-2">รูปภาพที่อัปโหลด:</p>
                <img
                  src={previewImage}
                  alt="Uploaded document"
                  className="max-h-40 rounded-lg border"
                />
              </div>
            )}

            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">ชื่อบริษัท/ลูกค้า</label>
                  <input
                    type="text"
                    value={extractedCustomer.customer_name}
                    onChange={(e) =>
                      setExtractedCustomer({ ...extractedCustomer, customer_name: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">เลขผู้เสียภาษี</label>
                  <input
                    type="text"
                    value={extractedCustomer.customer_tax_id}
                    onChange={(e) =>
                      setExtractedCustomer({ ...extractedCustomer, customer_tax_id: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ที่อยู่</label>
                <textarea
                  value={extractedCustomer.customer_address}
                  onChange={(e) =>
                    setExtractedCustomer({ ...extractedCustomer, customer_address: e.target.value })
                  }
                  rows={2}
                  className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">ผู้ติดต่อ</label>
                  <input
                    type="text"
                    value={extractedCustomer.customer_contact}
                    onChange={(e) =>
                      setExtractedCustomer({ ...extractedCustomer, customer_contact: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">โทรศัพท์</label>
                  <input
                    type="text"
                    value={extractedCustomer.customer_phone}
                    onChange={(e) =>
                      setExtractedCustomer({ ...extractedCustomer, customer_phone: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">อีเมล</label>
                  <input
                    type="text"
                    value={extractedCustomer.customer_email}
                    onChange={(e) =>
                      setExtractedCustomer({ ...extractedCustomer, customer_email: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button onClick={handleConfirmCustomer} className="gap-2">
                <Check className="h-4 w-4" />
                ใช้ข้อมูลนี้
              </Button>
            </div>
          </div>
        ) : (
          // Preview extracted items
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                พบ {extractedItems.length} รายการ
              </h4>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                ยกเลิก
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {extractedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleUpdateItem(index, "description", e.target.value)
                      }
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          handleUpdateItem(index, "unit", e.target.value)
                        }
                        className="w-16 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-muted-foreground">x</span>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleUpdateItem(
                            index,
                            "unit_price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-28 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-muted-foreground">=</span>
                      <span className="font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                รวม:{" "}
                {formatCurrency(
                  extractedItems.reduce(
                    (sum, item) => sum + item.quantity * item.unit_price,
                    0
                  )
                )}
              </span>
              <Button onClick={handleConfirmItems} className="gap-2">
                <Check className="h-4 w-4" />
                เพิ่มรายการทั้งหมด
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
