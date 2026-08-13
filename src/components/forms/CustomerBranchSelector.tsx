"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerBranchSelectorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  name?: string;
}

export function CustomerBranchSelector({
  value,
  onChange,
  readOnly = false,
  name = "customer_branch_type",
}: CustomerBranchSelectorProps) {
  const isBranch = value !== "" && value !== "00000";

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">สถานประกอบการของผู้ซื้อ</Label>
      <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2">
        <label className={`flex items-center gap-2 text-sm ${readOnly ? "cursor-default" : "cursor-pointer"}`}>
          <input type="radio" name={name} checked={value === ""} onChange={() => onChange("")} className="h-4 w-4 accent-primary" disabled={readOnly} />
          <span>บุคคลธรรมดา/ไม่ระบุ</span>
        </label>
        <label className={`flex items-center gap-2 text-sm ${readOnly ? "cursor-default" : "cursor-pointer"}`}>
          <input type="radio" name={name} checked={value === "00000"} onChange={() => onChange("00000")} className="h-4 w-4 accent-primary" disabled={readOnly} />
          <span>สำนักงานใหญ่</span>
        </label>
        <label className={`flex items-center gap-2 text-sm ${readOnly ? "cursor-default" : "cursor-pointer"}`}>
          <input type="radio" name={name} checked={isBranch} onChange={() => onChange("00001")} className="h-4 w-4 accent-primary" disabled={readOnly} />
          <span>สาขา</span>
        </label>
        {isBranch && (
          <Input value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="00001" className="h-10 w-24" inputMode="numeric" readOnly={readOnly} disabled={readOnly} />
        )}
      </div>
      {value === "" && <p className="text-xs text-muted-foreground">เอกสารจะไม่แสดงคำว่า สำนักงานใหญ่ หรือสาขา</p>}
    </div>
  );
}
