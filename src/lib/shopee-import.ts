export interface ShopeeImportedItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  price_includes_vat: boolean;
}

export interface ShopeeOrderImport {
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  customerBranchCode: string;
  customerPhone: string;
  customerEmail: string;
  items: ShopeeImportedItem[];
  sellerDiscount: number;
  shopeeDiscount: number;
  shopeeCoinDiscount: number;
  notes: string;
  termsConditions: string;
}

function money(value: string | undefined) {
  if (!value) return 0;
  const number = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function normalizedLines(input: string) {
  return input
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function valueAfter(lines: string[], label: string, from = 0, to = lines.length) {
  const index = lines.findIndex((line, i) => i >= from && i < to && line === label);
  return index >= 0 && index + 1 < to ? lines[index + 1] : "";
}

function discountAfter(lines: string[], label: RegExp, from = 0) {
  const index = lines.findIndex((line, i) => i >= from && label.test(line));
  return index >= 0 ? money(lines[index + 1]) : 0;
}

function parseItems(lines: string[]): ShopeeImportedItem[] {
  const header = lines.findIndex((line) => line === "ราคาขายสุทธิ");
  if (header < 0) return [];
  const end = lines.findIndex((line, index) => index > header && (
    line.includes("ซ่อนรายละเอียดการชำระเงิน") || line === "รวมค่าสินค้า"
  ));
  const section = lines.slice(header + 1, end < 0 ? lines.length : end);
  const items: ShopeeImportedItem[] = [];

  for (let cursor = 0; cursor < section.length;) {
    if (!/^\d+$/.test(section[cursor])) {
      cursor += 1;
      continue;
    }
    const rowNumber = Number(section[cursor]);
    if (rowNumber !== items.length + 1) {
      cursor += 1;
      continue;
    }

    let next = cursor + 1;
    const content: string[] = [];
    while (next < section.length && !(/^\d+$/.test(section[next]) && Number(section[next]) === rowNumber + 1)) {
      content.push(section[next]);
      next += 1;
    }

    const numericIndexes = content
      .map((line, index) => /^฿?[\d,]+(?:\.\d{1,2})?$/.test(line) ? index : -1)
      .filter((index) => index >= 0);
    if (numericIndexes.length >= 3) {
      const priceIndex = numericIndexes[numericIndexes.length - 3];
      const quantityIndex = numericIndexes[numericIndexes.length - 2];
      const nameParts = content.slice(0, priceIndex).filter((line) => !/^(?:Hot Listing|สินค้าแนะนำ)$/i.test(line));
      const description = nameParts.join(" · ");
      const quantity = money(content[quantityIndex]);
      const unitPrice = money(content[priceIndex]);
      if (description && quantity > 0) {
        items.push({
          description,
          quantity,
          unit: "ชิ้น",
          unit_price: unitPrice,
          discount_percent: 0,
          price_includes_vat: true,
        });
      }
    }
    cursor = next;
  }
  return items;
}

export function parseShopeeOrderText(input: string): ShopeeOrderImport {
  const lines = normalizedLines(input);
  const invoiceStart = lines.findIndex((line) => line === "ใบกำกับภาษี");
  const paymentStart = lines.findIndex((line, index) => index > invoiceStart && line === "รายละเอียดการชำระเงิน");
  const invoiceEnd = paymentStart >= 0 ? paymentStart : lines.length;
  const buyerStart = lines.findIndex((line) => line === "การชำระเงินของผู้ซื้อ");

  const orderNumber = valueAfter(lines, "หมายเลขคำสั่งซื้อ");
  const rawCustomerName = valueAfter(lines, "ชื่อ-นามสกุล", Math.max(0, invoiceStart), invoiceEnd);
  const customerName = rawCustomerName
    .replace(/\s*[（(]\s*สำนักงานใหญ่\s*[）)]\s*/g, " ")
    .replace(/\s+สำนักงานใหญ่\s*$/g, "")
    .trim();
  const customerAddress = valueAfter(lines, "ที่อยู่", Math.max(0, invoiceStart), invoiceEnd);
  const customerTaxId = valueAfter(lines, "หมายเลขประจำตัวผู้เสียภาษี", Math.max(0, invoiceStart), invoiceEnd).replace(/\D/g, "");
  const branchType = valueAfter(lines, "ประเภทสาขา", Math.max(0, invoiceStart), invoiceEnd);
  const customerPhone = valueAfter(lines, "Phone", Math.max(0, invoiceStart), invoiceEnd).replace(/\D/g, "");
  const customerEmail = valueAfter(lines, "อีเมล", Math.max(0, invoiceStart), invoiceEnd);

  const sellerVoucherLineIndex = lines.findIndex((line) => line.startsWith("โค้ดส่วนลดร้านค้าจากผู้ขาย"));
  const sellerVoucherLabel = sellerVoucherLineIndex >= 0 ? lines[sellerVoucherLineIndex] : "Seller Voucher";
  const sellerDiscount = sellerVoucherLineIndex >= 0
    ? money(lines[sellerVoucherLineIndex + 1])
    : discountAfter(lines, /^Seller Voucher$/, Math.max(0, buyerStart));
  const shopeeDiscount = discountAfter(lines, /^Shopee Voucher$/, Math.max(0, buyerStart));
  const shopeeCoinDiscount = discountAfter(lines, /^(?:Shopee Coins?|ส่วนลด Shopee Coin)$/i, Math.max(0, buyerStart));

  const notes = [
    shopeeDiscount > 0 ? `Shopee Voucher -฿${shopeeDiscount}` : "",
    sellerDiscount > 0 ? `${sellerVoucherLabel} -฿${sellerDiscount}` : "",
    shopeeCoinDiscount > 0 ? `Shopee Coin -฿${shopeeCoinDiscount}` : "",
  ].filter(Boolean).join("\n");

  return {
    orderNumber,
    customerName,
    customerAddress,
    customerTaxId: /^\d{13}$/.test(customerTaxId) ? customerTaxId : "",
    customerBranchCode: branchType.includes("สำนักงานใหญ่") ? "00000" : "",
    customerPhone,
    customerEmail,
    items: parseItems(lines),
    sellerDiscount,
    shopeeDiscount,
    shopeeCoinDiscount,
    notes,
    termsConditions: orderNumber,
  };
}
