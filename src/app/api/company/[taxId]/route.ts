import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  findUniquePostalCode,
  getDbdSubdivisionCode,
  isExactTaxId,
  parseDbdCompanyResponse,
} from "@/lib/company-registry";

const DBD_API_BASE_URL = "https://openapi.dbd.go.th/api/v1/juristic_person";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const POSTAL_CODE_SOURCE_URL = "https://zipcode.industry.go.th/";
let postalCodeHtmlPromise: Promise<string> | null = null;

function hasFormattedAdministrativeAddress(address: string | null | undefined) {
  if (!address) return true;
  const hasPostalCode = /\b\d{5}$/.test(address.trim());
  if (address.includes("กรุงเทพมหานคร")) {
    return address.includes("แขวง") && address.includes("เขต") && hasPostalCode;
  }
  return address.includes("ตำบล")
    && address.includes("อำเภอ")
    && address.includes("จังหวัด")
    && hasPostalCode;
}

async function lookupPostalCode(subdivisionCode: string | null) {
  if (!subdivisionCode) return null;
  if (!postalCodeHtmlPromise) {
    postalCodeHtmlPromise = fetch(POSTAL_CODE_SOURCE_URL, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 7 * 24 * 60 * 60 },
    }).then((response) => {
      if (!response.ok) throw new Error(`Postal-code source returned ${response.status}`);
      return response.text();
    }).catch((error) => {
      postalCodeHtmlPromise = null;
      throw error;
    });
  }
  return findUniquePostalCode(await postalCodeHtmlPromise, subdivisionCode);
}

function isFreshCache(
  sourceUpdatedAt: string | null | undefined,
  address: string | null | undefined
) {
  if (!sourceUpdatedAt) return false;
  const updatedAt = new Date(sourceUpdatedAt).getTime();
  return Number.isFinite(updatedAt)
    && Date.now() - updatedAt < CACHE_MAX_AGE_MS
    && hasFormattedAdministrativeAddress(address);
}

async function lookupPublicDbd(taxId: string) {
  const response = await fetch(`${DBD_API_BASE_URL}/${taxId}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`DBD API returned ${response.status}`);
  const payload = await response.json();
  const company = parseDbdCompanyResponse(payload);
  if (!company) return null;

  try {
    const postalCode = await lookupPostalCode(getDbdSubdivisionCode(payload));
    if (postalCode && company.address && !company.address.endsWith(postalCode)) {
      company.address = `${company.address} ${postalCode}`;
    }
  } catch (error) {
    console.error("Postal-code lookup failed:", error);
  }
  return company;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taxId: string }> }
) {
  const { taxId } = await params;

  if (!isExactTaxId(taxId)) {
    return NextResponse.json(
      { found: false, error: "tax_id must contain exactly 13 digits" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ found: false }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("thai_company_registry")
      .select("tax_id,name_th,company_type,status,address,registration_date,source_updated_at")
      .eq("tax_id", taxId)
      .maybeSingle();

    if (error) {
      console.error("Company registry lookup failed:", error.message);
      return NextResponse.json({ found: false }, { status: 503 });
    }

    if (data && isFreshCache(data.source_updated_at, data.address)) {
      return NextResponse.json({ found: true, company: data, source: "cache" });
    }

    // Public DBD is a best-effort fallback. Any failure preserves the manual flow.
    try {
      const company = await lookupPublicDbd(taxId);
      if (!company) {
        return NextResponse.json(data
          ? { found: true, company: data, source: "stale-cache" }
          : { found: false });
      }

      // Service role remains server-only and is used solely to maintain the shared cache.
      try {
        const admin = createAdminClient();
        const { error: cacheError } = await admin
          .from("thai_company_registry")
          .upsert(company, { onConflict: "tax_id" });
        if (cacheError) console.error("Could not cache DBD company:", cacheError.message);
      } catch (cacheError) {
        console.error("Could not cache DBD company:", cacheError);
      }

      return NextResponse.json({ found: true, company, source: "dbd" });
    } catch (dbdError) {
      console.error("Public DBD lookup failed:", dbdError);
      return NextResponse.json(data
        ? { found: true, company: data, source: "stale-cache" }
        : { found: false });
    }
  } catch (error) {
    console.error("Company registry lookup failed:", error);
    return NextResponse.json({ found: false }, { status: 503 });
  }
}
