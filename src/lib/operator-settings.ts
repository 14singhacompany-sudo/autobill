export type OperatorEntityType = "individual" | "juristic" | "partnership" | "";

/** Tax ID is optional only for an individual who is not VAT-registered. */
export function isOperatorTaxIdRequired(
  entityType: OperatorEntityType,
  vatRegistered: boolean | null,
): boolean {
  if (!entityType) return false;
  return entityType !== "individual" || vatRegistered === true;
}

/** PostgreSQL date columns must receive null rather than an empty string. */
export function normalizeVatRegistrationDate(
  vatRegistered: boolean | null,
  date: string,
): string | null {
  return vatRegistered === true && date ? date : null;
}

export interface IssuerProfile {
  company_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  entity_type?: OperatorEntityType | null;
  vat_registered?: boolean | null;
  tax_id?: string | null;
  branch_code?: string | null;
}

/** Fields required before creating a business document such as a quotation. */
export function getMissingIssuerProfileFields(profile: IssuerProfile | null): string[] {
  if (!profile) return ["ข้อมูลผู้ประกอบการ"];
  const missing: string[] = [];
  if (!profile.company_name?.trim()) missing.push("ชื่อกิจการ/ชื่อร้าน");
  if (!profile.address?.trim()) missing.push("ที่อยู่");
  if (!profile.phone?.trim()) missing.push("เบอร์โทรศัพท์");
  if (!profile.email?.trim()) missing.push("อีเมล");
  if (!profile.entity_type) missing.push("ประเภทผู้ประกอบการ");
  if (profile.vat_registered === null || profile.vat_registered === undefined) missing.push("สถานะ VAT");

  if (isOperatorTaxIdRequired(profile.entity_type || "", profile.vat_registered ?? null)) {
    if ((profile.tax_id || "").replace(/\D/g, "").length !== 13) missing.push("เลขประจำตัวผู้เสียภาษี 13 หลัก");
  }
  if (profile.vat_registered === true && !/^\d{5}$/.test(profile.branch_code || "")) {
    missing.push("รหัสสาขา 5 หลัก");
  }
  return missing;
}
