import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];
  let isAdmin = Boolean(user.email && adminEmails.includes(user.email));
  if (!isAdmin) {
    const { data } = await supabase.from("admins").select("id").eq("user_id", user.id).single();
    isAdmin = Boolean(data);
  }
  if (!isAdmin) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user, adminClient: createAdminClient() };
}

/**
 * API to get all users with their subscriptions (Admin only)
 * Uses service role to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { adminClient } = auth;
    const requestedMonth = new URL(request.url).searchParams.get("month") || "";
    const month = /^\d{4}-\d{2}$/.test(requestedMonth)
      ? requestedMonth
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date());
    const [year, monthNumber] = month.split("-").map(Number);
    const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1) - 7 * 60 * 60 * 1000).toISOString();
    const monthEnd = new Date(Date.UTC(year, monthNumber, 1) - 7 * 60 * 60 * 1000).toISOString();

    const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authUsersError) throw authUsersError;
    const authUserMap = new Map(authUsers.users.map((item) => [item.id, item]));

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
          .select("id, status, trial_ends_at, current_period_end, plan_id, plan:plans(id, display_name, document_limit)")
          .eq("company_id", company?.id || "")
          .order("created_at", { ascending: false })
          .limit(1);

        const subscription = subscriptions?.[0] || null;

        console.log(`[API] User ${profile.email}: subscription_id = ${subscription?.id}, subscriptions count = ${subscriptions?.length}, error = ${subError?.message}`);

        const { data: companySettings } = await adminClient
          .from("company_settings")
          .select("id, entity_type, vat_registered")
          .eq("user_id", profile.id)
          .maybeSingle();
        const settingsId = companySettings?.id || "";
        const [{ count: invoiceCount }, { count: quotationCount }, { count: receiptCount }, { count: billingInvoiceCount }] = await Promise.all([
          adminClient.from("invoices").select("*", { count: "exact", head: true }).eq("company_id", settingsId),
          adminClient.from("quotations").select("*", { count: "exact", head: true }).eq("company_id", settingsId),
          adminClient.from("receipts").select("*", { count: "exact", head: true }).eq("company_id", settingsId),
          adminClient.from("billing_invoices").select("*", { count: "exact", head: true }).eq("company_id", settingsId),
        ]);
        const monthlyQuery = (table: "quotations" | "invoices" | "receipts" | "billing_invoices", companyId: string) =>
          adminClient.from(table).select("total_amount,status,created_at")
            .eq("company_id", companyId).gte("created_at", monthStart).lt("created_at", monthEnd)
            .not("status", "in", "(draft,cancelled)");
        const [monthlyQuotations, monthlyInvoices, monthlyReceipts, monthlyBillingInvoices] = await Promise.all([
          monthlyQuery("quotations", settingsId),
          monthlyQuery("invoices", settingsId),
          monthlyQuery("receipts", settingsId),
          monthlyQuery("billing_invoices", settingsId),
        ]);
        const monthlyRows = [
          ...(monthlyQuotations.data || []), ...(monthlyInvoices.data || []),
          ...(monthlyReceipts.data || []), ...(monthlyBillingInvoices.data || []),
        ];
        const { data: monthlyUsage } = await adminClient.from("usage_logs")
          .select("document_count").eq("company_id", company?.id || "")
          .eq("month_year", month).maybeSingle();

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || "-",
          phone: profile.phone,
          created_at: profile.created_at,
          company_id: company?.id || null,
          company_name: company?.name || "-",
          entity_type: companySettings?.entity_type || null,
          vat_registered: companySettings?.vat_registered ?? null,
          terms_accepted_at: authUserMap.get(profile.id)?.user_metadata?.terms_accepted_at || null,
          plan_id: subscription?.plan_id || null,
          plan_name: (Array.isArray(subscription?.plan) ? subscription?.plan[0]?.display_name : (subscription?.plan as unknown as { id: string; display_name: string } | null)?.display_name) || "FREE",
          document_limit: (Array.isArray(subscription?.plan)
            ? subscription?.plan[0]?.document_limit
            : (subscription?.plan as unknown as { document_limit: number | null } | null)?.document_limit) ?? null,
          status: subscription?.status || "unknown",
          subscription_id: subscription?.id || null,
          invoice_count: invoiceCount || 0,
          quotation_count: quotationCount || 0,
          receipt_count: receiptCount || 0,
          billing_invoice_count: billingInvoiceCount || 0,
          total_document_count: (invoiceCount || 0) + (quotationCount || 0) + (receiptCount || 0) + (billingInvoiceCount || 0),
          monthly_issued_count: monthlyRows.length,
          monthly_quota_count: monthlyUsage?.document_count || 0,
          monthly_quotation_count: monthlyQuotations.data?.length || 0,
          monthly_invoice_count: monthlyInvoices.data?.length || 0,
          monthly_receipt_count: monthlyReceipts.data?.length || 0,
          monthly_billing_invoice_count: monthlyBillingInvoices.data?.length || 0,
          monthly_total_amount: monthlyRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
          trial_ends_at: subscription?.trial_ends_at || null,
          current_period_end: subscription?.current_period_end || null,
          suspended: Boolean(authUserMap.get(profile.id)?.banned_until && new Date(authUserMap.get(profile.id)!.banned_until!) > new Date()),
        };
      })
    );

    return NextResponse.json({ users: usersWithDetails, month });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { adminClient } = auth;
    const { email, password, full_name, company_name, phone, entity_type, vat_registered } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "").replace(/-/g, "").trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "กรุณากรอกอีเมลให้ถูกต้อง" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    }
    if (!String(full_name || "").trim() || !String(company_name || "").trim()) {
      return NextResponse.json({ error: "กรุณากรอกชื่อและชื่อบริษัท" }, { status: 400 });
    }
    if (!/^[0-9]{9,10}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: "กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก" }, { status: 400 });
    }
    if (!["individual", "juristic", "partnership"].includes(entity_type) || !["yes", "no"].includes(vat_registered)) {
      return NextResponse.json({ error: "กรุณาระบุประเภทผู้ประกอบการและสถานะ VAT" }, { status: 400 });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: String(full_name || "").trim(),
        company_name: String(company_name || "บริษัทของฉัน").trim(),
        phone: normalizedPhone,
        entity_type,
        vat_registered: vat_registered === "yes",
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Keep admin-created accounts consistent even before the latest DB trigger is deployed.
    const { data: company } = await adminClient.from("companies").select("id").eq("user_id", data.user.id).single();
    if (company) {
      const { data: freePlan } = await adminClient.from("plans").select("id").eq("name", "free").single();
      if (freePlan) {
        await adminClient.from("subscriptions").update({
          plan_id: freePlan.id,
          status: "active",
          trial_ends_at: null,
          current_period_start: null,
          current_period_end: null,
        }).eq("company_id", company.id);
      }
    }
    await adminClient.from("profiles").update({ phone: normalizedPhone }).eq("id", data.user.id);
    return NextResponse.json({ success: true, user_id: data.user.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user, adminClient } = auth;
    const { user_id, suspended } = await request.json();
    if (!user_id || typeof suspended !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (user_id === user.id) {
      return NextResponse.json({ error: "ไม่สามารถระงับบัญชีผู้ดูแลที่กำลังใช้งานได้" }, { status: 400 });
    }
    const { data: targetUser } = await adminClient.auth.admin.getUserById(user_id);
    const protectedEmails = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];
    if (targetUser.user?.email && protectedEmails.includes(targetUser.user.email)) {
      return NextResponse.json({ error: "ไม่สามารถระงับบัญชีผู้ดูแลได้" }, { status: 400 });
    }
    const { data: targetAdmin } = await adminClient.from("admins").select("id").eq("user_id", user_id).maybeSingle();
    if (targetAdmin) return NextResponse.json({ error: "ไม่สามารถระงับบัญชีผู้ดูแลได้" }, { status: 400 });

    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: suspended ? "876000h" : "none",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error suspending user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user, adminClient } = auth;
    const userId = new URL(request.url).searchParams.get("user_id");
    if (!userId) return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    if (userId === user.id) return NextResponse.json({ error: "ไม่สามารถลบบัญชีผู้ดูแลที่กำลังใช้งานได้" }, { status: 400 });
    const { data: targetUser } = await adminClient.auth.admin.getUserById(userId);
    const protectedEmails = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];
    if (targetUser.user?.email && protectedEmails.includes(targetUser.user.email)) {
      return NextResponse.json({ error: "ไม่สามารถลบบัญชีผู้ดูแลได้" }, { status: 400 });
    }
    const { data: targetAdmin } = await adminClient.from("admins").select("id").eq("user_id", userId).maybeSingle();
    if (targetAdmin) return NextResponse.json({ error: "ไม่สามารถลบบัญชีผู้ดูแลได้" }, { status: 400 });

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
