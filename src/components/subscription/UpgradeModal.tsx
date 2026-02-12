"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plan } from "@/stores/subscriptionStore";
import { Check, Copy, CheckCircle2 } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}

const DURATION_OPTIONS = [
  { months: 1, label: "1 เดือน", discount: 0 },
  { months: 3, label: "3 เดือน", discount: 0 },
  { months: 6, label: "6 เดือน", discount: 5 },
  { months: 12, label: "12 เดือน", discount: 10 },
];

const BANK_INFO = {
  name: "ธนาคารกสิกรไทย",
  nameEn: "KASIKORNBANK",
  accountNumber: "076-8-39366-4",
  accountName: "ธนวรรท วานิชกุล",
  logo: "https://www.kasikornbank.com/SiteCollectionDocuments/about/img/logo/logo.png",
};

export function UpgradeModal({ open, onOpenChange, plan }: UpgradeModalProps) {
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [copied, setCopied] = useState(false);

  const selectedOption = useMemo(
    () => DURATION_OPTIONS.find((o) => o.months === selectedDuration) || DURATION_OPTIONS[0],
    [selectedDuration]
  );

  const pricing = useMemo(() => {
    if (!plan) return { original: 0, discounted: 0, savings: 0 };

    const original = plan.price_monthly * selectedOption.months;
    const discountAmount = (original * selectedOption.discount) / 100;
    const discounted = original - discountAmount;

    return {
      original,
      discounted,
      savings: discountAmount,
    };
  }, [plan, selectedOption]);

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(BANK_INFO.accountNumber.replace(/-/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            อัพเกรดเป็น {plan.display_name}
          </DialogTitle>
          <DialogDescription className="text-center">
            เลือกระยะเวลาที่ต้องการสมัคร
          </DialogDescription>
        </DialogHeader>

        {/* Duration Selection */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.months}
              onClick={() => setSelectedDuration(option.months)}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                selectedDuration === option.months
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {option.discount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  -{option.discount}%
                </span>
              )}
              <p className="font-semibold">{option.label}</p>
              <p className="text-sm text-muted-foreground">
                ฿{(plan.price_monthly * option.months * (1 - option.discount / 100)).toLocaleString()}
              </p>
            </button>
          ))}
        </div>

        {/* Price Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">แพ็คเกจ {plan.display_name}</span>
            <span>฿{plan.price_monthly.toLocaleString()} x {selectedOption.months} เดือน</span>
          </div>

          {selectedOption.discount > 0 && (
            <>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>ราคาปกติ</span>
                <span className="line-through">฿{pricing.original.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-green-600">
                <span>ส่วนลด {selectedOption.discount}%</span>
                <span>-฿{pricing.savings.toLocaleString()}</span>
              </div>
            </>
          )}

          <div className="flex justify-between items-center mt-2 pt-2 border-t font-bold text-lg">
            <span>รวมทั้งสิ้น</span>
            <span className="text-primary">฿{pricing.discounted.toLocaleString()}</span>
          </div>
        </div>

        {/* Bank Info */}
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
          <div className="flex flex-col items-center gap-2 mb-3 pb-3 border-b border-green-200">
            <img
              src={BANK_INFO.logo}
              alt={BANK_INFO.name}
              className="w-12 h-12 object-contain"
            />
            <div className="text-center">
              <p className="font-bold text-green-800">{BANK_INFO.name}</p>
              <p className="text-green-600 text-xs">{BANK_INFO.nameEn}</p>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <div>
              <span className="text-gray-600 text-sm">เลขบัญชี</span>
              <div className="flex items-center justify-center gap-2">
                <p className="font-mono font-bold text-xl text-green-800">
                  {BANK_INFO.accountNumber}
                </p>
                <button
                  onClick={handleCopyAccount}
                  className="p-1.5 hover:bg-green-200 rounded-md transition-colors"
                  title="คัดลอกเลขบัญชี"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-green-600" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <span className="text-gray-600 text-sm">ชื่อบัญชี</span>
              <p className="font-semibold text-green-800">{BANK_INFO.accountName}</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>หลังโอนเงินแล้ว กรุณาแจ้งสลิปมาทาง LINE</p>
          <p className="mt-1">ทีมงานจะอัพเกรดแพ็คเกจให้ภายใน 24 ชั่วโมง</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            ปิด
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              // TODO: Open LINE or copy payment details
              onOpenChange(false);
            }}
          >
            เข้าใจแล้ว
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
