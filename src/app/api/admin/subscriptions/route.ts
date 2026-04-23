import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    const { subscription_id, plan_id, status, trial_ends_at, current_period_end } = body;

    if (!subscription_id) {
      return NextResponse.json({ error: "subscription_id is required" }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, any> = {};

    if (status) {
      updateData.status = status;
    }

    if (plan_id) {
      updateData.plan_id = plan_id;
    }

    if (trial_ends_at) {
      updateData.trial_ends_at = trial_ends_at;
    }

    if (current_period_end) {
      updateData.current_period_end = current_period_end;
    }

    updateData.updated_at = new Date().toISOString();

    // Use admin client with service role key to bypass RLS
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      // Service role key not configured, fallback to regular client
      console.warn("Admin client not available, using regular client");
      adminClient = supabase;
    }

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
