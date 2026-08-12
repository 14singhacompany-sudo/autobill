export interface RegistryCompany {
  tax_id: string;
  name_th: string;
  company_type: string | null;
  status: string | null;
  address: string | null;
  registration_date?: string | null;
  source_updated_at?: string | null;
}

export function normalizeTaxId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).replace(/[\s-]/g, "");
  return /^\d{13}$/.test(normalized) ? normalized : null;
}

export function isExactTaxId(value: string): boolean {
  return /^\d{13}$/.test(value);
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function withPrefix(value: string | null, prefix: string, alternatives: string[] = []): string | null {
  if (!value) return null;
  return [prefix, ...alternatives].some((candidate) => value.startsWith(candidate))
    ? value
    : `${prefix}${value}`;
}

export function parseDbdCompanyResponse(payload: unknown): RegistryCompany | null {
  const root = record(payload);
  const data = Array.isArray(root?.data) ? root.data : [];
  const wrapper = record(data[0]);
  const company = record(wrapper?.["cd:OrganizationJuristicPerson"]);
  if (!company) return null;

  const taxId = text(company["cd:OrganizationJuristicID"]);
  const name = text(company["cd:OrganizationJuristicNameTH"]);
  if (!taxId || !isExactTaxId(taxId) || !name) return null;

  const addressWrapper = record(company["cd:OrganizationJuristicAddress"]);
  const addressType = record(addressWrapper?.["cr:AddressType"]);
  const subDistrict = record(addressType?.["cd:CitySubDivision"]);
  const district = record(addressType?.["cd:City"]);
  const province = record(addressType?.["cd:CountrySubDivision"]);
  const provinceName = text(province?.["cr:CountrySubDivisionTextTH"]);
  const isBangkok = provinceName === "กรุงเทพมหานคร";
  const addressParts = [
    text(addressType?.["cd:Address"]),
    withPrefix(text(subDistrict?.["cr:CitySubDivisionTextTH"]), isBangkok ? "แขวง" : "ตำบล", ["ต."]),
    withPrefix(text(district?.["cr:CityTextTH"]), isBangkok ? "เขต" : "อำเภอ", ["อ."]),
    isBangkok ? provinceName : withPrefix(provinceName, "จังหวัด", ["จ."]),
  ].filter((part): part is string => Boolean(part));

  const rawDate = text(company["cd:OrganizationJuristicRegisterDate"]);
  const registrationDate = rawDate && /^\d{8}$/.test(rawDate)
    ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
    : null;

  return {
    tax_id: taxId,
    name_th: name,
    company_type: text(company["cd:OrganizationJuristicType"]),
    status: text(company["cd:OrganizationJuristicStatus"]),
    address: addressParts.join(" ") || null,
    registration_date: registrationDate,
    source_updated_at: new Date().toISOString(),
  };
}

export function getDbdSubdivisionCode(payload: unknown): string | null {
  const root = record(payload);
  const data = Array.isArray(root?.data) ? root.data : [];
  const wrapper = record(data[0]);
  const company = record(wrapper?.["cd:OrganizationJuristicPerson"]);
  const addressWrapper = record(company?.["cd:OrganizationJuristicAddress"]);
  const addressType = record(addressWrapper?.["cr:AddressType"]);
  const subDistrict = record(addressType?.["cd:CitySubDivision"]);
  const code = text(subDistrict?.["cr:CitySubDivisionCode"]);
  return code && /^\d{8}$/.test(code) ? code : null;
}

export function findUniquePostalCode(html: string, subdivisionCode: string): string | null {
  if (!/^\d{8}$/.test(subdivisionCode)) return null;
  const pattern = new RegExp(
    `<tr><td>[^<]*</td><td>[^<]*</td><td>${subdivisionCode}</td><td>[^<]*</td><td>[^<]*</td><td>[^<]*</td><td>(\\d{5})</td></tr>`,
    "g"
  );
  const postalCodes = new Set<string>();
  for (const match of html.matchAll(pattern)) postalCodes.add(match[1]);
  return postalCodes.size === 1 ? [...postalCodes][0] : null;
}

export async function lookupDbdFromBrowser(taxId: string): Promise<RegistryCompany | null> {
  if (typeof window === "undefined" || !isExactTaxId(taxId)) return null;
  const response = await fetch(`https://openapi.dbd.go.th/api/v1/juristic_person/${taxId}`, {
    headers: { Accept: "application/json, text/plain, */*" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`DBD API returned ${response.status}`);
  return parseDbdCompanyResponse(JSON.parse(await response.text()));
}
