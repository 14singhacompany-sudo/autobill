import test from "node:test";
import assert from "node:assert/strict";
import {
  findUniquePostalCode,
  getDbdSubdivisionCode,
  isExactTaxId,
  normalizeTaxId,
  parseDbdCompanyResponse,
} from "../src/lib/company-registry.ts";

test("server validator accepts exactly 13 digits", () => {
  assert.equal(isExactTaxId("0105512345678"), true);
});

test("server validator rejects fewer than 13 digits", () => {
  assert.equal(isExactTaxId("010551234567"), false);
});

test("server validator rejects letters", () => {
  assert.equal(isExactTaxId("010551234567x"), false);
});

test("shared normalizer handles separators and invalid input", () => {
  assert.equal(normalizeTaxId("01055-12345 678"), "0105512345678");
  assert.equal(normalizeTaxId(undefined), null);
});

test("parses the official nested DBD response", () => {
  const company = parseDbdCompanyResponse({ data: [{
    "cd:OrganizationJuristicPerson": {
      "cd:OrganizationJuristicID": "0105500002375",
      "cd:OrganizationJuristicNameTH": "บริษัท ทดสอบระบบทะเบียน",
      "cd:OrganizationJuristicType": "บริษัทจำกัด",
      "cd:OrganizationJuristicStatus": "ยังดำเนินกิจการอยู่",
      "cd:OrganizationJuristicRegisterDate": "20140128",
      "cd:OrganizationJuristicAddress": { "cr:AddressType": {
        "cd:Address": "99 ถนนสุขุมวิท",
        "cd:CitySubDivision": { "cr:CitySubDivisionTextTH": "คลองเตย" },
        "cd:City": { "cr:CityTextTH": "เขตคลองเตย" },
        "cd:CountrySubDivision": { "cr:CountrySubDivisionTextTH": "กรุงเทพมหานคร" },
      } },
    },
  }] });
  assert.equal(company?.tax_id, "0105500002375");
  assert.equal(company?.registration_date, "2014-01-28");
  assert.equal(company?.address, "99 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร");
});

test("formats provincial DBD addresses with Thai administrative prefixes", () => {
  const company = parseDbdCompanyResponse({ data: [{ "cd:OrganizationJuristicPerson": {
    "cd:OrganizationJuristicID": "0135565000164",
    "cd:OrganizationJuristicNameTH": "บริษัท ไทย อี พี จำกัด",
    "cd:OrganizationJuristicAddress": { "cr:AddressType": {
      "cd:Address": "73/3 หมู่ที่ 3",
      "cd:CitySubDivision": { "cr:CitySubDivisionTextTH": "ท้ายเกาะ" },
      "cd:City": { "cr:CityTextTH": "สามโคก" },
      "cd:CountrySubDivision": { "cr:CountrySubDivisionTextTH": "ปทุมธานี" },
    } },
  } }] });
  assert.equal(company?.address, "73/3 หมู่ที่ 3 ตำบลท้ายเกาะ อำเภอสามโคก จังหวัดปทุมธานี");
});

test("rejects unsuccessful or malformed DBD responses", () => {
  assert.equal(parseDbdCompanyResponse({ status: { code: "1051" }, data: [] }), null);
});

test("extracts the DBD subdivision code and maps a unique postal code", () => {
  const payload = { data: [{ "cd:OrganizationJuristicPerson": {
    "cd:OrganizationJuristicAddress": { "cr:AddressType": {
      "cd:CitySubDivision": { "cr:CitySubDivisionCode": "21020200" },
    } },
  } }] };
  assert.equal(getDbdSubdivisionCode(payload), "21020200");
  const html = "<tr><td>21020000</td><td>บ้านฉาง</td><td>21020200</td><td>พลา</td><td>21000000</td><td>ระยอง</td><td>21130</td></tr>";
  assert.equal(findUniquePostalCode(html, "21020200"), "21130");
});

test("does not guess when an administrative area has multiple postal codes", () => {
  const html = [
    "<tr><td>21010000</td><td>เมืองระยอง</td><td>21010900</td><td>เนินพระ</td><td>21000000</td><td>ระยอง</td><td>21000</td></tr>",
    "<tr><td>21010000</td><td>เมืองระยอง</td><td>21010900</td><td>เนินพระ</td><td>21000000</td><td>ระยอง</td><td>21150</td></tr>",
  ].join("");
  assert.equal(findUniquePostalCode(html, "21010900"), null);
});
