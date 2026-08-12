import type { ExtractedItem } from "@/types/database";

export interface ParsedCustomerData {
  customer_name: string;
  customer_address: string;
  customer_tax_id: string;
  customer_branch_code: string;
  customer_contact: string;
  customer_phone: string;
  customer_email: string;
}

const thaiDigits: Record<string, string> = {
  "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4",
  "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9",
};

export function normalizeOcrText(text: string) {
  return text
    .replace(/[๐-๙]/g, (digit) => thaiDigits[digit] || digit)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function valueAfterLabel(text: string, labels: string[]) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const match = text.match(new RegExp(`^(?:${escaped.join("|")})\\s*[:：-]?\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^0\d{8,9}$/.test(digits)) return digits;
  if (/^66\d{8,9}$/.test(digits)) return `0${digits.slice(2)}`;
  return "";
}

function findPhone(text: string, taxId: string) {
  const labeled = valueAfterLabel(text, ["โทรศัพท์", "โทร", "เบอร์โทร", "phone", "tel"]);
  const labeledPhone = normalizePhone(labeled);
  if (labeledPhone) return labeledPhone;

  // Inspect complete numeric tokens only. This prevents a 13-digit tax ID
  // from being truncated and reused as a phone number.
  for (const candidate of text.match(/(?:\+?66|0)[\d\s-]*/g) || []) {
    const phone = normalizePhone(candidate);
    if (phone && phone !== taxId) return phone;
  }
  return "";
}

export function parseCustomerText(input: string): ParsedCustomerData {
  const text = normalizeOcrText(input);
  const taxCandidate = text.match(/(?:\d[\s-]*){13}/)?.[0]?.replace(/\D/g, "") || "";
  const taxId = taxCandidate.length === 13 ? taxCandidate : "";
  const branchCandidate = valueAfterLabel(text, ["รหัสสาขา", "สาขา", "branch"]).match(/\d{5}/)?.[0] || "00000";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = findPhone(text, taxId);
  const explicitName = valueAfterLabel(text, ["ชื่อบริษัท", "ชื่อลูกค้า", "ชื่อ", "company", "name"]);
  const companyLine = text.split("\n").map((line) => line.trim()).find((line) => /บริษัท|ห้างหุ้นส่วน/.test(line)) || "";
  const commaParts = text.split(",").map((part) => part.trim()).filter(Boolean);
  const taxPartIndex = commaParts.findIndex((part) => part.replace(/\D/g, "") === taxId && Boolean(taxId));
  const inferredName = taxPartIndex > 0
    ? commaParts.slice(0, taxPartIndex).find((part) => part !== email && !normalizePhone(part)) || ""
    : "";
  const inferredAddress = taxPartIndex >= 0
    ? commaParts
        .slice(taxPartIndex + 1)
        .filter((part) => !normalizePhone(part))
        .join(", ")
    : "";

  return {
    customer_name: explicitName || companyLine || inferredName,
    customer_address: valueAfterLabel(text, ["ที่อยู่", "address"]) || inferredAddress,
    customer_tax_id: taxId,
    customer_branch_code: branchCandidate,
    customer_contact: valueAfterLabel(text, ["ผู้ติดต่อ", "ติดต่อ", "contact"]),
    customer_phone: phone,
    customer_email: email,
  };
}

function parseNumber(value: string) {
  const number = Number(value.replace(/[,฿\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

export function parseItemsText(input: string): ExtractedItem[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|\||,/).map((part) => part.trim()))
    .filter((parts) => parts.length >= 4)
    .map((parts) => ({
      description: parts.slice(0, parts.length - 3).join(" ").trim(),
      quantity: parseNumber(parts[parts.length - 3]),
      unit: parts[parts.length - 2] || "ชิ้น",
      unit_price: parseNumber(parts[parts.length - 1]),
    }))
    .filter((item) => item.description && item.quantity > 0);
}
