"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegistryCompany } from "@/lib/company-registry";

type LookupState = "idle" | "loading" | "found" | "not-found" | "error";

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
        if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
        const result = await response.json();
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
        if (requestId === requestRef.current) setState("error");
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
  if (state === "error") return <p className="text-xs text-muted-foreground">ค้นข้อมูลไม่ได้ชั่วคราว สามารถกรอกข้อมูลเองได้</p>;

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

