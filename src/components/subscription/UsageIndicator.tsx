"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { FileText, AlertTriangle, Crown, Clock, Brain } from "lucide-react";
import Link from "next/link";

export function UsageIndicator() {
  const {
    subscription,
    usage,
    isLoading,
    fetchSubscription,
    fetchUsage,
    getTrialDaysRemaining,
    isTrialExpired,
  } = useSubscriptionStore();

  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, [fetchSubscription, fetchUsage]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const trialDays = getTrialDaysRemaining();
  const trialExpired = isTrialExpired();

  // Calculate percentages
  const invoicePercent = usage?.invoice_limit
    ? Math.min(100, ((usage?.invoice_count || 0) / usage.invoice_limit) * 100)
    : 0;
  const quotationPercent = usage?.quotation_limit
    ? Math.min(100, ((usage?.quotation_count || 0) / usage.quotation_limit) * 100)
    : 0;
  const aiPercent = usage?.ai_extraction_limit
    ? Math.min(100, ((usage?.ai_extraction_count || 0) / usage.ai_extraction_limit) * 100)
    : 0;

  const isNearLimit = invoicePercent >= 80 || quotationPercent >= 80 || aiPercent >= 80;
  const isAtLimit = invoicePercent >= 100 || quotationPercent >= 100 || aiPercent >= 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            {subscription.plan?.display_name || "FREE"}
          </span>
          {subscription.status === "trial" && !trialExpired && (
            <span className="text-sm font-normal text-blue-600 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              เหลือ {trialDays} วัน
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trial Expired Warning */}
        {trialExpired && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Trial หมดอายุแล้ว</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              กรุณาอัพเกรดเพื่อใช้งานต่อ
            </p>
          </div>
        )}

        {/* Usage Stats */}
        <div className="space-y-3">
          {/* Invoice Usage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                ใบกำกับภาษี
              </span>
              <span className="font-medium">
                {usage?.invoice_count || 0}
                {usage?.invoice_limit ? ` / ${usage.invoice_limit}` : " (ไม่จำกัด)"}
              </span>
            </div>
            {usage?.invoice_limit && (
              <Progress
                value={invoicePercent}
                className={`h-2 ${invoicePercent >= 100 ? "[&>div]:bg-red-500" : invoicePercent >= 80 ? "[&>div]:bg-yellow-500" : ""}`}
              />
            )}
          </div>

          {/* Quotation Usage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                ใบเสนอราคา
              </span>
              <span className="font-medium">
                {usage?.quotation_count || 0}
                {usage?.quotation_limit ? ` / ${usage.quotation_limit}` : " (ไม่จำกัด)"}
              </span>
            </div>
            {usage?.quotation_limit && (
              <Progress
                value={quotationPercent}
                className={`h-2 ${quotationPercent >= 100 ? "[&>div]:bg-red-500" : quotationPercent >= 80 ? "[&>div]:bg-yellow-500" : ""}`}
              />
            )}
          </div>

          {/* AI Extraction Usage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-muted-foreground" />
                AI Extract
              </span>
              <span className="font-medium">
                {usage?.ai_extraction_count || 0}
                {usage?.ai_extraction_limit ? ` / ${usage.ai_extraction_limit}` : " (ไม่จำกัด)"}
              </span>
            </div>
            {usage?.ai_extraction_limit && (
              <Progress
                value={aiPercent}
                className={`h-2 ${aiPercent >= 100 ? "[&>div]:bg-red-500" : aiPercent >= 80 ? "[&>div]:bg-yellow-500" : ""}`}
              />
            )}
          </div>
        </div>

        {/* Warning Messages */}
        {isAtLimit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">ถึงขีดจำกัดแล้ว</span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              อัพเกรดเพื่อออกเอกสารเพิ่มเติม
            </p>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">ใกล้ถึงขีดจำกัด</span>
            </div>
            <p className="text-xs text-yellow-600 mt-1">
              พิจารณาอัพเกรดแพ็คเกจ
            </p>
          </div>
        )}

        {/* Upgrade Button */}
        {(subscription.plan?.name === "free" || subscription.status === "trial") && (
          <Link href="/pricing">
            <Button className="w-full" variant={isAtLimit || trialExpired ? "default" : "outline"}>
              <Crown className="h-4 w-4 mr-2" />
              อัพเกรดแพ็คเกจ
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
