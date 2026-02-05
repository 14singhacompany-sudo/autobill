"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Search, LogOut, Settings, CreditCard, Clock, FileText, Receipt, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useNotificationStore, type Alert } from "@/stores/notificationStore";

interface HeaderProps {
  title?: string;
}

interface UserProfile {
  email: string;
  fullName: string;
  companyName: string;
  avatarUrl?: string;
}

interface SubscriptionInfo {
  planName: string;
  status: string;
  daysRemaining: number;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { alerts, fetchAlerts } = useNotificationStore();

  useEffect(() => {
    // Fetch notifications when header mounts
    fetchAlerts();

    const fetchUserData = async () => {
      const supabase = createClient();

      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          // Get profile data
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();

          // Get company data
          const { data: company } = await supabase
            .from("companies")
            .select("*")
            .eq("user_id", authUser.id)
            .single();

          setUser({
            email: authUser.email || "",
            fullName: profile?.full_name || authUser.user_metadata?.full_name || "ผู้ใช้งาน",
            companyName: company?.name || authUser.user_metadata?.company_name || "",
            avatarUrl: profile?.avatar_url,
          });

          // Get subscription data
          if (company) {
            const { data: sub } = await supabase
              .from("subscriptions")
              .select(`
                *,
                plans (name, display_name)
              `)
              .eq("company_id", company.id)
              .single();

            if (sub) {
              let daysRemaining = 0;

              if (sub.status === "trial" && sub.trial_ends_at) {
                const trialEnd = new Date(sub.trial_ends_at);
                const now = new Date();
                daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              } else if (sub.current_period_end) {
                const periodEnd = new Date(sub.current_period_end);
                const now = new Date();
                daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              }

              setSubscription({
                planName: sub.plans?.display_name || "FREE",
                status: sub.status,
                daysRemaining,
                trialEndsAt: sub.trial_ends_at,
                currentPeriodEnd: sub.current_period_end,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (subscription.status === "trial") {
      return (
        <div className={cn(
          "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
          subscription.daysRemaining <= 3 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
        )}>
          <Clock className="h-3 w-3" />
          <span>ทดลองใช้เหลือ {subscription.daysRemaining} วัน</span>
        </div>
      );
    }

    if (subscription.status === "active") {
      return (
        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
          <span>{subscription.planName}</span>
        </div>
      );
    }

    if (subscription.status === "expired") {
      return (
        <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
          <span>หมดอายุ</span>
        </div>
      );
    }

    return null;
  };

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "invoice_overdue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "quotation_expiring":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "quotation_pending":
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertLink = (alert: Alert) => {
    if (alert.type === "invoice_overdue") {
      return `/invoices/${alert.documentId}/edit`;
    }
    return `/quotations/${alert.documentId}/edit`;
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา..."
            className="w-64 pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                  {alerts.length > 9 ? "9+" : alerts.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end" forceMount>
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>การแจ้งเตือน</span>
              {alerts.length > 0 && (
                <span className="text-xs text-muted-foreground">{alerts.length} รายการ</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {alerts.map((alert) => (
                  <DropdownMenuItem key={alert.id} asChild>
                    <Link
                      href={getAlertLink(alert)}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer",
                        alert.type === "invoice_overdue" && "bg-red-50"
                      )}
                    >
                      <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          alert.type === "invoice_overdue" && "text-red-700"
                        )}>
                          {alert.documentNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alert.message}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
            {alerts.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="text-center text-sm text-primary cursor-pointer justify-center">
                    ดูทั้งหมดในแดชบอร์ด
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user ? getInitials(user.fullName) : "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">{user?.fullName || "กำลังโหลด..."}</p>
                  {getStatusBadge()}
                </div>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                {user?.companyName && (
                  <p className="text-xs text-muted-foreground">{user.companyName}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Subscription Info */}
            {subscription && (
              <>
                <div className="px-2 py-2">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">แพ็คเกจปัจจุบัน</span>
                      <span className="text-xs font-semibold text-primary">{subscription.planName}</span>
                    </div>
                    {subscription.status === "trial" && (
                      <div className="text-xs text-muted-foreground">
                        ทดลองใช้เหลืออีก <span className={cn(
                          "font-semibold",
                          subscription.daysRemaining <= 3 ? "text-red-600" : "text-blue-600"
                        )}>{subscription.daysRemaining} วัน</span>
                      </div>
                    )}
                    {subscription.status === "active" && subscription.daysRemaining > 0 && (
                      <div className="text-xs text-muted-foreground">
                        ต่ออายุในอีก {subscription.daysRemaining} วัน
                      </div>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Admin link - เฉพาะ 14singhacompany@gmail.com */}
            {user?.email === "14singhacompany@gmail.com" && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer text-purple-600 focus:text-purple-600">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  <span>จัดการระบบ (Admin)</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/pricing" className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                <span>อัพเกรดแพ็คเกจ</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>ตั้งค่า</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
