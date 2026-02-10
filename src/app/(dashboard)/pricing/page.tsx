"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { Check, Crown, Zap, Building } from "lucide-react";

export default function PricingPage() {
  const { plans, subscription, fetchPlans, fetchSubscription } = useSubscriptionStore();

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, [fetchPlans, fetchSubscription]);

  const getIcon = (planName: string) => {
    switch (planName) {
      case "free":
        return <Zap className="h-6 w-6" />;
      case "solo":
        return <Crown className="h-6 w-6" />;
      case "pro":
        return <Building className="h-6 w-6" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  const getIconColor = (planName: string) => {
    switch (planName) {
      case "free":
        return "text-gray-500";
      case "solo":
        return "text-blue-500";
      case "pro":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  const getBorderColor = (planName: string) => {
    switch (planName) {
      case "solo":
        return "border-blue-500 border-2";
      case "pro":
        return "border-purple-500 border-2";
      default:
        return "";
    }
  };

  const isCurrentPlan = (planId: string) => {
    return subscription?.plan_id === planId;
  };

  return (
    <div>
      <Header title="แพ็คเกจและราคา" />

      <div className="p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">เลือกแพ็คเกจที่เหมาะกับคุณ</h1>
          <p className="text-muted-foreground">
            เริ่มต้นฟรี อัพเกรดเมื่อพร้อม
          </p>
        </div>

        {/* Current Plan Info */}
        {subscription && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-blue-700">
              แพ็คเกจปัจจุบันของคุณ:{" "}
              <span className="font-bold">{subscription.plan?.display_name}</span>
              {subscription.status === "trial" && (
                <span className="ml-2">(ทดลองใช้)</span>
              )}
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${getBorderColor(plan.name)} ${
                isCurrentPlan(plan.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              {plan.name === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  แนะนำ
                </div>
              )}

              {isCurrentPlan(plan.id) && (
                <div className="absolute -top-3 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                  ปัจจุบัน
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div
                  className={`mx-auto p-3 rounded-full bg-gray-100 w-fit ${getIconColor(plan.name)}`}
                >
                  {getIcon(plan.name)}
                </div>
                <CardTitle className="mt-4">{plan.display_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ฿{plan.price_monthly.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">/เดือน</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 text-left mb-6">
                  {(plan.features as string[]).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrentPlan(plan.id) ? (
                  <Button disabled className="w-full">
                    แพ็คเกจปัจจุบัน
                  </Button>
                ) : plan.price_monthly === 0 ? (
                  <Button variant="outline" className="w-full" disabled>
                    ฟรีตลอดชีพ
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.name === "pro" ? "default" : "outline"}
                  >
                    {subscription?.plan?.name === "free" || subscription?.status === "trial"
                      ? "อัพเกรด"
                      : "เลือกแพ็คเกจนี้"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Info */}
        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-6">
              <h3 className="font-semibold mb-2">การชำระเงิน</h3>
              <p className="text-sm text-muted-foreground mb-4">
                หลังจากเลือกแพ็คเกจ กรุณาโอนเงินมาที่บัญชีด้านล่าง แล้วแจ้งสลิปมาทาง LINE
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p>
                  <strong>ธนาคาร:</strong> กสิกรไทย
                </p>
                <p>
                  <strong>เลขบัญชี:</strong> XXX-X-XXXXX-X
                </p>
                <p>
                  <strong>ชื่อบัญชี:</strong> บริษัท ออโต้บิล จำกัด
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                * หลังจากตรวจสอบการชำระเงิน ทีมงานจะอัพเกรดแพ็คเกจให้ภายใน 24 ชั่วโมง
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
