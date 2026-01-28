"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileText, CreditCard, Upload, Save, Loader2, Trash2 } from "lucide-react";
import { useCompanyStore, type CompanySettings } from "@/stores/companyStore";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { settings, fetchSettings, saveSettings, uploadLogo, deleteLogo, isLoading } = useCompanyStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for company info
  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    company_name_en: "",
    tax_id: "",
    branch_code: "",
    branch_name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });

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
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
      });
      setDocumentForm({
        qt_prefix: settings.qt_prefix || "QT",
        qt_next_number: settings.qt_next_number || 1,
        qt_validity_days: settings.qt_validity_days || 30,
        iv_prefix: settings.iv_prefix || "IV",
        iv_next_number: settings.iv_next_number || 1,
        iv_due_days: settings.iv_due_days || 30,
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

  const handleSaveCompany = async () => {
    setIsSaving(true);
    const success = await saveSettings(companyForm);
    setIsSaving(false);
    if (success) {
      toast({ title: "บันทึกสำเร็จ", description: "ข้อมูลบริษัทถูกบันทึกแล้ว" });
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถบันทึกข้อมูลได้", variant: "destructive" });
    }
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
              ข้อมูลบริษัท
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

          {/* Company Settings */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลบริษัท</CardTitle>
                <CardDescription>
                  ข้อมูลนี้จะแสดงในใบเสนอราคาและใบกำกับภาษี
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>โลโก้บริษัท</Label>
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
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">ชื่อบริษัท (ไทย) *</Label>
                    <Input
                      id="company_name"
                      placeholder="บริษัท ตัวอย่าง จำกัด"
                      value={companyForm.company_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_name_en">ชื่อบริษัท (อังกฤษ)</Label>
                    <Input
                      id="company_name_en"
                      placeholder="Example Company Limited"
                      value={companyForm.company_name_en}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name_en: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">เลขประจำตัวผู้เสียภาษี *</Label>
                    <Input
                      id="tax_id"
                      placeholder="0-0000-00000-00-0"
                      value={companyForm.tax_id}
                      onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch">สาขา</Label>
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
                  <Label htmlFor="address">ที่อยู่</Label>
                  <Textarea
                    id="address"
                    placeholder="123 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพฯ 10100"
                    rows={3}
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">โทรศัพท์</Label>
                    <Input
                      id="phone"
                      placeholder="02-xxx-xxxx"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
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
                  <Button className="gap-2" onClick={handleSaveCompany} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    บันทึก
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
                  <div className="space-y-4">
                    <h4 className="font-medium">ใบเสนอราคา</h4>
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

                  <div className="space-y-4">
                    <h4 className="font-medium">ใบกำกับภาษี</h4>
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
                      <Label htmlFor="iv_due">กำหนดชำระ (วัน)</Label>
                      <Input
                        id="iv_due"
                        type="number"
                        value={documentForm.iv_due_days}
                        onChange={(e) => setDocumentForm({ ...documentForm, iv_due_days: parseInt(e.target.value) || 30 })}
                      />
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
