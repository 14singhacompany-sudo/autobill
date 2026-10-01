import assert from "node:assert/strict";
import test from "node:test";
import { parseShopeeOrderText } from "../src/lib/shopee-import.ts";

const sample = `หน้าหลัก
หมายเลขคำสั่งซื้อ
260925124G0RCP
ที่อยู่ในการจัดส่ง
ว******ง, ******90
ใบกำกับภาษี
Details
Copy
ชื่อ-นามสกุล
TANTHUNDER CO.,LTD. (สำนักงานใหญ่)
ที่อยู่
5 ม1, ตำบลโนนข่า, อำเภอพล, จังหวัดขอนแก่น, 40120
ประเภทสาขา
สำนักงานใหญ่
หมายเลขประจำตัวผู้เสียภาษี
0405564006352
Phone
0801985890
อีเมล
tanthunder2001@gmail.com
rkp888
รายละเอียดการชำระเงิน
No.
สินค้าทั้งหมด
ราคาต่อชิ้น
จำนวน
ราคาขายสุทธิ
1
Hot Listing
ใบตัดกระเบื้อง 4 นิ้ว ของแท้ 100%
ตัวเลือกสินค้า: ใบตัด 5 แถม 1 ใบ
731
1
731
ซ่อนรายละเอียดการชำระเงิน
โค้ดส่วนลดและเงินสนับสนุน
-฿60
โค้ดส่วนลดร้านค้าจากผู้ขาย - PA0DDIS60
-฿60
การชำระเงินของผู้ซื้อ
รวมค่าสินค้า
฿731
ค่าจัดส่ง
฿0
Shopee Voucher
-฿168
Seller Voucher
-฿60
การชำระเงินทั้งหมดของผู้ซื้อ
฿503`;

test("imports a copied Shopee order into invoice fields", () => {
  const result = parseShopeeOrderText(sample);
  assert.equal(result.orderNumber, "260925124G0RCP");
  assert.equal(result.customerName, "TANTHUNDER CO.,LTD.");
  assert.equal(result.customerTaxId, "0405564006352");
  assert.equal(result.customerBranchCode, "00000");
  assert.equal(result.customerPhone, "0801985890");
  assert.equal(result.customerEmail, "tanthunder2001@gmail.com");
  assert.equal(result.sellerDiscount, 60);
  assert.equal(result.shopeeDiscount, 168);
  assert.equal(result.shopeeCoinDiscount, 0);
  assert.equal(result.termsConditions, "260925124G0RCP");
  assert.match(result.notes, /PA0DDIS60/);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 1);
  assert.equal(result.items[0].unit_price, 731);
  assert.equal(result.items[0].price_includes_vat, true);
});

test("accepts Shopee label variants, tabs, and discounts on the same line", () => {
  const variant = `Order ID\t260930ABC123
ข้อมูลใบกำกับภาษี
ชื่อบริษัท\tบริษัท ทดสอบ จำกัด (สำนักงานใหญ่)
ที่อยู่สำหรับออกใบกำกับภาษี\t99 แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500
เลขประจำตัวผู้เสียภาษี\t0105555555555
โทรศัพท์\t081-234-5678
Email\ttest@example.com
รายละเอียดการชำระเงิน
No.
สินค้าทั้งหมด
ราคาต่อชิ้น
จำนวน
ราคาสุทธิ
1
สินค้าทดสอบ
500
2
1000
รวมค่าสินค้า
฿1000
การชำระเงินของผู้ซื้อ
ส่วนลดจาก Shopee -฿120
ส่วนลดร้านค้า -฿30
ใช้ Shopee Coins -฿10
การชำระเงินทั้งหมดของผู้ซื้อ
฿840`;

  const result = parseShopeeOrderText(variant);
  assert.equal(result.orderNumber, "260930ABC123");
  assert.equal(result.customerName, "บริษัท ทดสอบ จำกัด");
  assert.equal(result.customerAddress, "99 แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500");
  assert.equal(result.customerTaxId, "0105555555555");
  assert.equal(result.customerPhone, "0812345678");
  assert.equal(result.customerEmail, "test@example.com");
  assert.equal(result.sellerDiscount, 30);
  assert.equal(result.shopeeDiscount, 120);
  assert.equal(result.shopeeCoinDiscount, 10);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[0].unit_price, 500);
});

test("keeps useful order and discount data when the copied page has no parseable item table", () => {
  const partial = `เลขที่คำสั่งซื้อ
260930PARTIAL
ใบกำกับภาษี
ชื่อผู้เสียภาษี
นาย ทดสอบ ระบบ
เลขผู้เสียภาษี
1234567890123
ข้อมูลการชำระเงิน
ยอดชำระของผู้ซื้อ
Shopee Voucher
-฿88`;

  const result = parseShopeeOrderText(partial);
  assert.equal(result.orderNumber, "260930PARTIAL");
  assert.equal(result.customerName, "นาย ทดสอบ ระบบ");
  assert.equal(result.shopeeDiscount, 88);
  assert.equal(result.items.length, 0);
});
