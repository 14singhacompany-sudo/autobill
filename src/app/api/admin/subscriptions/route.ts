import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { activePeriod, thailandEndOfDay, toDateOnly } from "@/lib/subscription-period";

/**
 * API to update subscription (Admin only)
 * Uses service role to bypass RLS
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (via ADMIN_EMAILS first, then admins table)
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
    let isAdmin = user.email && adminEmails.includes(user.email);

    if (!isAdmin) {
      // Check admins table
      const { data: adminRecord } = await supabase
        .from("admins")
        .select("id, role")
        .eq("user_id", user.id)
        .single();

      isAdmin = !!adminRecord;
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { subscription_id, plan_id, status, trial_ends_at, current_period_end, billing_months } = body;

    if (!subscription_id) {
      return NextResponse.json({ error: "subscription_id is required" }, { status: 400 });
    }

    const allowedStatuses = ["trial", "active", "cancelled", "expired", "past_due"];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid subscription status" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: currentSubscription, error: currentError } = await adminClient
      .from("subscriptions")
      .select("status, trial_ends_at, current_period_end, plan_id")
      .eq("id", subscription_id)
      .single();
    if (currentError || !currentSubscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    let selectedPlan = null;
    if (plan_id) {
      const { data, error } = await adminClient
        .from("plans")
        .select("id, name, price_monthly")
        .eq("id", plan_id)
        .single();
      if (error || !data) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      selectedPlan = data;
    }

    // Build update data. Date calculations live here so every admin screen follows one rule.
    const updateData: Record<string, any> = {};

    if (status) {
      updateData.status = status;
    }

    if (plan_id) {
      updateData.plan_id = plan_id;
    }

    if (status === "trial") {
      const defaultTrialEnd = new Date();
      defaultTrialEnd.setUTCDate(defaultTrialEnd.getUTCDate() + 14);
      updateData.trial_ends_at = trial_ends_at
        ? thailandEndOfDay(trial_ends_at)
        : new Date(currentSubscription.trial_ends_at || defaultTrialEnd).toISOString();
      updateData.current_period_start = null;
      updateData.current_period_end = null;
      updateData.cancelled_at = null;
    } else if (status === "active") {
      updateData.trial_ends_at = null;
      updateData.cancelled_at = null;
      const plan = selectedPlan || (await adminClient.from("plans").select("name, price_monthly").eq("id", currentSubscription.plan_id).single()).data;
      if (plan?.name === "free" || Number(plan?.price_monthly) === 0) {
        updateData.current_period_start = null;
        updateData.current_period_end = null;
      } else if (current_period_end) {
        updateData.current_period_start = currentSubscription.status === "active"
          ? undefined
          : toDateOnly(new Date());
        updateData.current_period_end = toDateOnly(current_period_end);
      } else if (billing_months || currentSubscription.status !== "active") {
        Object.assign(updateData, activePeriod(
          new Date(),
          Number(billing_months) || 1,
          currentSubscription.status === "active" ? currentSubscription.current_period_end : null
        ));
      }
    } else if (status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await adminClient
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscription_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating subscription:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Error in subscription update:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
