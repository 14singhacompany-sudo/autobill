import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCustomerBranchSuffix,
  formatCustomerNameWithBranch,
} from "../src/lib/customer-branch-label.ts";

const company = "บริษัท บุญเจริญทรัพย์ คอนสตรัคชั่น จำกัด";

test("prints a numbered branch after the customer name", () => {
  assert.equal(formatCustomerBranchSuffix("00001"), "(สาขาที่ 00001)");
  assert.equal(
    formatCustomerNameWithBranch(company, "00001"),
    "บริษัท บุญเจริญทรัพย์ คอนสตรัคชั่น จำกัด (สาขาที่ 00001)",
  );
});

test("prints the head office after the customer name", () => {
  assert.equal(formatCustomerBranchSuffix("00000"), "(สำนักงานใหญ่)");
  assert.equal(
    formatCustomerNameWithBranch(company, " 00000 "),
    "บริษัท บุญเจริญทรัพย์ คอนสตรัคชั่น จำกัด (สำนักงานใหญ่)",
  );
});

test("prints no branch text for individuals and blank codes", () => {
  assert.equal(formatCustomerBranchSuffix(""), "");
  assert.equal(formatCustomerBranchSuffix("   "), "");
  assert.equal(formatCustomerBranchSuffix(null), "");
  assert.equal(formatCustomerBranchSuffix(undefined), "");
  assert.equal(formatCustomerNameWithBranch("สมชาย ใจดี", ""), "สมชาย ใจดี");
  assert.equal(formatCustomerNameWithBranch("สมชาย ใจดี", null), "สมชาย ใจดี");
});

test("keeps other branch codes as stored", () => {
  assert.equal(
    formatCustomerNameWithBranch(company, "00012"),
    "บริษัท บุญเจริญทรัพย์ คอนสตรัคชั่น จำกัด (สาขาที่ 00012)",
  );
});
