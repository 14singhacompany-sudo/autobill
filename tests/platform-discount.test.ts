import assert from "node:assert/strict";
import test from "node:test";
import { getCustomerPayment, normalizePlatformDiscount } from "../src/lib/platform-discount.ts";

test("Shopee-funded discount does not alter the document total", () => {
  const documentTotal = 998;
  const platformDiscount = normalizePlatformDiscount("shopee", 132, documentTotal);
  assert.equal(documentTotal, 998);
  assert.equal(platformDiscount, 132);
  assert.equal(getCustomerPayment(documentTotal, platformDiscount), 866);
});

test("platform discount is disabled outside Shopee", () => {
  assert.equal(normalizePlatformDiscount("facebook", 132, 998), 0);
});

test("platform discount cannot exceed the document total", () => {
  assert.equal(normalizePlatformDiscount("shopee", 1200, 998), 998);
  assert.equal(getCustomerPayment(998, 998), 0);
});

test("Shopee discount and Shopee Coin are combined for the buyer payment", () => {
  assert.equal(getCustomerPayment(1098, 100, 32), 966);
});
