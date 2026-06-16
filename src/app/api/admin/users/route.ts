import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * API to get all users with their subscriptions (Admin only)
 * Uses service role to bypass RLS
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
    let isAdmin = user.email && adminEmails.includes(user.email);

    if (!isAdmin) {
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

    // Use admin client to bypass RLS
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch {
      console.warn("Admin client not available, using regular client");
      adminClient = supabase;
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, phone, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch details for each user
    const usersWithDetails = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Get company
        const { data: company, error: companyError } = await adminClient
          .from("companies")
          .select("id, name")
          .eq("user_id", profile.id)
          .single();

        console.log(`[API] User ${profile.email}: company_id = ${company?.id}, error = ${companyError?.message}`);

        // Get subscription (use maybeSingle to handle no results or multiple)
        const { data: subscriptions, error: subError } = await adminClient
          .from("subscriptions")
          .select("id, status, trial_ends_at, current_period_end, plan_id, plan:plans(id, display_name)")
          .eq("company_id", company?.id || "")
          .order("created_at", { ascending: false })
          .limit(1);

        const subscription = subscriptions?.[0] || null;

        console.log(`[API] User ${profile.email}: subscription_id = ${subscription?.id}, subscriptions count = ${subscriptions?.length}, error = ${subError?.message}`);

        // Get invoice count
        const { count: invoiceCount } = await adminClient
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company?.id || "");

        // Get quotation count
        const { count: quotationCount } = await adminClient
          .from("quotations")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company?.id || "");

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || "-",
          phone: profile.phone,
          created_at: profile.created_at,
          company_id: company?.id || null,
          company_name: company?.name || "-",
          plan_id: subscription?.plan_id || null,
          plan_name: (Array.isArray(subscription?.plan) ? subscription?.plan[0]?.display_name : (subscription?.plan as unknown as { id: string; display_name: string } | null)?.display_name) || "FREE",
          status: subscription?.status || "unknown",
          subscription_id: subscription?.id || null,
          invoice_count: invoiceCount || 0,
          quotation_count: quotationCount || 0,
          trial_ends_at: subscription?.trial_ends_at || null,
          current_period_end: subscription?.current_period_end || null,
        };
      })
    );

    return NextResponse.json({ users: usersWithDetails });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
