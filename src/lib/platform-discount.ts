export function normalizePlatformDiscount(
  salesChannel: string | null | undefined,
  requestedAmount: number | null | undefined,
  documentTotal: number,
) {
  if (salesChannel?.trim().toLowerCase() !== "shopee") return 0;
  const safeTotal = Math.max(0, Number(documentTotal) || 0);
  const safeAmount = Math.max(0, Number(requestedAmount) || 0);
  return Math.min(safeTotal, safeAmount);
}

export function getCustomerPayment(documentTotal: number, platformDiscountAmount: number, coinDiscountAmount = 0) {
  return Math.max(0, (Number(documentTotal) || 0) - (Number(platformDiscountAmount) || 0) - (Number(coinDiscountAmount) || 0));
}
