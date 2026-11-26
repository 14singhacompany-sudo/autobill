import { getCustomerPayment, normalizePlatformDiscount } from "@/lib/platform-discount";

export interface InvoiceTotalsItem {
  quantity: number;
  unit_price: number;
  price_includes_vat?: boolean;
}

export interface InvoiceTotalsInput {
  items: InvoiceTotalsItem[];
  discount1_type: "fixed" | "percent";
  discount1_value: number;
  discount2_type: "fixed" | "percent";
  discount2_value: number;
  vat_rate: number;
  withholding_tax_rate?: number;
  sales_channel?: string | null;
}

export interface InvoiceTotals {
  subtotal: number;
  discount1Amount: number;
  discount2Amount: number;
  discountAmount: number;
  amountBeforeVat: number;
  vatAmount: number;
  totalAmount: number;
  withholdingTaxAmount: number;
  netAmount: number;
}

export interface PlatformDiscountInput {
  platform_discount_amount?: number | null;
  shopee_coin_discount_amount?: number | null;
  payment_method_discount_amount?: number | null;
}

/** Round to satang the same way the invoice screen and numeric(15,2) columns do. */
export function roundMoney(value: number): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Document totals shared by the invoice form and draft creation.
 * Seller discounts reduce the VAT base. Shopee voucher, coin, and payment
 * discounts are not part of this calculation.
 */
export function calculateInvoiceTotals(data: InvoiceTotalsInput): InvoiceTotals {
  const subtotal = data.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price);
  }, 0);

  const discount1Amount =
    data.discount1_type === "percent"
      ? subtotal * (data.discount1_value / 100)
      : data.discount1_value;

  const afterDiscount1 = subtotal - discount1Amount;

  const discount2Amount = data.sales_channel?.toLowerCase() === "shopee"
    ? 0
    : data.discount2_type === "percent"
      ? afterDiscount1 * (data.discount2_value / 100)
      : data.discount2_value;

  const afterAllDiscount = afterDiscount1 - discount2Amount;
  const totalDiscountAmount = discount1Amount + discount2Amount;
  const discountRatio = subtotal > 0 ? afterAllDiscount / subtotal : 1;

  let totalIncVat = 0;
  let totalExcVat = 0;

  data.items.forEach((item) => {
    const itemTotal = item.quantity * item.unit_price;
    const itemAfterAllDiscount = itemTotal * discountRatio;

    if (item.price_includes_vat) {
      totalIncVat += itemAfterAllDiscount;
    } else {
      totalExcVat += itemAfterAllDiscount;
    }
  });

  const amountBeforeVatFromIncVat = totalIncVat / (1 + data.vat_rate / 100);
  const vatFromIncVat = totalIncVat - amountBeforeVatFromIncVat;
  const vatFromExcVat = totalExcVat * (data.vat_rate / 100);

  const amountBeforeVat = amountBeforeVatFromIncVat + totalExcVat;
  const vatAmount = vatFromIncVat + vatFromExcVat;
  const totalAmount = totalIncVat + totalExcVat + vatFromExcVat;
  const withholdingTaxAmount = amountBeforeVat * ((data.withholding_tax_rate || 0) / 100);
  const netAmount = totalAmount - withholdingTaxAmount;

  return {
    subtotal,
    discount1Amount,
    discount2Amount,
    discountAmount: totalDiscountAmount,
    amountBeforeVat,
    vatAmount,
    totalAmount,
    withholdingTaxAmount,
    netAmount,
  };
}

export function platformDiscountAmounts(
  salesChannel: string | null | undefined,
  amounts: PlatformDiscountInput,
  totalAmount: number,
) {
  const platformDiscount = normalizePlatformDiscount(salesChannel, amounts.platform_discount_amount, totalAmount);
  const coinDiscount = normalizePlatformDiscount(
    salesChannel,
    amounts.shopee_coin_discount_amount,
    totalAmount - platformDiscount,
  );
  const paymentDiscount = normalizePlatformDiscount(
    salesChannel,
    amounts.payment_method_discount_amount,
    totalAmount - platformDiscount - coinDiscount,
  );

  return {
    platform_discount_amount: platformDiscount,
    shopee_coin_discount_amount: coinDiscount,
    payment_method_discount_amount: paymentDiscount,
  };
}

export interface PresentedInvoiceTotals {
  subtotal: number;
  vat: number;
  total: number;
  amount_before_vat: number;
  discounts: {
    seller: number;
    additional: number;
    shopee_voucher: number;
    shopee_coin: number;
    payment_method: number;
  };
  customer_payment: number;
}

export function presentInvoiceTotals(
  data: InvoiceTotalsInput & PlatformDiscountInput,
): PresentedInvoiceTotals {
  const totals = calculateInvoiceTotals(data);
  const discounts = platformDiscountAmounts(data.sales_channel, data, totals.totalAmount);
  return {
    subtotal: roundMoney(totals.subtotal),
    vat: roundMoney(totals.vatAmount),
    total: roundMoney(totals.totalAmount),
    amount_before_vat: roundMoney(totals.amountBeforeVat),
    discounts: {
      seller: roundMoney(totals.discount1Amount),
      additional: roundMoney(totals.discount2Amount),
      shopee_voucher: roundMoney(discounts.platform_discount_amount),
      shopee_coin: roundMoney(discounts.shopee_coin_discount_amount),
      payment_method: roundMoney(discounts.payment_method_discount_amount),
    },
    customer_payment: roundMoney(getCustomerPayment(
      totals.totalAmount,
      discounts.platform_discount_amount,
      discounts.shopee_coin_discount_amount,
      discounts.payment_method_discount_amount,
    )),
  };
}
