"use client";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { numberToThaiText } from "@/lib/utils/numberToThaiText";

interface DocumentSummaryProps {
  subtotal: number;
  // ส่วนลด 1: ส่วนลดสินค้า
  discount1Type: "fixed" | "percent";
  discount1Value: number;
  discount1Amount: number;
  onDiscount1TypeChange?: (type: "fixed" | "percent") => void;
  onDiscount1ValueChange?: (value: number) => void;
  // ส่วนลด 2: ส่วนลดเพิ่มเติม
  discount2Type: "fixed" | "percent";
  discount2Value: number;
  discount2Amount: number;
  onDiscount2TypeChange?: (type: "fixed" | "percent") => void;
  onDiscount2ValueChange?: (value: number) => void;
  // อื่นๆ
  amountBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  onVatRateChange?: (rate: number) => void;
  readOnly?: boolean;
}

export function DocumentSummary({
  subtotal,
  discount1Type,
  discount1Value,
  discount1Amount,
  onDiscount1TypeChange,
  onDiscount1ValueChange,
  discount2Type,
  discount2Value,
  discount2Amount,
  onDiscount2TypeChange,
  onDiscount2ValueChange,
  amountBeforeVat,
  vatRate,
  vatAmount,
  totalAmount,
  onVatRateChange,
  readOnly = false,
}: DocumentSummaryProps) {
  // ยอดหลังหักส่วนลดสินค้า
  const afterDiscount1 = subtotal - discount1Amount;
  // ยอดหลังหักส่วนลดทั้งหมด
  const afterAllDiscount = afterDiscount1 - discount2Amount;

  return (
    <div className="w-full max-w-md bg-muted/30 rounded-lg p-4 space-y-3">
      {/* Subtotal */}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">รวมเงิน</span>
        <span className="font-medium">{formatCurrency(subtotal)}</span>
      </div>

      {/* Discount 1 - ส่วนลดสินค้า */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">ส่วนลดสินค้า</span>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <select
                value={discount1Type}
                onChange={(e) =>
                  onDiscount1TypeChange?.(e.target.value as "fixed" | "percent")
                }
                className="h-7 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="fixed">บาท</option>
                <option value="percent">%</option>
              </select>
              <Input
                type="number"
                value={discount1Value}
                onChange={(e) =>
                  onDiscount1ValueChange?.(parseFloat(e.target.value) || 0)
                }
                className="w-24 h-7 text-right"
                min={0}
                max={discount1Type === "percent" ? 100 : undefined}
                step={1}
              />
            </div>
          )}
        </div>
        <span className="text-destructive">
          {discount1Amount > 0 ? `-${formatCurrency(discount1Amount)}` : "-"}
        </span>
      </div>

      {/* After Discount 1 */}
      {discount1Amount > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">ยอดหลังหักส่วนลดสินค้า</span>
          <span>{formatCurrency(afterDiscount1)}</span>
        </div>
      )}

      {/* Discount 2 - ส่วนลดเพิ่มเติม */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">ส่วนลดเพิ่มเติม</span>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <select
                value={discount2Type}
                onChange={(e) =>
                  onDiscount2TypeChange?.(e.target.value as "fixed" | "percent")
                }
                className="h-7 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="fixed">บาท</option>
                <option value="percent">%</option>
              </select>
              <Input
                type="number"
                value={discount2Value}
                onChange={(e) =>
                  onDiscount2ValueChange?.(parseFloat(e.target.value) || 0)
                }
                className="w-24 h-7 text-right"
                min={0}
                max={discount2Type === "percent" ? 100 : undefined}
                step={1}
              />
            </div>
          )}
        </div>
        <span className="text-destructive">
          {discount2Amount > 0 ? `-${formatCurrency(discount2Amount)}` : "-"}
        </span>
      </div>

      {/* Display after all discounts */}
      {(discount1Amount > 0 || discount2Amount > 0) && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">ยอดหลังหักส่วนลดทั้งหมด</span>
          <span>{formatCurrency(afterAllDiscount)}</span>
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
                step={1}
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
      <div className="border-t pt-3 space-y-2">
        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">รวมทั้งสิ้น</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(totalAmount)}
          </span>
        </div>
        {/* Thai text */}
        <div className="text-sm text-muted-foreground">
          ({numberToThaiText(totalAmount)})
        </div>
      </div>
    </div>
  );
}
