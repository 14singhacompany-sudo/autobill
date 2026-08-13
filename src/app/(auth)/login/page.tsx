"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<{ title: string; description: string } | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();
        const isEmailNotConfirmed = errorMessage.includes("email not confirmed")
          || errorMessage.includes("email_not_confirmed")
          || errorMessage.includes("not confirmed");
        const message = isEmailNotConfirmed
          ? {
              title: "ยังไม่ได้ยืนยันอีเมล",
              description: `กรุณาเปิดอีเมลที่ส่งไปยัง ${formData.email.trim()} แล้วกดลิงก์ยืนยันการใช้งานก่อนเข้าสู่ระบบ หากไม่พบให้ตรวจสอบโฟลเดอร์สแปมหรืออีเมลขยะ`,
            }
          : {
              title: "เข้าสู่ระบบไม่สำเร็จ",
              description: error.message === "Invalid login credentials"
                ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
                : error.message,
            };
        setLoginError(message);
        toast({
          title: message.title,
          description: message.description,
          variant: "destructive",
        });
        return;
      }

      if (data.session) {
        toast({
          title: "เข้าสู่ระบบสำเร็จ",
          description: "กำลังเปลี่ยนหน้า...",
        });
        // Force full page reload to ensure cookies are set properly
        window.location.replace("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">เข้าสู่ระบบ</h2>

      {loginError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-800">{loginError.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-red-700">{loginError.description}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            อีเมล
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="pl-10 h-11"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">
            รหัสผ่าน
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="pl-10 pr-10 h-11"
              required
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
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังเข้าสู่ระบบ...
            </>
          ) : (
            "เข้าสู่ระบบ"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          ยังไม่มีบัญชี?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </div>

      {/* Trial Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800 text-center">
          🎉 สมัครวันนี้ เริ่มใช้งานแพ็กเกจ FREE ได้เลย
        </p>
      </div>
    </div>
  );
}
