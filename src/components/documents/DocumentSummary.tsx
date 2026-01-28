"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface DocumentSummaryProps {
  subtotal: number;
  discountType: "fixed" | "percent";
  discountValue: number;
  discountAmount: number;
  amountBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  onDiscountTypeChange?: (type: "fixed" | "percent") => void;
  onDiscountValueChange?: (value: number) => void;
  onVatRateChange?: (rate: number) => void;
  readOnly?: boolean;
}

export function DocumentSummary({
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  amountBeforeVat,
  vatRate,
  vatAmount,
  totalAmount,
  onDiscountTypeChange,
  onDiscountValueChange,
  onVatRateChange,
  readOnly = false,
}: DocumentSummaryProps) {
  // ยอดหลังหักส่วนลด (ราคาที่แสดง)
  const displayAfterDiscount = subtotal - discountAmount;

  return (
    <div className="w-full max-w-md bg-muted/30 rounded-lg p-4 space-y-3">
      {/* Subtotal */}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">รวมเงิน</span>
        <span className="font-medium">{formatCurrency(subtotal)}</span>
      </div>

      {/* Discount */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">ส่วนลด</span>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <select
                value={discountType}
                onChange={(e) =>
                  onDiscountTypeChange?.(e.target.value as "fixed" | "percent")
                }
                className="h-7 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="fixed">บาท</option>
                <option value="percent">%</option>
              </select>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) =>
                  onDiscountValueChange?.(parseFloat(e.target.value) || 0)
                }
                className="w-24 h-7 text-right"
                min={0}
                max={discountType === "percent" ? 100 : undefined}
                step={0.01}
              />
            </div>
          )}
        </div>
        <span className="text-destructive">
          {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : "-"}
        </span>
      </div>

      {/* Display after discount */}
      {discountAmount > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">ยอดหลังหักส่วนลด</span>
          <span>{formatCurrency(displayAfterDiscount)}</span>
        </div>
      )}

      {/* Amount before VAT */}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">มูลค่าก่อน VAT</span>
        <span>{formatCurrency(amountBeforeVat)}</span>
      </div>

      {/* VAT */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">VAT</span>
          {!readOnly ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={vatRate}
                onChange={(e) =>
                  onVatRateChange?.(parseFloat(e.target.value) || 0)
                }
                className="w-16 h-7 text-right"
                min={0}
                max={100}
                step={0.01}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{vatRate}%</span>
          )}
        </div>
        <span>{formatCurrency(vatAmount)}</span>
      </div>

      {/* Divider */}
      <div className="border-t pt-3">
        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">รวมทั้งสิ้น</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
