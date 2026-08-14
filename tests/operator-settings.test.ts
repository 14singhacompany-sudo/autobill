import assert from "node:assert/strict";
import test from "node:test";
import { isOperatorTaxIdRequired, normalizeVatRegistrationDate } from "../src/lib/operator-settings.ts";

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
