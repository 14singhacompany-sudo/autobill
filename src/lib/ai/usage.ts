import { createClient } from "@/lib/supabase/server";

export type AIApiType = "extract_customer" | "extract_customer_text" | "extract_items" | "extract_image";

interface LogAIApiCallParams {
  apiType: AIApiType;
  requestTokens?: number;
  responseTokens?: number;
  status?: "success" | "error" | "limit_exceeded";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

interface AIUsageLimit {
  currentCount: number;
  limitCount: number | null;
  canExtract: boolean;
  remaining: number;
}

/**
 * Check if user can use AI extraction (within limit)
 */
export async function checkAIExtractionLimit(): Promise<AIUsageLimit> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { currentCount: 0, limitCount: 0, canExtract: false, remaining: 0 };
  }

  // Get company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return { currentCount: 0, limitCount: 0, canExtract: false, remaining: 0 };
  }

  // Call RPC function to check limit
  const { data, error } = await supabase
    .rpc("check_ai_extraction_limit", { p_company_id: company.id })
    .single();

  if (error) {
    console.error("Error checking AI extraction limit:", error);
    // SECURITY: Fail-closed - deny access when check fails
    return { currentCount: 0, limitCount: 0, canExtract: false, remaining: 0 };
  }

  // Type assertion for RPC response
  const result = data as {
    current_count: number;
    limit_count: number | null;
    can_extract: boolean;
    remaining: number;
  } | null;

  return {
    currentCount: result?.current_count || 0,
    limitCount: result?.limit_count ?? null,
    canExtract: result?.can_extract ?? true,
    remaining: result?.remaining || 0,
  };
}

/**
 * Log AI API call to database
 */
export async function logAIApiCall(params: LogAIApiCallParams): Promise<string | null> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("No user found for AI API logging");
    return null;
  }

  // Get company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    console.error("No company found for AI API logging");
    return null;
  }

  // Call RPC function to log
  const { data, error } = await supabase.rpc("log_ai_api_call", {
    p_company_id: company.id,
    p_user_id: user.id,
    p_api_type: params.apiType,
    p_request_tokens: params.requestTokens || 0,
    p_response_tokens: params.responseTokens || 0,
    p_status: params.status || "success",
    p_error_message: params.errorMessage || null,
    p_metadata: params.metadata || {},
  });

  if (error) {
    console.error("Error logging AI API call:", error);
    return null;
  }

  return data;
}

/**
 * Get user info for API logging
 */
export async function getUserCompanyInfo() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (!company) return null;

  return {
    userId: user.id,
    userEmail: user.email,
    companyId: company.id,
    companyName: company.name,
  };
}
