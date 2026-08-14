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
