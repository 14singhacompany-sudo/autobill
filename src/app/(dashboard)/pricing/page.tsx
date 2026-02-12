"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscriptionStore, Plan } from "@/stores/subscriptionStore";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { Check, Crown, Zap, Building, Sparkles } from "lucide-react";

export default function PricingPage() {
  const { plans, subscription, fetchPlans, fetchSubscription } = useSubscriptionStore();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, [fetchPlans, fetchSubscription]);

  const handleUpgradeClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setUpgradeModalOpen(true);
  };

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
        return "border-blue-500";
      case "pro":
        return "border-purple-500";
      default:
        return "border-gray-200";
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
          <p className="text-muted-foreground mb-4">
            เริ่มต้นฟรี อัพเกรดเมื่อพร้อม
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm">
            <Sparkles className="w-4 h-4" />
            ทุกแพ็คเกจใช้ AI ดึงข้อมูลลูกค้าได้ ต่างกันแค่จำนวนบิล
          </div>
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
        <div className="flex flex-col lg:flex-row gap-4 justify-center mt-4 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative w-full lg:flex-1 transition-all duration-200 cursor-pointer
                ${getBorderColor(plan.name)}
                ${isCurrentPlan(plan.id) ? "ring-2 ring-primary" : ""}
                ${!isCurrentPlan(plan.id) && plan.price_monthly > 0
                  ? "hover:shadow-lg hover:scale-[1.02] hover:border-primary"
                  : ""
                }`}
              onClick={() => {
                if (!isCurrentPlan(plan.id) && plan.price_monthly > 0) {
                  handleUpgradeClick(plan);
                }
              }}
            >
              {plan.name === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10">
                  แนะนำ
                </div>
              )}

              {isCurrentPlan(plan.id) && (
                <div className="absolute -top-3 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                  ปัจจุบัน
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div
                  className={`mx-auto p-3 rounded-full bg-gray-100 w-fit ${getIconColor(plan.name)}`}
                >
                  {getIcon(plan.name)}
                </div>
                <CardTitle className="mt-4 text-xl">{plan.display_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ฿{plan.price_monthly.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-lg">
                    {plan.price_monthly === 0 ? "" : "/เดือน"}
                  </span>
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
                <div className="mt-6">
                  {isCurrentPlan(plan.id) ? (
                    <Button disabled className="w-full h-12 text-base">
                      แพ็คเกจปัจจุบัน
                    </Button>
                  ) : plan.price_monthly === 0 ? (
                    <Button variant="outline" className="w-full h-12 text-base" disabled>
                      ฟรีตลอดชีพ
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-12 text-base"
                      variant={plan.name === "pro" ? "default" : "outline"}
                      onClick={() => handleUpgradeClick(plan)}
                    >
                      {subscription?.plan?.name === "free" || subscription?.status === "trial"
                        ? "อัพเกรด"
                        : "เลือกแพ็คเกจนี้"}
                    </Button>
                  )}
                </div>
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
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
                <div className="flex flex-col items-center gap-2 mb-4 pb-4 border-b border-green-200">
                  <img
                    src="https://www.kasikornbank.com/SiteCollectionDocuments/about/img/logo/logo.png"
                    alt="ธนาคารกสิกรไทย"
                    className="w-14 h-14 object-contain"
                  />
                  <div className="text-center">
                    <p className="font-bold text-green-800 text-lg">ธนาคารกสิกรไทย</p>
                    <p className="text-green-600 text-xs">KASIKORNBANK</p>
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <div>
                    <span className="text-gray-600 text-sm">เลขบัญชี</span>
                    <p className="font-mono font-bold text-2xl text-green-800">076-8-39366-4</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">ชื่อบัญชี</span>
                    <p className="font-semibold text-lg text-green-800">ธนวรรท วานิชกุล</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                * หลังจากตรวจสอบการชำระเงิน ทีมงานจะอัพเกรดแพ็คเกจให้ภายใน 24 ชั่วโมง
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        plan={selectedPlan}
      />
    </div>
  );
}
