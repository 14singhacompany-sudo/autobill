import assert from "node:assert/strict";
import test from "node:test";
import { parseCustomerText, parseItemsText } from "../src/lib/text-extractor.ts";

test("parses labeled Thai customer data without AI", () => {
  const customer = parseCustomerText(`ชื่อ: บริษัท ทดสอบ จำกัด\nเลขผู้เสียภาษี: 010-5551-23456-7\nสาขา: 00000\nที่อยู่: 123 ถนนสุขุมวิท กรุงเทพฯ 10110\nโทร: 02-123-4567\nอีเมล: info@example.com`);
  assert.equal(customer.customer_name, "บริษัท ทดสอบ จำกัด");
  assert.equal(customer.customer_tax_id, "0105551234567");
  assert.equal(customer.customer_branch_code, "00000");
  assert.equal(customer.customer_email, "info@example.com");
});

test("normalizes Thai digits from OCR", () => {
  const customer = parseCustomerText("เลขผู้เสียภาษี: ๐๑๐๕๕๕๑๒๓๔๕๖๗");
  assert.equal(customer.customer_tax_id, "0105551234567");
});

test("parses comma-separated customer data without reusing tax ID as phone", () => {
  const customer = parseCustomerText("kunavoot@gmail.com, โบลเตอร์ สจ๊วต, 0105541046822, ยูนิต 1206 ชั้น 12 อาคารชาร์เตอร์ สแควร์, แขวงสีลม, เขตบางรัก, จังหวัดกรุงเทพมหานคร, 10500, 0898336904");
  assert.equal(customer.customer_name, "โบลเตอร์ สจ๊วต");
  assert.equal(customer.customer_tax_id, "0105541046822");
  assert.equal(customer.customer_phone, "0898336904");
  assert.equal(customer.customer_email, "kunavoot@gmail.com");
  assert.equal(customer.customer_address, "ยูนิต 1206 ชั้น 12 อาคารชาร์เตอร์ สแควร์, แขวงสีลม, เขตบางรัก, จังหวัดกรุงเทพมหานคร, 10500");
});

test("does not treat an unlabeled tax ID as a phone number", () => {
  const customer = parseCustomerText("0105541046822");
  assert.equal(customer.customer_tax_id, "0105541046822");
  assert.equal(customer.customer_phone, "");
});

test("parses pipe and tab separated items", () => {
  const items = parseItemsText("กระดาษ A4 | 10 | รีม | 120\nหมึกพิมพ์\t2\tกล่อง\t850");
  assert.deepEqual(items, [
    { description: "กระดาษ A4", quantity: 10, unit: "รีม", unit_price: 120 },
    { description: "หมึกพิมพ์", quantity: 2, unit: "กล่อง", unit_price: 850 },
  ]);
});
