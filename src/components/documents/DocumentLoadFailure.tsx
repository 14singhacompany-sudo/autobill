"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";

export function useLoadTimeout(isLoading: boolean, timeoutMs = 15_000) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  return timedOut;
}

interface DocumentLoadFailureProps {
  title: string;
  message: string;
  backHref: string;
  onRetry?: () => void;
}

export function DocumentLoadFailure({ title, message, backHref, onRetry }: DocumentLoadFailureProps) {
  const router = useRouter();
  return (
    <div>
      <Header title={title} />
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-600" />
          <h2 className="text-lg font-semibold">โหลดข้อมูลไม่สำเร็จ</h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push(backHref)}>กลับหน้ารายการ</Button>
            <Button onClick={onRetry || (() => window.location.reload())}>ลองโหลดใหม่</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface IssuerProfileRequiredProps {
  title: string;
  missingFields: string[];
  backHref: string;
}

export function IssuerProfileRequired({ title, missingFields, backHref }: IssuerProfileRequiredProps) {
  const router = useRouter();
  return (
    <div>
      <Header title={title} />
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          <h2 className="text-lg font-semibold">กรุณาตั้งค่าข้อมูลผู้ออกเอกสารก่อน</h2>
          <p className="mt-2 text-sm text-muted-foreground">ยังขาด: {missingFields.join(", ")}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push(backHref)}>กลับหน้ารายการ</Button>
            <Button onClick={() => router.push("/settings")}>ไปหน้าตั้งค่า</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
