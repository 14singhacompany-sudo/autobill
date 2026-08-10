import test from "node:test";
import assert from "node:assert/strict";
import { mapDbdRow, normalizeTaxId, parseCsvRecord } from "../scripts/import-dbd-lib.mjs";

test("accepts only normalized 13 digit tax IDs", () => {
  assert.equal(normalizeTaxId("01055-12345 678"), "0105512345678");
  assert.equal(normalizeTaxId("010551234567"), null);
  assert.equal(normalizeTaxId("010551234567x"), null);
});

test("maps Thai DBD fields and permits a missing address", () => {
  assert.deepEqual(mapDbdRow({ "เลขทะเบียนนิติบุคคล": "0105512345678", "ชื่อนิติบุคคล": "บริษัท ทดสอบ จำกัด" }), {
    tax_id: "0105512345678", name_th: "บริษัท ทดสอบ จำกัด", company_type: null,
    status: null, address: null, registration_date: null, source_updated_at: null,
  });
});

test("skips malformed or incomplete rows", () => {
  assert.equal(mapDbdRow({ tax_id: "bad", name_th: "Example" }), null);
  assert.equal(mapDbdRow({ tax_id: "0105512345678" }), null);
});

test("parses commas and escaped quotes in CSV fields", () => {
  assert.deepEqual(parseCsvRecord('0105512345678,"บริษัท ""ทดสอบ"", จำกัด"'), ["0105512345678", 'บริษัท "ทดสอบ", จำกัด']);
});

test("maps common English DBD field aliases", () => {
  const row = mapDbdRow({ juristic_id: "0105512345678", juristic_name_th: "บริษัท ตัวอย่าง จำกัด", address_th: "กรุงเทพฯ", juristic_status: "ดำเนินกิจการ" });
  assert.equal(row.name_th, "บริษัท ตัวอย่าง จำกัด");
  assert.equal(row.address, "กรุงเทพฯ");
  assert.equal(row.status, "ดำเนินกิจการ");
});

test("normalization is idempotent for repeated imports", () => {
  assert.equal(normalizeTaxId(normalizeTaxId("0105512345678")), "0105512345678");
});

