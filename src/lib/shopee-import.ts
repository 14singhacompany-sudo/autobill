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
  const matches = value.match(/-?\s*(?:฿\s*)?[\d,]+(?:\.\d{1,2})?/g);
  const raw = matches?.at(-1) || "";
  const number = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function cleanLine(value: string) {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedLines(input: string) {
  return input
    .replace(/\r/g, "")
    .split(/[\n\t]+/)
    .map(cleanLine)
    .filter(Boolean);
}

function normalizedLabel(value: string) {
  return cleanLine(value).replace(/[:：]\s*$/, "").toLocaleLowerCase();
}

function matchesAnyLabel(line: string, labels: string[]) {
  const normalized = normalizedLabel(line);
  return labels.some((label) => normalized === normalizedLabel(label));
}

function findLabel(lines: string[], labels: string[], from = 0, to = lines.length) {
  return lines.findIndex((line, index) => index >= from && index < to && matchesAnyLabel(line, labels));
}

function valueAfterAny(lines: string[], labels: string[], from = 0, to = lines.length) {
  const index = findLabel(lines, labels, from, to);
  if (index < 0) {
    const prefixes = labels.map(normalizedLabel);
    const sameLine = lines.find((line, lineIndex) => {
      if (lineIndex < from || lineIndex >= to) return false;
      const normalized = normalizedLabel(line);
      return prefixes.some((label) => normalized.startsWith(`${label} `));
    });
    if (!sameLine) return "";
    const label = labels.find((candidate) => normalizedLabel(sameLine).startsWith(`${normalizedLabel(candidate)} `));
    return label ? cleanLine(sameLine.slice(sameLine.toLocaleLowerCase().indexOf(label.toLocaleLowerCase()) + label.length)) : "";
  }
  return index + 1 < to ? lines[index + 1] : "";
}

function findSection(lines: string[], labels: string[], from = 0) {
  return findLabel(lines, labels, from);
}

function discountFromLabels(lines: string[], labels: RegExp[], from = 0, to = lines.length) {
  for (let index = from; index < to; index += 1) {
    const line = lines[index];
    if (!labels.some((pattern) => pattern.test(line))) continue;

    const sameLineAmount = money(line.replace(/^[^-฿\d]*/, ""));
    if (/[-฿]\s*[\d,]/.test(line) && sameLineAmount > 0) return sameLineAmount;

    for (let offset = 1; offset <= 2 && index + offset < to; offset += 1) {
      const candidate = lines[index + offset];
      if (/^-?\s*฿?\s*[\d,]+(?:\.\d{1,2})?$/.test(candidate)) return money(candidate);
    }
  }
  return 0;
}

function parseItems(lines: string[]): ShopeeImportedItem[] {
  const header = findLabel(lines, ["ราคาขายสุทธิ", "ยอดขายสุทธิ", "ราคาสุทธิ"]);
  if (header < 0) return [];
  const end = lines.findIndex((line, index) => index > header && (
    /ซ่อนรายละเอียดการชำระเงิน|รายละเอียดรายรับ|payment details/i.test(line) || matchesAnyLabel(line, ["รวมค่าสินค้า"])
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
    while (next < section.length) {
      const numericCount = content.filter((line) => /^฿?[\d,]+(?:\.\d{1,2})?$/.test(line)).length;
      if (numericCount >= 3 && /^\d+$/.test(section[next]) && Number(section[next]) === rowNumber + 1) break;
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
  const taxLabelIndex = findLabel(lines, ["หมายเลขประจำตัวผู้เสียภาษี", "เลขประจำตัวผู้เสียภาษี", "เลขผู้เสียภาษี", "Tax ID"]);
  const explicitInvoiceStart = findSection(lines, ["ใบกำกับภาษี", "ข้อมูลใบกำกับภาษี", "Tax Invoice"]);
  const invoiceStart = explicitInvoiceStart >= 0 ? explicitInvoiceStart : Math.max(0, taxLabelIndex - 12);
  const paymentStart = findSection(lines, ["รายละเอียดการชำระเงิน", "ข้อมูลการชำระเงิน", "Payment Details"], invoiceStart);
  const invoiceEnd = paymentStart >= 0 ? paymentStart : Math.min(lines.length, taxLabelIndex >= 0 ? taxLabelIndex + 12 : lines.length);
  const buyerStart = findSection(lines, ["การชำระเงินของผู้ซื้อ", "ยอดชำระของผู้ซื้อ", "Buyer Payment"]);
  const discountFrom = buyerStart >= 0 ? buyerStart : Math.max(0, paymentStart);

  const orderNumber = valueAfterAny(lines, ["หมายเลขคำสั่งซื้อ", "เลขที่คำสั่งซื้อ", "หมายเลขออเดอร์", "Order ID", "Order No."]);
  const rawCustomerName = valueAfterAny(lines, ["ชื่อ-นามสกุล", "ชื่อ นามสกุล", "ชื่อบริษัท", "ชื่อผู้เสียภาษี"], invoiceStart, invoiceEnd);
  const customerName = rawCustomerName
    .replace(/\s*[（(]\s*สำนักงานใหญ่\s*[）)]\s*/g, " ")
    .replace(/\s+สำนักงานใหญ่\s*$/g, "")
    .trim();
  const customerAddress = valueAfterAny(lines, ["ที่อยู่", "ที่อยู่สำหรับออกใบกำกับภาษี", "ที่อยู่ใบกำกับภาษี"], invoiceStart, invoiceEnd);
  const customerTaxId = valueAfterAny(lines, ["หมายเลขประจำตัวผู้เสียภาษี", "เลขประจำตัวผู้เสียภาษี", "เลขผู้เสียภาษี", "Tax ID"], invoiceStart, invoiceEnd).replace(/\D/g, "");
  const branchType = valueAfterAny(lines, ["ประเภทสาขา", "สาขา"], invoiceStart, invoiceEnd);
  const customerPhone = valueAfterAny(lines, ["Phone", "โทรศัพท์", "เบอร์โทรศัพท์"], invoiceStart, invoiceEnd).replace(/\D/g, "");
  const customerEmail = valueAfterAny(lines, ["อีเมล", "Email"], invoiceStart, invoiceEnd);

  const sellerVoucherLineIndex = lines.findIndex((line) => /โค้ดส่วนลดร้านค้าจากผู้ขาย|seller voucher|ส่วนลดร้านค้า/i.test(line));
  const sellerVoucherLabel = sellerVoucherLineIndex >= 0 ? lines[sellerVoucherLineIndex].replace(/\s*-?฿\s*[\d,.]+\s*$/, "") : "Seller Voucher";
  const sellerDiscountPatterns = [
    /โค้ดส่วนลดร้านค้าจากผู้ขาย/i,
    /^seller voucher\b/i,
    /^ส่วนลดร้านค้า/i,
  ];
  const sellerDiscount = discountFromLabels(lines, sellerDiscountPatterns, Math.max(0, buyerStart)) ||
    discountFromLabels(lines, sellerDiscountPatterns, Math.max(0, paymentStart));
  const shopeeDiscount = discountFromLabels(lines, [
    /^shopee voucher\b/i,
    /^โค้ดส่วนลด\s*shopee/i,
    /^ส่วนลด(?:จาก|โดย)?\s*shopee(?!\s*coins?)/i,
    /^shopee discount\b/i,
  ], discountFrom) || discountFromLabels(lines, [
    /^shopee voucher\b/i,
    /^โค้ดส่วนลด\s*shopee/i,
    /^ส่วนลด(?:จาก|โดย)?\s*shopee(?!\s*coins?)/i,
  ], Math.max(0, paymentStart));
  const shopeeCoinDiscount = discountFromLabels(lines, [
    /^shopee coins?\b/i,
    /^(?:ใช้|ส่วนลดจาก|ส่วนลด)?\s*shopee coins?\b/i,
    /^ส่วนลด\s*shopee\s*coin/i,
  ], discountFrom) || discountFromLabels(lines, [/shopee coins?/i], Math.max(0, paymentStart));

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
