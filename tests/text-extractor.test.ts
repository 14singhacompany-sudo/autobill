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

test("parses an individual whose name appears after the address", () => {
  const customer = parseCustomerText("prapassorn.chang@gmail.com, 20/7 ถนนบุรีรัมย์-นางรอง , ตำบลถนนหัก, อำเภอนางรอง, จังหวัดบุรีรัมย์, 31110, น.ส.ประภัสสร ช่างสลัก, 1809900234431");
  assert.equal(customer.customer_name, "น.ส.ประภัสสร ช่างสลัก");
  assert.equal(customer.customer_tax_id, "1809900234431");
  assert.equal(customer.customer_email, "prapassorn.chang@gmail.com");
  assert.equal(customer.customer_phone, "");
  assert.equal(customer.customer_type, "individual");
  assert.equal(customer.customer_branch_code, "");
  assert.equal(customer.customer_address, "20/7 ถนนบุรีรัมย์-นางรอง, ตำบลถนนหัก, อำเภอนางรอง, จังหวัดบุรีรัมย์, 31110");
});

test("recognizes an ordinary personal name without a title", () => {
  const customer = parseCustomerText("somchai@example.com, สมชาย ใจดี, 99 ถนนสุขุมวิท, เขตวัฒนา, กรุงเทพมหานคร, 10110, 1101700203451");
  assert.equal(customer.customer_name, "สมชาย ใจดี");
  assert.equal(customer.customer_type, "individual");
  assert.equal(customer.customer_branch_code, "");
  assert.equal(customer.customer_address, "99 ถนนสุขุมวิท, เขตวัฒนา, กรุงเทพมหานคร, 10110");
});

test("recognizes a labeled multiline individual and ignores headquarters code", () => {
  const customer = parseCustomerText(`===== ข้อมูลลูกค้า =====
ชื่อ: ศศิตา จรรยาศิริ
ผู้ติดต่อ: -
ที่อยู่: 789/18 ม.18 ต.ปากช่อง อ.ปากช่อง นครราชสีมา 30130
โทรศัพท์: 098-2966515
อีเมล: -
เลขประจำตัวผู้เสียภาษี: 1340500024028
รหัสสาขา: 00000 (สำนักงานใหญ่)
========================`);
  assert.equal(customer.customer_name, "ศศิตา จรรยาศิริ");
  assert.equal(customer.customer_type, "individual");
  assert.equal(customer.customer_branch_code, "");
  assert.equal(customer.customer_tax_id, "1340500024028");
  assert.equal(customer.customer_phone, "0982966515");
  assert.equal(customer.customer_address, "789/18 ม.18 ต.ปากช่อง อ.ปากช่อง นครราชสีมา 30130");
});

test("supports reordered fields separated by pipes and equals signs", () => {
  const customer = parseCustomerText("เลขผู้เสียภาษี = 1234567890123 | โทร = 081-234-5678 | ผู้ซื้อ = วิชัย รุ่งเรือง | ที่อยู่ผู้ซื้อ = 55/2 ซอยสุขใจ เชียงใหม่ 50000");
  assert.equal(customer.customer_name, "วิชัย รุ่งเรือง");
  assert.equal(customer.customer_type, "individual");
  assert.equal(customer.customer_branch_code, "");
  assert.equal(customer.customer_phone, "0812345678");
  assert.equal(customer.customer_address, "55/2 ซอยสุขใจ เชียงใหม่ 50000");
});

test("supports semicolon-separated company fields", () => {
  const customer = parseCustomerText("ที่อยู่: 88 ถนนพระราม 9 กรุงเทพฯ 10310; บริษัท เอ บี ซี จำกัด; 0105551234567; info@abc.co.th");
  assert.equal(customer.customer_name, "บริษัท เอ บี ซี จำกัด");
  assert.equal(customer.customer_type, "company");
  assert.equal(customer.customer_branch_code, "00000");
  assert.equal(customer.customer_email, "info@abc.co.th");
});

test("parses pipe and tab separated items", () => {
  const items = parseItemsText("กระดาษ A4 | 10 | รีม | 120\nหมึกพิมพ์\t2\tกล่อง\t850");
  assert.deepEqual(items, [
    { description: "กระดาษ A4", quantity: 10, unit: "รีม", unit_price: 120 },
    { description: "หมึกพิมพ์", quantity: 2, unit: "กล่อง", unit_price: 850 },
  ]);
});
