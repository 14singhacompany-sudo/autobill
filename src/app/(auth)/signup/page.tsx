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
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    companyName: "",
    phone: "",
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "กรุณากรอกชื่อ-นามสกุล";
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = "กรุณากรอกชื่อบริษัท/ร้านค้า";
    }

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
            description: "ยินดีต้อนรับสู่ Auto Bill",
          });
          router.push("/dashboard");
          router.refresh();
        } else {
          // Email confirmation required
          toast({
            title: "สมัครสมาชิกสำเร็จ!",
            description: "กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
          });
          router.push("/login");
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">สมัครสมาชิก</h2>
      <p className="text-center text-muted-foreground mb-6">
        ทดลองใช้ฟรี 14 วัน ครบทุกฟีเจอร์
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
              ฉันยอมรับ{" "}
              <Link href="/terms" className="text-primary hover:underline">
                เงื่อนไขการใช้งาน
              </Link>{" "}
              และ{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                นโยบายความเป็นส่วนตัว
              </Link>
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
          <li>✓ ทดลองใช้ฟรี 14 วัน ครบทุกฟีเจอร์</li>
          <li>✓ ไม่ต้องใส่บัตรเครดิต</li>
        </ul>
      </div>
    </div>
  );
}
