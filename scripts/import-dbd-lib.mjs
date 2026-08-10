export const FIELD_ALIASES = {
  tax_id: ["tax_id", "taxid", "juristic_id", "juristicid", "เลขทะเบียนนิติบุคคล", "เลขประจำตัวผู้เสียภาษี"],
  name_th: ["name_th", "name", "juristic_name_th", "ชื่อ", "ชื่อนิติบุคคล"],
  company_type: ["company_type", "juristic_type", "ประเภทนิติบุคคล"],
  status: ["status", "juristic_status", "สถานะ", "สถานะนิติบุคคล"],
  address: ["address", "address_th", "ที่อยู่"],
  registration_date: ["registration_date", "register_date", "วันที่จดทะเบียน"],
  source_updated_at: ["source_updated_at", "updated_at", "วันที่ปรับปรุงข้อมูล"],
};

export function normalizeTaxId(value) {
  if (value === null || value === undefined) return null;
  const result = String(value).replace(/[\s-]/g, "");
  return /^\d{13}$/.test(result) ? result : null;
}

function valueFor(row, aliases) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return null;
}

export function mapDbdRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const tax_id = normalizeTaxId(valueFor(row, FIELD_ALIASES.tax_id));
  const name_th = valueFor(row, FIELD_ALIASES.name_th);
  if (!tax_id || !name_th) return null;
  return {
    tax_id,
    name_th,
    company_type: valueFor(row, FIELD_ALIASES.company_type),
    status: valueFor(row, FIELD_ALIASES.status),
    address: valueFor(row, FIELD_ALIASES.address),
    registration_date: valueFor(row, FIELD_ALIASES.registration_date),
    source_updated_at: valueFor(row, FIELD_ALIASES.source_updated_at),
  };
}

export function parseCsvRecord(record) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < record.length; index++) {
    const char = record[index];
    if (char === '"') {
      if (quoted && record[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value);
  return values;
}

