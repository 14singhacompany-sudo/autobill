import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * API to check if current user is an admin
 * Returns { isAdmin: boolean }
 * SECURITY: Admin check is done server-side, not exposed in frontend code
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Check if user is in admins table
    const { data: adminRecord, error: adminError } = await supabase
      .from("admins")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (adminError || !adminRecord) {
      // Fallback: Check hardcoded admin email for backwards compatibility
      // TODO: Remove this after migrating all admins to database
      const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
      const isHardcodedAdmin = user.email && adminEmails.includes(user.email);

      return NextResponse.json({
        isAdmin: isHardcodedAdmin,
        role: isHardcodedAdmin ? "super_admin" : null
      });
    }

    return NextResponse.json({
      isAdmin: true,
      role: adminRecord.role
    });

  } catch (error) {
    console.error("Error checking admin status:", error);
    // SECURITY: Fail-closed - deny admin access on error
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
