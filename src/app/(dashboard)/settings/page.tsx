"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileText, CreditCard, Upload, Save, Loader2, Trash2, Eye, ShieldCheck } from "lucide-react";
import { useCompanyStore, type CompanySettings } from "@/stores/companyStore";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { SignatureDrawPad } from "@/components/settings/SignatureDrawPad";

export default function SettingsPage() {
  const {
    settings,
    fetchSettings,
    saveSettings,
    uploadLogo,
    deleteLogo,
    uploadStamp,
    deleteStamp,
    uploadSignature,
    deleteSignature,
    isLoading,
  } = useCompanyStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const vatDocumentInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingVatDocument, setIsUploadingVatDocument] = useState(false);
  const [selectedVatDocument, setSelectedVatDocument] = useState<File | null>(null);

  // Form state for company info
  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    company_name_en: "",
    tax_id: "",
    branch_code: "",
    branch_name: "",
    entity_type: "" as CompanySettings["entity_type"],
    vat_registered: null as boolean | null,
    vat_registration_date: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    signatory_name: "",
    signatory_position: "",
  });
  const isIndividual = companyForm.entity_type === "individual";
  // Tax ID is optional only for an individual who is not VAT-registered.
  const requiresTaxId = !isIndividual || companyForm.vat_registered === true;

  // Form state for document settings
  const [documentForm, setDocumentForm] = useState({
    qt_prefix: "QT",
    qt_next_number: 1,
    qt_validity_days: 30,
    iv_prefix: "IV",
    iv_next_number: 1,
    iv_due_days: 30,
    vat_rate: 7,
    default_terms: "",
  });

  // Form state for payment settings
  const [paymentForm, setPaymentForm] = useState({
    bank_name: "",
    bank_branch: "",
    account_name: "",
    account_number: "",
  });

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Populate forms when settings are loaded
  useEffect(() => {
    if (settings) {
      setCompanyForm({
        company_name: settings.company_name || "",
        company_name_en: settings.company_name_en || "",
        tax_id: settings.tax_id || "",
        branch_code: settings.branch_code || "",
        branch_name: settings.branch_name || "",
        entity_type: settings.entity_type || "",
        vat_registered: settings.vat_registered === null || settings.vat_registered === undefined
          ? null
          : settings.vat_registered === true || String(settings.vat_registered) === "true" || String(settings.vat_registered) === "yes",
        vat_registration_date: settings.vat_registration_date || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        signatory_name: settings.signatory_name || "",
        signatory_position: settings.signatory_position || "",
      });
      setDocumentForm({
        qt_prefix: settings.qt_prefix || "QT",
        qt_next_number: settings.qt_next_number || 1,
        qt_validity_days: settings.qt_validity_days || 30,
        iv_prefix: settings.iv_prefix || "IV",
        iv_next_number: settings.iv_next_number || 1,
        iv_due_days: settings.iv_due_days ?? 30, // ใช้ ?? เพราะ 0 เป็นค่าที่ถูกต้อง (ชำระทันที)
        vat_rate: settings.vat_rate || 7,
        default_terms: settings.default_terms || "",
      });
      setPaymentForm({
        bank_name: settings.bank_name || "",
        bank_branch: settings.bank_branch || "",
        account_name: settings.account_name || "",
        account_number: settings.account_number || "",
      });
    }
  }, [settings]);

  const validateRequiredOperatorFields = () => {
    const missing: string[] = [];
    if (!companyForm.company_name.trim()) missing.push(isIndividual ? "ชื่อ-นามสกุล/ชื่อร้าน" : "ชื่อกิจการ/บริษัท");
    if (!companyForm.address.trim()) missing.push("ที่อยู่");
    if (!companyForm.phone.trim()) missing.push("เบอร์โทรศัพท์");
    if (!companyForm.email.trim()) missing.push("อีเมล");
    if (!companyForm.entity_type) missing.push("ประเภทผู้ประกอบการ");
    if (companyForm.vat_registered === null) missing.push("สถานะ VAT");
    if (requiresTaxId && !companyForm.tax_id.replace(/\D/g, "")) missing.push(isIndividual ? "เลขประจำตัวประชาชน/ผู้เสียภาษี" : "เลขประจำตัวผู้เสียภาษี");
    if (missing.length) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", description: `ยังขาด: ${missing.join(", ")}`, variant: "destructive" });
      return false;
    }
    const normalizedPhone = companyForm.phone.replace(/\D/g, "");
    if (!/^0\d{8,9}$/.test(normalizedPhone)) {
      toast({ title: "เบอร์โทรศัพท์ไม่ถูกต้อง", description: "กรุณากรอกเบอร์โทรศัพท์ไทย 9–10 หลัก", variant: "destructive" });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email.trim())) {
      toast({ title: "อีเมลไม่ถูกต้อง", description: "กรุณาตรวจสอบรูปแบบอีเมล", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveCompany = async () => {
    if (!validateRequiredOperatorFields()) return;
    const normalizedTaxId = companyForm.tax_id.replace(/\D/g, "");
    if (normalizedTaxId && normalizedTaxId.length !== 13) {
      toast({ title: "เลขประจำตัวไม่ถูกต้อง", description: "เลขประจำตัวประชาชน/ผู้เสียภาษีต้องมี 13 หลัก", variant: "destructive" });
      return;
    }
    if (requiresTaxId && normalizedTaxId.length !== 13) {
      toast({ title: "เลขผู้เสียภาษีไม่ถูกต้อง", description: "บัญชีนี้ต้องระบุเลขประจำตัวประชาชน/ผู้เสียภาษี 13 หลัก", variant: "destructive" });
      return;
    }
    if (companyForm.vat_registered && (!companyForm.company_name.trim() || !companyForm.address.trim() || !/^\d{5}$/.test(companyForm.branch_code))) {
      toast({ title: "ข้อมูลสำหรับใบกำกับภาษีไม่ครบ", description: "กรุณากรอกชื่อกิจการ ที่อยู่ และรหัสสาขา 5 หลักให้ครบ", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const success = await saveSettings({ ...companyForm, tax_id: normalizedTaxId });
    setIsSaving(false);
    if (success) {
      toast({ title: "บันทึกสำเร็จ", description: "ข้อมูลผู้ประกอบการถูกบันทึกแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกข้อมูลได้", variant: "destructive" });
    }
  };

  const handleVatDocumentSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast({ title: "ไฟล์ไม่ถูกต้อง", description: "รองรับ PDF, JPG, PNG ขนาดไม่เกิน 5MB", variant: "destructive" });
      event.target.value = "";
      return;
    }
    setSelectedVatDocument(file);
  };

  const handleSubmitVatVerification = async () => {
    if (!validateRequiredOperatorFields()) return;
    const normalizedTaxId = companyForm.tax_id.replace(/\D/g, "");
    if (!companyForm.entity_type || companyForm.vat_registered !== true || normalizedTaxId.length !== 13 || !companyForm.vat_registration_date || !companyForm.company_name.trim() || !companyForm.address.trim() || !/^\d{5}$/.test(companyForm.branch_code)) {
      toast({
        title: "กรุณากรอกข้อมูล VAT ให้ครบ",
        description: "ต้องระบุชื่อกิจการ ประเภทกิจการ ที่อยู่ เลขผู้เสียภาษี 13 หลัก รหัสสาขา 5 หลัก และวันที่จด VAT ก่อนส่งตรวจ",
        variant: "destructive",
      });
      return;
    }
    if (!selectedVatDocument && !settings?.vat_document_path) {
      toast({ title: "กรุณาเลือกไฟล์ ภ.พ.20", variant: "destructive" });
      return;
    }

    setIsUploadingVatDocument(true);
    try {
      const companySaved = await saveSettings({ ...companyForm, tax_id: normalizedTaxId });
      if (!companySaved) throw new Error("ไม่สามารถบันทึกข้อมูลกิจการได้");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบใหม่");
      let path = settings?.vat_document_path || "";
      if (selectedVatDocument) {
        const extension = selectedVatDocument.name.split(".").pop()?.toLowerCase() || "pdf";
        path = `${user.id}/porpor20.${extension}`;
        const { error } = await supabase.storage.from("vat-documents").upload(path, selectedVatDocument, { upsert: true, contentType: selectedVatDocument.type });
        if (error) throw error;
      }
      const saved = await saveSettings({
        vat_document_path: path,
        vat_verification_status: "pending",
        vat_submitted_at: new Date().toISOString(),
        vat_rejection_reason: "",
      });
      if (!saved) throw new Error("ไม่สามารถบันทึกสถานะเอกสารได้");
      toast({ title: "ส่ง ภ.พ.20 แล้ว", description: "เอกสารอยู่ระหว่างรอผู้ดูแลตรวจสอบ" });
      setSelectedVatDocument(null);
    } catch (error) {
      toast({ title: "อัปโหลดไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setIsUploadingVatDocument(false);
      if (vatDocumentInputRef.current) vatDocumentInputRef.current.value = "";
    }
  };

  const handleViewVatDocument = async () => {
    if (!settings?.vat_document_path) return;
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("vat-documents").createSignedUrl(settings.vat_document_path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "เปิดเอกสารไม่ได้", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleSaveDocument = async () => {
    setIsSaving(true);
    const success = await saveSettings(documentForm);
    setIsSaving(false);
    if (success) {
      toast({ title: "บันทึกสำเร็จ", description: "ตั้งค่าเอกสารถูกบันทึกแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกข้อมูลได้", variant: "destructive" });
    }
  };

  const handleSavePayment = async () => {
    setIsSaving(true);
    const success = await saveSettings(paymentForm);
    setIsSaving(false);
    if (success) {
      toast({ title: "บันทึกสำเร็จ", description: "ข้อมูลบัญชีธนาคารถูกบันทึกแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกข้อมูลได้", variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "ประเภทไฟล์ไม่ถูกต้อง", description: "รองรับเฉพาะ PNG และ JPG", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "ไฟล์ใหญ่เกินไป", description: "ขนาดไฟล์ต้องไม่เกิน 2MB", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    const result = await uploadLogo(file);
    setIsUploadingLogo(false);

    if (result) {
      toast({ title: "อัปโหลดสำเร็จ", description: "โลโก้บริษัทถูกอัปโหลดแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปโหลดโลโก้ได้", variant: "destructive" });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    setIsUploadingLogo(true);
    const success = await deleteLogo();
    setIsUploadingLogo(false);

    if (success) {
      toast({ title: "ลบสำเร็จ", description: "โลโก้บริษัทถูกลบแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบโลโก้ได้", variant: "destructive" });
    }
  };

  // Stamp upload handlers
  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "ประเภทไฟล์ไม่ถูกต้อง", description: "รองรับเฉพาะ PNG และ JPG", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "ไฟล์ใหญ่เกินไป", description: "ขนาดไฟล์ต้องไม่เกิน 2MB", variant: "destructive" });
      return;
    }

    setIsUploadingStamp(true);
    const result = await uploadStamp(file);
    setIsUploadingStamp(false);

    if (result) {
      toast({ title: "อัปโหลดสำเร็จ", description: "ตราประทับบริษัทถูกอัปโหลดแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปโหลดตราประทับได้", variant: "destructive" });
    }

    if (stampInputRef.current) {
      stampInputRef.current.value = "";
    }
  };

  const handleDeleteStamp = async () => {
    setIsUploadingStamp(true);
    const success = await deleteStamp();
    setIsUploadingStamp(false);

    if (success) {
      toast({ title: "ลบสำเร็จ", description: "ตราประทับบริษัทถูกลบแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบตราประทับได้", variant: "destructive" });
    }
  };

  // Signature upload handlers
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "ประเภทไฟล์ไม่ถูกต้อง", description: "รองรับเฉพาะ PNG และ JPG", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "ไฟล์ใหญ่เกินไป", description: "ขนาดไฟล์ต้องไม่เกิน 2MB", variant: "destructive" });
      return;
    }

    setIsUploadingSignature(true);
    const result = await uploadSignature(file);
    setIsUploadingSignature(false);

    if (result) {
      toast({ title: "อัปโหลดสำเร็จ", description: "ลายเซ็นผู้มีอำนาจถูกอัปโหลดแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปโหลดลายเซ็นได้", variant: "destructive" });
    }

    if (signatureInputRef.current) {
      signatureInputRef.current.value = "";
    }
  };

  const handleDeleteSignature = async () => {
    setIsUploadingSignature(true);
    const success = await deleteSignature();
    setIsUploadingSignature(false);

    if (success) {
      toast({ title: "ลบสำเร็จ", description: "ลายเซ็นผู้มีอำนาจถูกลบแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบลายเซ็นได้", variant: "destructive" });
    }
  };

  const handleDrawnSignatureSave = async (file: File) => {
    setIsUploadingSignature(true);
    const result = await uploadSignature(file);
    setIsUploadingSignature(false);
    if (result) {
      toast({ title: "บันทึกสำเร็จ", description: "ลายเซ็นที่วาดถูกบันทึกแล้ว" });
      return true;
    }
    toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกลายเซ็นได้", variant: "destructive" });
    return false;
  };

  if (isLoading && !settings) {
    return (
      <div>
        <Header title="ตั้งค่า" />
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
      <Header title="ตั้งค่า" />

      <div className="p-6">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              ข้อมูลผู้ประกอบการ
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              เอกสาร
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-2">
              <CreditCard className="h-4 w-4" />
              การชำระเงิน
            </TabsTrigger>
          </TabsList>

          {/* Operator Settings */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isIndividual ? "ข้อมูลบุคคลธรรมดา" : "ข้อมูลกิจการ"}</CardTitle>
                <CardDescription>
                  ข้อมูลนี้เป็นข้อมูลของผู้ออกเอกสาร และจะแสดงในใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษีตามสิทธิ์ของบัญชี
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>{isIndividual ? "โลโก้ร้าน/เครื่องหมายการค้า (ถ้ามี)" : "โลโก้กิจการ (ถ้ามี)"}</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                      {settings?.logo_url ? (
                        <img
                          src={settings.logo_url}
                          alt="Company Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {settings?.logo_url ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
                        </Button>
                        {settings?.logo_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeleteLogo}
                            disabled={isUploadingLogo}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        รองรับ PNG, JPG ขนาดไม่เกิน 2MB
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ขนาดแนะนำ: 300 x 100 พิกเซล (แนวนอน)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stamp & Signature Upload */}
                <div className="grid grid-cols-1 gap-6 border-t pt-4 md:grid-cols-2">
                  {/* Stamp Upload */}
                  <div className="space-y-2">
                    <Label>{isIndividual ? "ตราประทับร้าน (ถ้ามี)" : "ตราประทับกิจการ (ถ้ามี)"}</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                        {settings?.stamp_url ? (
                          <img
                            src={settings.stamp_url}
                            alt="Company Stamp"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={stampInputRef}
                          onChange={handleStampUpload}
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => stampInputRef.current?.click()}
                            disabled={isUploadingStamp}
                          >
                            {isUploadingStamp ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {settings?.stamp_url ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
                          </Button>
                          {settings?.stamp_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDeleteStamp}
                              disabled={isUploadingStamp}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          แนะนำภาพพื้นหลังโปร่งใส (PNG)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ขนาดแนะนำ: 400 x 400 พิกเซล (สี่เหลี่ยมจัตุรัส)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Signature Upload */}
                  <div className="space-y-2">
                    <Label>{isIndividual ? "ลายเซ็นเจ้าของ/ผู้รับเงิน" : "ลายเซ็นผู้มีอำนาจ"}</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                        {settings?.signature_url ? (
                          <img
                            src={settings.signature_url}
                            alt="Signature"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={signatureInputRef}
                          onChange={handleSignatureUpload}
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => signatureInputRef.current?.click()}
                            disabled={isUploadingSignature}
                          >
                            {isUploadingSignature ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            {settings?.signature_url ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
                          </Button>
                          {settings?.signature_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDeleteSignature}
                              disabled={isUploadingSignature}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          แนะนำภาพพื้นหลังโปร่งใส (PNG)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ขนาดแนะนำ: 300 x 100 พิกเซล (แนวนอน)
                        </p>
                      </div>
                    </div>
                    <SignatureDrawPad onSave={handleDrawnSignatureSave} disabled={isUploadingSignature} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="entity_type">ประเภทผู้ประกอบการ *</Label>
                    <select id="entity_type" value={companyForm.entity_type} onChange={(e) => setCompanyForm({ ...companyForm, entity_type: e.target.value as CompanySettings["entity_type"] })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">เลือกประเภท</option>
                      <option value="individual">บุคคลธรรมดา</option>
                      <option value="juristic">นิติบุคคล</option>
                      <option value="partnership">ห้างหุ้นส่วน/คณะบุคคล</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vat_registered">สถานะภาษีมูลค่าเพิ่ม (VAT) *</Label>
                    <select id="vat_registered" value={companyForm.vat_registered === null ? "" : companyForm.vat_registered ? "yes" : "no"} onChange={(e) => setCompanyForm({ ...companyForm, vat_registered: e.target.value === "" ? null : e.target.value === "yes" })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">เลือกสถานะ</option>
                      <option value="yes">จด VAT แล้ว</option>
                      <option value="no">ยังไม่ได้จด VAT / ได้รับยกเว้น</option>
                    </select>
                  </div>
                  {companyForm.vat_registered === true && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="vat_registration_date">วันที่จดทะเบียน VAT *</Label>
                        <Input id="vat_registration_date" type="date" value={companyForm.vat_registration_date} onChange={(e) => setCompanyForm({ ...companyForm, vat_registration_date: e.target.value })} />
                      </div>
                      <div className="space-y-3 rounded-lg border bg-background p-4 md:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <Label>เอกสาร ภ.พ.20 *</Label>
                            <p className="text-xs text-muted-foreground">PDF, JPG หรือ PNG ขนาดไม่เกิน 5MB เก็บแบบ Private</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${settings?.vat_verification_status === "verified" ? "bg-green-100 text-green-700" : settings?.vat_verification_status === "pending" ? "bg-amber-100 text-amber-700" : settings?.vat_verification_status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                            {settings?.vat_verification_status === "verified" ? "ยืนยันแล้ว" : settings?.vat_verification_status === "pending" ? "รอตรวจสอบ" : settings?.vat_verification_status === "rejected" ? "ไม่ผ่าน" : "ยังไม่ส่งเอกสาร"}
                          </span>
                        </div>
                        {settings?.vat_verification_status === "rejected" && settings.vat_rejection_reason && (
                          <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">เหตุผล: {settings.vat_rejection_reason}</p>
                        )}
                        {settings?.vat_verification_status === "verified" && (
                          <p className="flex items-center gap-2 text-sm text-green-700"><ShieldCheck className="h-4 w-4" />เปิดสิทธิ์ออกใบกำกับภาษีแล้ว</p>
                        )}
                        <input ref={vatDocumentInputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleVatDocumentSelect} />
                        {selectedVatDocument && (
                          <p className="rounded-md bg-blue-50 p-2 text-sm text-blue-700">ไฟล์ที่เลือก: {selectedVatDocument.name}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => vatDocumentInputRef.current?.click()} disabled={isUploadingVatDocument}>
                            <Upload className="mr-2 h-4 w-4" />
                            {selectedVatDocument || settings?.vat_document_path ? "เปลี่ยนไฟล์" : "เลือกไฟล์ ภ.พ.20"}
                          </Button>
                          {settings?.vat_document_path && <Button type="button" variant="ghost" onClick={handleViewVatDocument}><Eye className="mr-2 h-4 w-4" />ดูเอกสาร</Button>}
                        </div>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground md:col-span-2">
                    ระบบเปิดการออกใบกำกับภาษีเฉพาะบัญชีที่ยืนยันว่าจด VAT แล้วเท่านั้น ประเภทบุคคลหรือนิติบุคคลไม่ใช่ตัวตัดสินสิทธิ์นี้
                  </p>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  {isIndividual
                    ? "บัญชีบุคคลธรรมดา: กรอกชื่อ-นามสกุล หรือชื่อร้านที่ต้องการให้แสดงบนเอกสาร ส่วนตราประทับ ตำแหน่ง และเว็บไซต์ไม่บังคับ"
                    : "บัญชีกิจการ: กรอกชื่อจดทะเบียน เลขผู้เสียภาษี ที่อยู่ และข้อมูลผู้ลงนามให้ตรงกับเอกสารของกิจการ"}
                </div>

                {/* Signatory Info */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="signatory_name">{isIndividual ? "ชื่อเจ้าของ/ผู้ลงนาม" : "ชื่อผู้มีอำนาจลงนาม"}</Label>
                    <Input
                      id="signatory_name"
                      placeholder="นายสมชาย ใจดี"
                      value={companyForm.signatory_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, signatory_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signatory_position">{isIndividual ? "ตำแหน่ง (ถ้ามี)" : "ตำแหน่ง"}</Label>
                    <Input
                      id="signatory_position"
                      placeholder="กรรมการผู้จัดการ"
                      value={companyForm.signatory_position}
                      onChange={(e) => setCompanyForm({ ...companyForm, signatory_position: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">{isIndividual ? "ชื่อ-นามสกุล/ชื่อร้าน (ไทย) *" : "ชื่อกิจการ/บริษัท (ไทย) *"}</Label>
                    <Input
                      id="company_name"
                      placeholder={isIndividual ? "นายสมชาย ใจดี หรือ ร้านสมชายการช่าง" : "บริษัท ตัวอย่าง จำกัด"}
                      value={companyForm.company_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name_en">{isIndividual ? "ชื่อภาษาอังกฤษ (ถ้ามี)" : "ชื่อกิจการ/บริษัท (อังกฤษ)"}</Label>
                    <Input
                      id="company_name_en"
                      placeholder="Example Company Limited"
                      value={companyForm.company_name_en}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">{isIndividual ? `เลขประจำตัวประชาชน/ผู้เสียภาษี${requiresTaxId ? " *" : " (ถ้ามี)"}` : `เลขประจำตัวผู้เสียภาษี${requiresTaxId ? " *" : " (ถ้ามี)"}`}</Label>
                    <Input
                      id="tax_id"
                      placeholder="0-0000-00000-00-0"
                      value={companyForm.tax_id}
                      onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                    />
                  </div>
                  <div className={`space-y-2 ${isIndividual && companyForm.vat_registered !== true ? "hidden" : ""}`}>
                    <Label htmlFor="branch">สาขา{companyForm.vat_registered ? " *" : ""}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="branch_code"
                        placeholder="00000"
                        className="w-24"
                        value={companyForm.branch_code}
                        onChange={(e) => setCompanyForm({ ...companyForm, branch_code: e.target.value })}
                      />
                      <Input
                        id="branch_name"
                        placeholder="สำนักงานใหญ่"
                        className="flex-1"
                        value={companyForm.branch_name}
                        onChange={(e) => setCompanyForm({ ...companyForm, branch_name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">ที่อยู่ *</Label>
                  <Textarea
                    id="address"
                    placeholder="123 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพฯ 10100"
                    rows={3}
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone">โทรศัพท์ *</Label>
                    <Input
                      id="phone"
                      placeholder="02-xxx-xxxx"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@example.com"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">เว็บไซต์</Label>
                    <Input
                      id="website"
                      placeholder="www.example.com"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    onClick={companyForm.vat_registered === true ? handleSubmitVatVerification : handleSaveCompany}
                    disabled={isSaving || isUploadingVatDocument || (companyForm.vat_registered === true && !selectedVatDocument && !settings?.vat_document_path)}
                  >
                    {isSaving || isUploadingVatDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : companyForm.vat_registered === true ? <ShieldCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {companyForm.vat_registered === true ? "บันทึกและส่งตรวจ" : "บันทึก"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Document Settings */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ตั้งค่าเอกสาร</CardTitle>
                <CardDescription>
                  กำหนดค่าเริ่มต้นสำหรับใบเสนอราคาและใบกำกับภาษี
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* ใบเสนอราคา */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-primary">ใบเสนอราคา</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="qt_prefix">คำนำหน้า</Label>
                        <Input
                          id="qt_prefix"
                          value={documentForm.qt_prefix}
                          onChange={(e) => setDocumentForm({ ...documentForm, qt_prefix: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qt_next">เลขที่ถัดไป</Label>
                        <Input
                          id="qt_next"
                          type="number"
                          value={documentForm.qt_next_number}
                          onChange={(e) => setDocumentForm({ ...documentForm, qt_next_number: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qt_validity">วันที่ใช้ได้ (วัน)</Label>
                      <Input
                        id="qt_validity"
                        type="number"
                        value={documentForm.qt_validity_days}
                        onChange={(e) => setDocumentForm({ ...documentForm, qt_validity_days: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                  </div>

                  {/* ใบกำกับภาษี */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-primary">ใบกำกับภาษี/ใบเสร็จรับเงิน</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="iv_prefix">คำนำหน้า</Label>
                        <Input
                          id="iv_prefix"
                          value={documentForm.iv_prefix}
                          onChange={(e) => setDocumentForm({ ...documentForm, iv_prefix: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="iv_next">เลขที่ถัดไป</Label>
                        <Input
                          id="iv_next"
                          type="number"
                          value={documentForm.iv_next_number}
                          onChange={(e) => setDocumentForm({ ...documentForm, iv_next_number: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>กำหนดชำระ</Label>
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="iv_due_type"
                            checked={documentForm.iv_due_days === 0}
                            onChange={() => setDocumentForm({ ...documentForm, iv_due_days: 0 })}
                            className="w-4 h-4 accent-primary"
                          />
                          <span className="text-sm">ชำระทันที (วันเดียวกับวันที่ออก)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="iv_due_type"
                            checked={documentForm.iv_due_days > 0}
                            onChange={() => setDocumentForm({ ...documentForm, iv_due_days: 30 })}
                            className="w-4 h-4 accent-primary"
                          />
                          <span className="text-sm">กำหนดเอง</span>
                          {documentForm.iv_due_days > 0 && (
                            <div className="flex items-center gap-2">
                              <Input
                                id="iv_due"
                                type="number"
                                min="1"
                                className="w-20 h-8"
                                value={documentForm.iv_due_days}
                                onChange={(e) => setDocumentForm({ ...documentForm, iv_due_days: Math.max(1, parseInt(e.target.value) || 1) })}
                              />
                              <span className="text-sm text-muted-foreground">วัน หลังวันที่ออก</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">ค่าเริ่มต้น</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vat_rate">อัตรา VAT (%)</Label>
                      <Input
                        id="vat_rate"
                        type="number"
                        step="0.01"
                        value={documentForm.vat_rate}
                        onChange={(e) => setDocumentForm({ ...documentForm, vat_rate: parseFloat(e.target.value) || 7 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">เงื่อนไขเริ่มต้น</Label>
                  <Textarea
                    id="terms"
                    placeholder="เงื่อนไขการชำระเงิน, การจัดส่ง ฯลฯ"
                    rows={4}
                    value={documentForm.default_terms}
                    onChange={(e) => setDocumentForm({ ...documentForm, default_terms: e.target.value })}
                  />
                </div>

                <div className="flex justify-end">
                  <Button className="gap-2" onClick={handleSaveDocument} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    บันทึก
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>บัญชีธนาคาร</CardTitle>
                <CardDescription>
                  ข้อมูลบัญชีธนาคารสำหรับรับชำระเงิน
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">ธนาคาร</Label>
                    <Input
                      id="bank_name"
                      placeholder="ธนาคารกสิกรไทย"
                      value={paymentForm.bank_name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_branch">สาขา</Label>
                    <Input
                      id="bank_branch"
                      placeholder="สาขาสีลม"
                      value={paymentForm.bank_branch}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bank_branch: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_name">ชื่อบัญชี</Label>
                    <Input
                      id="account_name"
                      placeholder="บริษัท ตัวอย่าง จำกัด"
                      value={paymentForm.account_name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, account_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">เลขที่บัญชี</Label>
                    <Input
                      id="account_number"
                      placeholder="xxx-x-xxxxx-x"
                      value={paymentForm.account_number}
                      onChange={(e) => setPaymentForm({ ...paymentForm, account_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="gap-2" onClick={handleSavePayment} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    บันทึก
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
