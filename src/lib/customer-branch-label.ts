/**
 * Display text for a customer's establishment, printed after the customer name.
 * Stored branch codes are not rewritten here.
 *
 * - blank: individual or unspecified — print nothing
 * - 00000: head office
 * - any other code: numbered branch, e.g. (สาขาที่ 00001)
 */
export function formatCustomerBranchSuffix(branchCode: string | null | undefined): string {
  const code = branchCode?.trim() ?? "";
  if (!code) return "";
  if (code === "00000") return "(สำนักงานใหญ่)";
  return `(สาขาที่ ${code})`;
}

export function formatCustomerNameWithBranch(
  name: string | null | undefined,
  branchCode: string | null | undefined,
): string {
  const base = (name ?? "").trim();
  const suffix = formatCustomerBranchSuffix(branchCode);
  if (!suffix) return base;
  if (!base) return suffix;
  return `${base} ${suffix}`;
}
