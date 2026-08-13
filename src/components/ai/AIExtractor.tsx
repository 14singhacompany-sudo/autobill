"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Check, FileText, Image as ImageIcon, Loader2, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parseCustomerText, parseItemsText, type ParsedCustomerData } from "@/lib/text-extractor";
import type { ExtractedItem } from "@/types/database";
import { lookupDbdFromBrowser } from "@/lib/company-registry";

export type ExtractedCustomerData = ParsedCustomerData;

interface AIExtractorProps {
  onItemsExtracted: (items: ExtractedItem[]) => void;
  onCustomerExtracted?: (customer: ExtractedCustomerData) => void;
}

async function enrichFromRegistry(customer: ExtractedCustomerData) {
  if (!/^\d{13}$/.test(customer.customer_tax_id)) {
    return customer.customer_name && customer.customer_type !== "company"
      ? { ...customer, customer_type: "individual" as const, customer_branch_code: "" }
      : customer;
  }
  try {
    const response = await fetch(`/api/company/${customer.customer_tax_id}`, { headers: { Accept: "application/json" } });
    const result = await response.json();
    let company = result.found ? result.company : null;
    if (!company && result.temporarilyUnavailable) {
      company = await lookupDbdFromBrowser(customer.customer_tax_id);
    }
    if (!company) {
      return result.temporarilyUnavailable
        ? customer
        : { ...customer, customer_type: "individual" as const, customer_branch_code: "" };
    }
    return {
      ...customer,
      customer_type: "company" as const,
      customer_branch_code: customer.customer_branch_code || "00000",
      customer_name: company.name_th || customer.customer_name,
      customer_address: company.address || customer.customer_address,
    };
  } catch {
    return customer;
  }
}

