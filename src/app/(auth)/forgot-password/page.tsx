"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setIsEmailSent(true);
      toast({
        title: "ส่งอีเมลสำเร็จ",
        description: "กรุณาตรวจสอบอีเมลของคุณ",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">ตรวจสอบอีเมลของคุณ</h2>
        <p className="text-muted-foreground mb-6">
          เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปที่
          <br />
          <span className="font-medium text-foreground">{email}</span>
        </p>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsEmailSent(false)}
          >
            ส่งอีเมลอีกครั้ง
          </Button>
          <Link href="/login">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับไปหน้าเข้าสู่ระบบ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-2">ลืมรหัสผ่าน?</h2>
      <p className="text-center text-muted-foreground mb-6">
        กรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้
      </p>

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังส่งอีเมล...
            </>
          ) : (
            "ส่งลิงก์รีเซ็ตรหัสผ่าน"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
