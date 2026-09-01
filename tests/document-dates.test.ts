import assert from "node:assert/strict";
import test from "node:test";

import {
  addDaysToLocalDate,
  differenceInLocalCalendarDays,
  getPaymentTermDays,
} from "../src/lib/document-dates.ts";

test("adds payment days across month boundaries", () => {
  assert.equal(addDaysToLocalDate("2026-08-31", 7), "2026-09-07");
});

test("adds payment days across leap day", () => {
  assert.equal(addDaysToLocalDate("2028-02-28", 1), "2028-02-29");
});

test("calculates the selected quotation validity period", () => {
  assert.equal(differenceInLocalCalendarDays("2026-08-31", "2026-09-15"), 15);
});

test("reads standard payment terms", () => {
  assert.equal(getPaymentTermDays("ชำระภายใน 7 วัน"), 7);
  assert.equal(getPaymentTermDays("ชำระทันที"), 0);
  assert.equal(getPaymentTermDays("ชำระภายในวันที่ 2026-09-07"), null);
});
