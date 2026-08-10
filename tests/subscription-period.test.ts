import test from "node:test";
import assert from "node:assert/strict";
import { activePeriod, addCalendarMonths, isActivePeriodExpired, thailandEndOfDay } from "../src/lib/subscription-period.ts";

test("calendar month extension clamps end-of-month correctly", () => {
  assert.equal(addCalendarMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addCalendarMonths("2028-01-31", 1), "2028-02-29");
});

test("active plan starts today and lasts the selected calendar months", () => {
  assert.deepEqual(activePeriod("2026-08-10", 1), {
    current_period_start: "2026-08-10",
    current_period_end: "2026-09-10",
  });
});

test("renewal extends from a future end date instead of losing paid time", () => {
  assert.equal(activePeriod("2026-08-10", 3, "2026-08-31").current_period_end, "2026-11-30");
});

test("trial date remains active through the selected Thai calendar day", () => {
  assert.equal(thailandEndOfDay("2026-08-10"), "2026-08-10T16:59:59.999Z");
});

test("paid plan remains usable through its end date and expires the next Thai day", () => {
  const lateOnEndDateUtc = new Date("2026-08-10T16:59:59.000Z");
  const nextThaiDayUtc = new Date("2026-08-10T17:00:00.000Z");
  assert.equal(isActivePeriodExpired("2026-08-10", lateOnEndDateUtc), false);
  assert.equal(isActivePeriodExpired("2026-08-10", nextThaiDayUtc), true);
});
