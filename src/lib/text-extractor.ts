import type { ExtractedItem } from "@/types/database";

export interface ParsedCustomerData {
  customer_type: "individual" | "company" | "";
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
  const match = text.match(new RegExp(`^\\s*(?:${escaped.join("|")})\\s*[:：=\-]?\\s*(.+)$`, "im"));
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

function isLikelyPersonName(value: string) {
  return /^(?:นาย|นาง|น\.\s*ส\.|นางสาว|ด\.\s*ช\.|เด็กชาย|ด\.\s*ญ\.|เด็กหญิง)\s*\S+/i.test(value.trim());
}

function isLikelyCompanyName(value: string) {
  return /(?:บริษัท|ห้างหุ้นส่วน|หจก\.?|บจก\.?|จำกัด|company|co\.?\s*,?\s*ltd\.?|corporation|corp\.?|limited|ltd\.?)/i.test(value);
}

function isPostalCode(value: string) {
  return /^\d{5}$/.test(value.replace(/\s/g, ""));
}

function isLikelyUnmarkedPersonName(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /\d|@/.test(trimmed) || isLikelyCompanyName(trimmed)) return false;
  if (/(?:ถนน|ซอย|หมู่|ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.|แขวง|เขต|กรุงเทพ|อาคาร|ชั้น|เลขที่)/i.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 5;
}

export function parseCustomerText(input: string): ParsedCustomerData {
  const text = normalizeOcrText(input);
  const labeledText = text.replace(/[;|]+/g, "\n");
  const taxCandidate = text.match(/(?:\d[\s-]*){13}/)?.[0]?.replace(/\D/g, "") || "";
  const taxId = taxCandidate.length === 13 ? taxCandidate : "";
  const labeledBranch = valueAfterLabel(labeledText, ["รหัสสาขา", "สาขา", "branch"]).match(/\d{5}/)?.[0] || "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = findPhone(text, taxId);
  const explicitName = valueAfterLabel(labeledText, [
    "ชื่อบริษัท", "ชื่อกิจการ", "ชื่อร้านค้า", "ชื่อลูกค้า", "ชื่อผู้ซื้อ",
    "ชื่อ-นามสกุล", "ชื่อ นามสกุล", "ผู้ซื้อ", "ลูกค้า", "ชื่อ", "company", "customer", "name",
  ]);
  const companyLine = labeledText.split("\n").map((line) => line.trim()).find((line) => /บริษัท|ห้างหุ้นส่วน/.test(line)) || "";
  // Customer messages commonly arrive from chat, spreadsheets, or copied
  // documents, so accept commas, newlines, semicolons, and pipe separators.
  const commaParts = text
    .split(/[,;|\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^(?:ชื่อ(?:บริษัท|กิจการ|ร้านค้า|ลูกค้า|ผู้ซื้อ|-นามสกุล|\s+นามสกุล)?|ผู้ซื้อ|ลูกค้า|company|customer|name)\s*[:：=\-]?\s*/i, "").trim())
    .filter(Boolean);
  const taxPartIndex = commaParts.findIndex((part) => part.replace(/\D/g, "") === taxId && Boolean(taxId));
  const personName = commaParts.find(isLikelyPersonName) || "";
  const businessName = commaParts.find(isLikelyCompanyName) || "";
  const unmarkedPersonName = commaParts.find((part) => part !== email && isLikelyUnmarkedPersonName(part)) || "";
  const fallbackName = taxPartIndex > 0
    ? commaParts.slice(0, taxPartIndex).find((part) => part !== email && !normalizePhone(part) && !isPostalCode(part)) || ""
    : "";
  const inferredName = businessName || personName || unmarkedPersonName || fallbackName;
  const explicitCompanyName = isLikelyCompanyName(explicitName);
  const explicitPersonName = !explicitCompanyName && (isLikelyPersonName(explicitName) || isLikelyUnmarkedPersonName(explicitName));
  const customerType = explicitPersonName || personName || unmarkedPersonName
    ? "individual"
    : explicitCompanyName || businessName || companyLine
      ? "company"
      : "";
  const inferredAddress = taxPartIndex >= 0
    ? commaParts
        .filter((part) => {
          if (part === email || part === inferredName) return false;
          if (part.replace(/\D/g, "") === taxId) return false;
          if (normalizePhone(part)) return false;
          return true;
        })
        .join(", ")
    : "";

  return {
    customer_type: customerType,
    customer_name: explicitName || companyLine || inferredName,
    customer_address: valueAfterLabel(labeledText, ["ที่อยู่ผู้ซื้อ", "ที่อยู่ลูกค้า", "ที่อยู่", "address"]) || inferredAddress,
    customer_tax_id: taxId,
    customer_branch_code: customerType === "individual" ? "" : labeledBranch || "00000",
    customer_contact: valueAfterLabel(labeledText, ["ชื่อผู้ติดต่อ", "ผู้ติดต่อ", "ติดต่อ", "contact person", "contact"]),
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
