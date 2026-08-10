"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegistryCompany } from "@/lib/company-registry";

type LookupState = "idle" | "loading" | "found" | "not-found" | "unavailable";

interface CompanyLookupProps {
  taxId: string;
  disabled?: boolean;
  onUseCompany: (company: RegistryCompany) => void;
}

export function CompanyLookup({ taxId, disabled, onUseCompany }: CompanyLookupProps) {
  const [state, setState] = useState<LookupState>("idle");
  const [company, setCompany] = useState<RegistryCompany | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    setCompany(null);
    if (!/^\d{13}$/.test(taxId)) {
      setState("idle");
      return;
    }

    const requestId = ++requestRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState("loading");
      try {
        const response = await fetch(`/api/company/${taxId}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const result = await response.json();
        if (result.temporarilyUnavailable) {
          setState("unavailable");
          return;
        }
        if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
        if (requestId !== requestRef.current) return;
        if (result.found && result.company) {
          setCompany(result.company);
          setState("found");
        } else {
          setState("not-found");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Company lookup failed:", error);
        if (requestId === requestRef.current) setState("unavailable");
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [taxId]);

  if (state === "idle") return null;
  if (state === "loading") {
    return <p className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />กำลังค้นข้อมูล...</p>;
  }
  if (state === "not-found") return <p className="text-xs text-muted-foreground">ไม่พบข้อมูลนิติบุคคล สามารถกรอกข้อมูลเองได้</p>;
  if (state === "unavailable") return <p className="text-xs text-orange-600">ติดต่อฐานข้อมูล DBD ไม่ได้ชั่วคราว ไม่ได้หมายความว่าไม่พบบริษัท กรุณาลองใหม่ภายหลังหรือกรอกเองได้</p>;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2 text-xs">
      <div className="min-w-0">
        <p className="font-medium text-foreground">พบข้อมูลนิติบุคคล</p>
        <p className="truncate text-muted-foreground">{company?.name_th}{company?.status ? ` · ${company.status}` : ""}</p>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => company && onUseCompany(company)}>
        ใช้ข้อมูลที่ค้นพบ
      </Button>
    </div>
  );
}
