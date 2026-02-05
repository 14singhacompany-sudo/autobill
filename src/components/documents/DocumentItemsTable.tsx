"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, GripVertical } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DocumentItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent?: number;
  price_includes_vat?: boolean;
}

interface DocumentItemsTableProps {
  items: DocumentItem[];
  onUpdate?: (index: number, item: DocumentItem) => void;
  onRemove?: (index: number) => void;
  readOnly?: boolean;
}

export function DocumentItemsTable({
  items,
  onUpdate,
  onRemove,
  readOnly = false,
}: DocumentItemsTableProps) {
  const calculateItemAmount = (item: DocumentItem) => {
    // แสดงยอดเต็ม (ไม่หักส่วนลด)
    return item.quantity * item.unit_price;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">ยังไม่มีรายการ</p>
        <p className="text-sm text-muted-foreground mt-1">
          เพิ่มรายการด้วยตนเอง หรือใช้ AI แยกข้อมูลอัตโนมัติ
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 font-medium text-sm border-b">
        <div className="col-span-1"></div>
        <div className="col-span-4">รายละเอียด</div>
        <div className="col-span-1 text-center">จำนวน</div>
        <div className="col-span-1 text-center">หน่วย</div>
        <div className="col-span-2 text-right">ราคา/หน่วย</div>
        <div className="col-span-1 text-center text-xs">รวม VAT</div>
        <div className="col-span-2 text-right">จำนวนเงิน</div>
      </div>

      {/* Items */}
      <div className="divide-y">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-muted/20"
          >
            {/* Drag handle & row number */}
            <div className="col-span-1 flex items-center gap-1 text-muted-foreground">
              {!readOnly && (
                <GripVertical className="h-4 w-4 cursor-grab opacity-50" />
              )}
              <span className="text-sm">{index + 1}</span>
            </div>

            {/* Description */}
            <div className="col-span-4">
              {readOnly ? (
                <span>{item.description}</span>
              ) : (
                <Input
                  value={item.description}
                  onChange={(e) =>
                    onUpdate?.(index, { ...item, description: e.target.value })
                  }
                  placeholder="รายละเอียด"
                  className="h-8"
                />
              )}
            </div>

            {/* Quantity */}
            <div className="col-span-1">
              {readOnly ? (
                <span className="block text-center">{item.quantity}</span>
              ) : (
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdate?.(index, {
                      ...item,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-8 text-center"
                  min={0}
                  step={1}
                />
              )}
            </div>

            {/* Unit */}
            <div className="col-span-1">
              {readOnly ? (
                <span className="block text-center">{item.unit}</span>
              ) : (
                <Input
                  value={item.unit}
                  onChange={(e) =>
                    onUpdate?.(index, { ...item, unit: e.target.value })
                  }
                  placeholder="หน่วย"
                  className="h-8 text-center"
                />
              )}
            </div>

            {/* Unit Price */}
            <div className="col-span-2">
              {readOnly ? (
                <span className="block text-right">
                  {formatCurrency(item.unit_price)}
                </span>
              ) : (
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) =>
                    onUpdate?.(index, {
                      ...item,
                      unit_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-8 text-right"
                  min={0}
                  step={1}
                />
              )}
            </div>

            {/* Price Includes VAT */}
            <div className="col-span-1 flex items-center justify-center">
              {readOnly ? (
                <span className="text-xs text-muted-foreground">
                  {item.price_includes_vat ? "ใช่" : "ไม่"}
                </span>
              ) : (
                <Checkbox
                  checked={item.price_includes_vat ?? false}
                  onCheckedChange={(checked) =>
                    onUpdate?.(index, {
                      ...item,
                      price_includes_vat: checked === true,
                    })
                  }
                />
              )}
            </div>

            {/* Amount */}
            <div className="col-span-2 flex items-center justify-end gap-2">
              <span className="font-medium">
                {formatCurrency(calculateItemAmount(item))}
              </span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onRemove?.(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