export function AIExtractor({ onItemsExtracted, onCustomerExtracted }: AIExtractorProps) {
  const [customerText, setCustomerText] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [result, setResult] = useState<ExtractedCustomerData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCustomer = async (text: string) => {
    const parsed = await enrichFromRegistry(parseCustomerText(text));
    if (!parsed.customer_name && !parsed.customer_tax_id && !parsed.customer_phone && !parsed.customer_email) {
      throw new Error("ไม่พบข้อมูลลูกค้า กรุณาตรวจข้อความแล้วลองใหม่");
    }
    setResult(parsed);
  };

  const handleCustomerText = async () => {
    setError(null);
    try { await parseCustomer(customerText); } catch (err) { setError(err instanceof Error ? err.message : "แยกข้อมูลไม่สำเร็จ"); }
  };

  const handleItemsText = () => {
    const items = parseItemsText(itemsText);
    if (!items.length) {
      setError("ไม่พบรายการ กรุณาใช้รูปแบบ รายละเอียด | จำนวน | หน่วย | ราคา");
      return;
    }
    setError(null);
    onItemsExtracted(items);
    setItemsText("");
  };

  const readImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setPreviewImage(URL.createObjectURL(file));
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["tha", "eng"], 1, {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress(Math.round((message.progress || 0) * 100));
        },
      });
      const recognition = await worker.recognize(file);
      await worker.terminate();
      const text = recognition.data.text.trim();
      if (!text) throw new Error("ไม่พบข้อความในรูป กรุณาใช้รูปที่ชัดและถ่ายตรง");
      setOcrText(text);
      await parseCustomer(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อ่านรูปไม่สำเร็จ");
    } finally {
      setIsProcessing(false);
    }
  };

  const dropzone = useDropzone({
    onDrop: (files) => { if (files[0]) void readImage(files[0]); },
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const reset = () => {
    if (previewImage) URL.revokeObjectURL(previewImage);
    setResult(null); setPreviewImage(null); setOcrText(""); setError(null); setProgress(0);
  };

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg"><ScanText className="h-5 w-5 text-primary" />แยกข้อมูลอัตโนมัติ</CardTitle>
        <p className="text-sm text-muted-foreground">ประมวลผลในเครื่องด้วย OCR และกฎตรวจข้อความ ไม่มีค่า API</p>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><h4 className="font-medium">ตรวจสอบข้อมูลก่อนนำไปใช้</h4><Button type="button" variant="ghost" size="sm" onClick={reset}><X className="mr-1 h-4 w-4" />ยกเลิก</Button></div>
            {previewImage && <img src={previewImage} alt="รูปที่ใช้ OCR" className="max-h-44 rounded-lg border object-contain" />}
            {ocrText && <details className="rounded-lg border bg-white p-3"><summary className="cursor-pointer text-sm font-medium">ดูข้อความที่ OCR อ่านได้</summary><pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{ocrText}</pre></details>}
            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2">
              {([
                ["customer_name", "ชื่อบริษัท/ลูกค้า"], ["customer_tax_id", "เลขผู้เสียภาษี"],
                ["customer_branch_code", "รหัสสาขา"], ["customer_phone", "โทรศัพท์"],
                ["customer_email", "อีเมล"], ["customer_contact", "ผู้ติดต่อ"],
              ] as const).map(([key, label]) => <label key={key} className="text-xs text-muted-foreground">{label}<input value={result[key]} onChange={(e) => setResult({ ...result, [key]: e.target.value })} className="mt-1 w-full rounded border px-2 py-2 text-sm text-foreground" /></label>)}
              <label className="text-xs text-muted-foreground sm:col-span-2">ที่อยู่<textarea value={result.customer_address} onChange={(e) => setResult({ ...result, customer_address: e.target.value })} rows={3} className="mt-1 w-full rounded border px-2 py-2 text-sm text-foreground" /></label>
            </div>
            <Button type="button" className="w-full" onClick={() => { onCustomerExtracted?.(result); reset(); }}><Check className="mr-2 h-4 w-4" />ใช้ข้อมูลนี้</Button>
          </div>
        ) : (
          <Tabs defaultValue="customer-text">
            <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-3">
              <TabsTrigger value="customer-text"><FileText className="mr-2 h-4 w-4" />ข้อมูลลูกค้า</TabsTrigger>
              <TabsTrigger value="items-text"><FileText className="mr-2 h-4 w-4" />รายการสินค้า</TabsTrigger>
              <TabsTrigger value="image"><ImageIcon className="mr-2 h-4 w-4" />อ่านข้อความจากรูป</TabsTrigger>
            </TabsList>
            <TabsContent value="customer-text" className="mt-4 space-y-3"><Textarea value={customerText} onChange={(e) => setCustomerText(e.target.value)} className="min-h-40 bg-white" placeholder="ชื่อ: บริษัท ตัวอย่าง จำกัด\nเลขผู้เสียภาษี: 0105551234567\nที่อยู่: ...\nโทร: ...\nอีเมล: ..." /><Button type="button" className="w-full" disabled={!customerText.trim()} onClick={handleCustomerText}>แยกข้อมูลลูกค้า</Button></TabsContent>
            <TabsContent value="items-text" className="mt-4 space-y-3"><Textarea value={itemsText} onChange={(e) => setItemsText(e.target.value)} className="min-h-40 bg-white font-mono" placeholder="กระดาษ A4 | 10 | รีม | 120\nหมึกพิมพ์ | 2 | กล่อง | 850" /><p className="text-xs text-muted-foreground">หนึ่งบรรทัดต่อหนึ่งรายการ: รายละเอียด | จำนวน | หน่วย | ราคา รองรับการคัดลอกจาก Excel</p><Button type="button" className="w-full" disabled={!itemsText.trim()} onClick={handleItemsText}>เพิ่มรายการสินค้า</Button></TabsContent>
            <TabsContent value="image" className="mt-4 space-y-3">
              {isProcessing ? <div className="rounded-lg border-2 border-dashed bg-white p-8 text-center"><Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" /><p>กำลังอ่านข้อความในเครื่อง... {progress}%</p><p className="mt-1 text-xs text-muted-foreground">ครั้งแรกอาจใช้เวลาสักครู่เพื่อโหลดชุดภาษาไทย</p></div> : <div {...dropzone.getRootProps()} className="cursor-pointer rounded-lg border-2 border-dashed bg-white p-8 text-center hover:border-primary"><input {...dropzone.getInputProps()} /><ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-medium">แตะเพื่อเลือกรูป หรือลากรูปมาวาง</p><p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP ไม่เกิน 10MB · รูปไม่ถูกส่งไป AI</p></div>}
            </TabsContent>
          </Tabs>
        )}
        {error && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      </CardContent>
    </Card>
  );
}
