import assert from "node:assert/strict";
import test from "node:test";
import { getMissingIssuerProfileFields, isOperatorTaxIdRequired, normalizeVatRegistrationDate } from "../src/lib/operator-settings.ts";

test("tax ID requirement covers every operator and VAT combination", () => {
  assert.equal(isOperatorTaxIdRequired("individual", false), false);
  assert.equal(isOperatorTaxIdRequired("individual", true), true);
  assert.equal(isOperatorTaxIdRequired("juristic", false), true);
  assert.equal(isOperatorTaxIdRequired("juristic", true), true);
  assert.equal(isOperatorTaxIdRequired("partnership", false), true);
  assert.equal(isOperatorTaxIdRequired("partnership", true), true);
  assert.equal(isOperatorTaxIdRequired("", null), false);
});

test("VAT registration date is null for every non-VAT operator", () => {
  assert.equal(normalizeVatRegistrationDate(false, ""), null);
  assert.equal(normalizeVatRegistrationDate(false, "2026-08-14"), null);
  assert.equal(normalizeVatRegistrationDate(null, ""), null);
  assert.equal(normalizeVatRegistrationDate(true, ""), null);
  assert.equal(normalizeVatRegistrationDate(true, "2026-08-14"), "2026-08-14");
});

test("complete issuer profiles pass for all account combinations", () => {
  const base = { company_name: "ร้านทดสอบ", address: "กรุงเทพฯ", phone: "0812345678", email: "test@example.com" };
  assert.deepEqual(getMissingIssuerProfileFields({ ...base, entity_type: "individual", vat_registered: false, tax_id: "" }), []);
  assert.deepEqual(getMissingIssuerProfileFields({ ...base, entity_type: "individual", vat_registered: true, tax_id: "1101700000001", branch_code: "00000" }), []);
  assert.deepEqual(getMissingIssuerProfileFields({ ...base, entity_type: "juristic", vat_registered: false, tax_id: "0105550000001" }), []);
  assert.deepEqual(getMissingIssuerProfileFields({ ...base, entity_type: "juristic", vat_registered: true, tax_id: "0105550000001", branch_code: "00000" }), []);
});

test("issuer profile reports fields required by account type", () => {
  const base = { company_name: "ร้านทดสอบ", address: "กรุงเทพฯ", phone: "0812345678", email: "test@example.com" };
  assert.deepEqual(getMissingIssuerProfileFields({ ...base, entity_type: "individual", vat_registered: false }), []);
  assert.deepEqual(getMissingIssuerProfileFields({ ...base, entity_type: "juristic", vat_registered: false }), ["เลขประจำตัวผู้เสียภาษี 13 หลัก"]);
  assert.deepEqual(getMissingIssuerProfileFields({ ...base, entity_type: "individual", vat_registered: true, tax_id: "1101700000001" }), ["รหัสสาขา 5 หลัก"]);
});
