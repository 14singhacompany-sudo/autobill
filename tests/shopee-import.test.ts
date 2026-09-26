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
