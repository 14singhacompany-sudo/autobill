"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff, User, Building2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormErrors {
  fullName?: string;
  companyName?: string;
  entityType?: string;
  vatRegistered?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    companyName: "",
    phone: "",
    entityType: "",
    vatRegistered: "",
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "กรุณากรอกชื่อ-นามสกุล";
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = "กรุณากรอกชื่อบริษัท/ร้านค้า";
    }
    if (!formData.entityType) newErrors.entityType = "กรุณาเลือกประเภทผู้ประกอบการ";
    if (!formData.vatRegistered) newErrors.vatRegistered = "กรุณาระบุสถานะการจด VAT";

    if (!formData.phone.trim()) {
      newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";
    } else if (!/^[0-9]{9,10}$/.test(formData.phone.replace(/-/g, ""))) {
      newErrors.phone = "เบอร์โทรศัพท์ไม่ถูกต้อง";
    }

    if (!formData.email.trim()) {
      newErrors.email = "กรุณากรอกอีเมล";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";
    }

    if (!formData.password) {
      newErrors.password = "กรุณากรอกรหัสผ่าน";
    } else if (formData.password.length < 6) {
      newErrors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "กรุณายืนยันรหัสผ่าน";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }

    if (!acceptTerms) {
      newErrors.acceptTerms = "กรุณายอมรับเงื่อนไขการใช้งาน";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        description: "ตรวจสอบช่องที่มีเครื่องหมายสีแดง",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
            phone: formData.phone,
            entity_type: formData.entityType,
            vat_registered: formData.vatRegistered === "yes",
            terms_accepted_at: new Date().toISOString(),
            terms_version: "2026-08-10",
          },
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes("already registered")) {
          errorMessage = "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
          setErrors({ ...errors, email: errorMessage });
        }
        toast({
          title: "สมัครสมาชิกไม่สำเร็จ",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.session) {
          // Auto-confirmed, redirect to dashboard
          toast({
            title: "สมัครสมาชิกสำเร็จ!",
            description: "ยินดีต้อนรับสู่ AutoBill24",
          });
          router.push("/dashboard");
          router.refresh();
        } else {
          // Email confirmation required
          setConfirmationEmail(formData.email.trim());
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  if (confirmationEmail) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">ตรวจสอบอีเมลของคุณ</h2>
        <p className="mt-3 text-muted-foreground">
          เราส่งลิงก์ยืนยันการใช้งานไปที่
        </p>
        <p className="mt-1 break-all font-semibold text-foreground">{confirmationEmail}</p>
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left text-sm text-blue-900">
          กรุณาเปิดอีเมลแล้วกดลิงก์ <strong>ยืนยันการใช้งาน</strong> ก่อนเข้าสู่ระบบ หากไม่พบอีเมล กรุณาตรวจสอบโฟลเดอร์สแปมหรืออีเมลขยะด้วย
        </div>
        <Button asChild className="mt-6 w-full h-11">
          <Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">สมัครสมาชิก</h2>
      <p className="text-center text-muted-foreground mb-6">
        เริ่มต้นใช้ฟรี อัปเกรดเมื่อพร้อม
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-sm font-medium">
            ชื่อ-นามสกุล <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.fullName ? "text-red-500" : "text-muted-foreground"}`} />
            <Input
              id="fullName"
              type="text"
              placeholder="ชื่อ นามสกุล"
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value });
                clearError("fullName");
              }}
              className={`pl-10 h-11 ${errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={isLoading}
            />
          </div>
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyName" className="text-sm font-medium">
            ชื่อบริษัท/ร้านค้า <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.companyName ? "text-red-500" : "text-muted-foreground"}`} />
            <Input
              id="companyName"
              type="text"
              placeholder="ชื่อบริษัท หรือชื่อร้านค้า"
              value={formData.companyName}
              onChange={(e) => {
                setFormData({ ...formData, companyName: e.target.value });
                clearError("companyName");
              }}
              className={`pl-10 h-11 ${errors.companyName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={isLoading}
            />
          </div>
          {errors.companyName && (
            <p className="text-sm text-red-500">{errors.companyName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="entityType">ประเภทผู้ประกอบการ <span className="text-red-500">*</span></Label>
          <select id="entityType" value={formData.entityType} onChange={(e) => { setFormData({ ...formData, entityType: e.target.value }); clearError("entityType"); }} className={`flex h-11 w-full rounded-md border bg-background px-3 text-sm ${errors.entityType ? "border-red-500" : "border-input"}`} disabled={isLoading}>
            <option value="">เลือกประเภท</option>
            <option value="individual">บุคคลธรรมดา</option>
            <option value="juristic">นิติบุคคล</option>
            <option value="partnership">ห้างหุ้นส่วน/คณะบุคคล</option>
          </select>
          {errors.entityType && <p className="text-sm text-red-500">{errors.entityType}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vatRegistered">จดทะเบียนภาษีมูลค่าเพิ่ม (VAT) แล้วหรือยัง <span className="text-red-500">*</span></Label>
          <select id="vatRegistered" value={formData.vatRegistered} onChange={(e) => { setFormData({ ...formData, vatRegistered: e.target.value }); clearError("vatRegistered"); }} className={`flex h-11 w-full rounded-md border bg-background px-3 text-sm ${errors.vatRegistered ? "border-red-500" : "border-input"}`} disabled={isLoading}>
            <option value="">เลือกสถานะ</option>
            <option value="yes">จด VAT แล้ว</option>
            <option value="no">ยังไม่ได้จด VAT / ได้รับยกเว้น</option>
          </select>
          <p className="text-xs text-muted-foreground">เฉพาะผู้จด VAT แล้วจึงจะออกใบกำกับภาษีและเรียกเก็บ VAT ได้</p>
          {errors.vatRegistered && <p className="text-sm text-red-500">{errors.vatRegistered}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-medium">
            เบอร์โทรศัพท์ <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.phone ? "text-red-500" : "text-muted-foreground"}`} />
            <Input
              id="phone"
              type="tel"
              placeholder="08X-XXX-XXXX"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                clearError("phone");
              }}
              className={`pl-10 h-11 ${errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={isLoading}
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            อีเมล <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.email ? "text-red-500" : "text-muted-foreground"}`} />
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                clearError("email");
              }}
              className={`pl-10 h-11 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">
            รหัสผ่าน <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.password ? "text-red-500" : "text-muted-foreground"}`} />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                clearError("password");
              }}
              className={`pl-10 pr-10 h-11 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.confirmPassword ? "text-red-500" : "text-muted-foreground"}`} />
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              value={formData.confirmPassword}
              onChange={(e) => {
                setFormData({ ...formData, confirmPassword: e.target.value });
                clearError("confirmPassword");
              }}
              className={`pl-10 h-11 ${errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={isLoading}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => {
                setAcceptTerms(checked as boolean);
                if (checked) clearError("acceptTerms");
              }}
              disabled={isLoading}
              className={errors.acceptTerms ? "border-red-500" : ""}
            />
            <label
              htmlFor="terms"
              className={`text-sm leading-tight cursor-pointer ${errors.acceptTerms ? "text-red-500" : "text-muted-foreground"}`}
            >
              ฉันได้อ่านและยอมรับ{" "}
              <Link href="/terms" className="text-primary hover:underline">
                เงื่อนไขการใช้งาน
              </Link>{" "}
              และ{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                นโยบายความเป็นส่วนตัว
              </Link>
              {" "}รวมถึงรับทราบว่า AutoBill24 เป็นเพียงระบบจัดทำเอกสาร ไม่ใช่คู่สัญญาหรือตัวกลางในการว่าจ้างและรับชำระเงิน
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-red-500">{errors.acceptTerms}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังสมัครสมาชิก...
            </>
          ) : (
            "สมัครสมาชิกฟรี"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>

      {/* Features */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <p className="text-sm font-medium text-green-800 mb-2">
          สิ่งที่คุณจะได้รับ:
        </p>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✓ ออกใบกำกับภาษี/ใบเสนอราคาได้ทันที</li>
          <li>✓ มีแพ็กเกจ FREE ใช้งานได้ต่อเนื่อง</li>
          <li>✓ ไม่ต้องใส่บัตรเครดิต</li>
        </ul>
      </div>
    </div>
  );
}
