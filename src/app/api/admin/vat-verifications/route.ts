import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const configured = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim()) || [];
  if (user.email && configured.includes(user.email)) return user;
  const { data } = await supabase.from("admins").select("id").eq("user_id", user.id).maybeSingle();
  return data ? user : null;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const client = createAdminClient();
    const { data, error } = await client
      .from("company_settings")
      .select("id,user_id,company_name,tax_id,branch_code,branch_name,address,phone,email,entity_type,vat_registered,vat_registration_date,vat_document_path,vat_verification_status,vat_submitted_at,vat_rejection_reason")
      .eq("vat_registered", true)
      .order("vat_submitted_at", { ascending: false, nullsFirst: false });
    if (error) throw error;

    const { data: authUsers, error: usersError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    const emails = new Map(authUsers.users.map((user) => [user.id, user.email || "-"]));

    const records = await Promise.all((data || []).map(async (record) => {
      let document_url: string | null = null;
      if (record.vat_document_path) {
        const { data: signed } = await client.storage.from("vat-documents").createSignedUrl(record.vat_document_path, 600);
        document_url = signed?.signedUrl || null;
      }
      return { ...record, email: emails.get(record.user_id) || "-", document_url };
    }));
    return NextResponse.json({ records });
  } catch (error) {
    console.error("VAT verification list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { company_settings_id, decision, reason } = await request.json();
    if (!company_settings_id || !["verified", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (decision === "rejected" && !String(reason || "").trim()) {
      return NextResponse.json({ error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ" }, { status: 400 });
    }
    const client = createAdminClient();
    const { data: current } = await client.from("company_settings").select("vat_document_path,vat_registered,vat_registration_date,tax_id,entity_type,company_name,address,branch_code").eq("id", company_settings_id).single();
    if (!current?.vat_document_path) return NextResponse.json({ error: "ยังไม่มีเอกสาร ภ.พ.20" }, { status: 400 });
    if (decision === "verified" && (
      current.vat_registered !== true ||
      !current.entity_type ||
      !current.vat_registration_date ||
      !/^\d{13}$/.test(String(current.tax_id || "")) ||
      !current.company_name?.trim() ||
      !current.address?.trim() ||
      !/^\d{5}$/.test(String(current.branch_code || ""))
    )) {
      return NextResponse.json({ error: "ข้อมูล VAT ไม่ครบ: ต้องมีชื่อ ประเภท ที่อยู่ เลขผู้เสียภาษี สาขา และวันที่จด VAT" }, { status: 400 });
    }

    const { error } = await client.from("company_settings").update({
      vat_verification_status: decision,
      vat_verified_at: decision === "verified" ? new Date().toISOString() : null,
      vat_verified_by: decision === "verified" ? admin.id : null,
      vat_rejection_reason: decision === "rejected" ? String(reason).trim() : null,
    }).eq("id", company_settings_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("VAT verification update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
