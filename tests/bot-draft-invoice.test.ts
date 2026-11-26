// @ts-nocheck
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createBotDraftInvoice, safeTokenEqual } from "../src/lib/bot-draft-invoice.ts";
import {
  applyShopeeOrderToInvoiceForm,
  blankDraftInvoiceForm,
} from "../src/lib/invoice-draft.ts";
import { calculateInvoiceTotals, roundMoney } from "../src/lib/invoice-totals.ts";
import { parseShopeeOrderText } from "../src/lib/shopee-import.ts";

const API_KEY = "test-bot-key-with-enough-entropy";
const COMPANY_ID = "company-a";
const OTHER_COMPANY_ID = "company-b";
const NOW = new Date(2026, 10, 26, 9, 0, 0);

const shopeeOrder = `หมายเลขคำสั่งซื้อ
261126SAMPLE01
ใบกำกับภาษี
ชื่อ-นามสกุล
ลูกค้าทดสอบ
ที่อยู่
99 ถนนทดสอบ กรุงเทพฯ
ประเภทสาขา
สำนักงานใหญ่
หมายเลขประจำตัวผู้เสียภาษี
0105555555555
รายละเอียดการชำระเงิน
No.
สินค้าทั้งหมด
ราคาต่อชิ้น
จำนวน
ราคาขายสุทธิ
1
สินค้าเอ
147
1
147
2
สินค้าบี
199
1
199
รวมค่าสินค้า
฿346
การชำระเงินของผู้ซื้อ
Shopee Voucher
-฿87
การชำระเงินทั้งหมดของผู้ซื้อ
฿259`;

function verifiedCompany(id, prefix = "IV") {
  return {
    id,
    iv_prefix: prefix,
    iv_due_days: 0,
    vat_registered: true,
    vat_verification_status: "verified",
  };
}

function createMemoryDb(seed = {}) {
  const tables = {
    company_settings: [...(seed.company_settings || [verifiedCompany(COMPANY_ID)])],
    invoices: [...(seed.invoices || [])],
    invoice_items: [...(seed.invoice_items || [])],
    customers: [...(seed.customers || [])],
  };
  const calls = [];
  let failedInserts = seed.failInvoiceInserts || 0;

  function from(table) {
    const state = {
      op: "select",
      payload: null,
      filters: [],
      limit: null,
      order: null,
      mode: "many",
    };
    const api = {
      select() { return api; },
      insert(payload) { state.op = "insert"; state.payload = payload; return api; },
      update(payload) { state.op = "update"; state.payload = payload; return api; },
      delete() { state.op = "delete"; return api; },
      eq(column, value) { state.filters.push({ op: "eq", column, value }); return api; },
      neq(column, value) { state.filters.push({ op: "neq", column, value }); return api; },
      ilike(column, value) { state.filters.push({ op: "ilike", column, value }); return api; },
      order(column, options) { state.order = { column, ascending: options?.ascending !== false }; return api; },
      limit(count) { state.limit = count; return api; },
      maybeSingle() { state.mode = "maybe"; return api; },
      single() { state.mode = "one"; return api; },
      then(onFulfilled, onRejected) {
        try {
          return Promise.resolve(onFulfilled(execute()));
        } catch (error) {
          if (onRejected) return Promise.resolve(onRejected(error));
          return Promise.reject(error);
        }
      },
    };

    function matches(row) {
      return state.filters.every((filter) => {
        if (filter.op === "eq") return row[filter.column] === filter.value;
        if (filter.op === "neq") return row[filter.column] !== filter.value;
        const pattern = String(filter.value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
        return new RegExp(`^${pattern}$`, "i").test(String(row[filter.column] ?? ""));
      });
    }

    function execute() {
      calls.push({
        table,
        op: state.op,
        payload: state.payload,
        filters: state.filters.map((filter) => ({ ...filter })),
      });
      const rows = tables[table];
      if (!rows) return { data: null, error: { code: "42P01", message: `unknown table ${table}` } };

      if (state.op === "select") {
        let found = rows.filter(matches);
        if (state.order) {
          const { column, ascending } = state.order;
          found = [...found].sort((left, right) => String(left[column] ?? "").localeCompare(String(right[column] ?? "")) * (ascending ? 1 : -1));
        }
        if (state.limit != null) found = found.slice(0, state.limit);
        if (state.mode === "many") return { data: found, error: null };
        if (!found[0]) {
          return state.mode === "maybe"
            ? { data: null, error: null }
            : { data: null, error: { code: "PGRST116", message: "No rows" } };
        }
        return { data: found[0], error: null };
      }

      if (state.op === "insert") {
        if (table === "invoices" && !Array.isArray(state.payload) && failedInserts > 0) {
          failedInserts -= 1;
          const competitor = { id: randomUUID(), created_at: new Date().toISOString(), ...state.payload };
          rows.push(competitor);
          return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
        }
        const incoming = Array.isArray(state.payload) ? state.payload : [state.payload];
        const inserted = incoming.map((row) => ({ id: randomUUID(), created_at: new Date().toISOString(), ...row }));
        if (table === "invoices") {
          const conflict = inserted.some((row) => rows.some((existing) => existing.company_id === row.company_id && existing.invoice_number === row.invoice_number));
          if (conflict) return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
        }
        rows.push(...inserted);
        if (state.mode === "many") return { data: inserted, error: null };
        return { data: inserted[0], error: null };
      }

      if (state.op === "update") {
        const updated = [];
        for (const row of rows) {
          if (!matches(row)) continue;
          Object.assign(row, state.payload);
          updated.push(row);
        }
        if (state.mode !== "many" && updated.length === 0) {
          return { data: null, error: { code: "PGRST116", message: "No rows" } };
        }
        return { data: state.mode === "many" ? updated : updated[0], error: null };
      }

      if (state.op === "delete") {
        const kept = rows.filter((row) => !matches(row));
        tables[table] = kept;
        return { data: null, error: null };
      }

      return { data: null, error: { message: "unsupported" } };
    }

    return api;
  }

  return { from, calls, tables };
}

function env(overrides = {}) {
  return {
    AUTOBILL_BOT_API_KEY: API_KEY,
    AUTOBILL_BOT_COMPANY_ID: COMPANY_ID,
    NEXT_PUBLIC_APP_URL: "https://app.example.com",
    ...overrides,
  };
}

function deps(db, overrides = {}) {
  const { env: envOverrides, ...rest } = overrides;
  return {
    supabase: db,
    env: env(envOverrides),
    now: NOW,
    origin: "https://request.example.com",
    delay: async () => {},
    ...rest,
  };
}

function uiTotalsForSample() {
  const parsed = parseShopeeOrderText(shopeeOrder);
  const form = applyShopeeOrderToInvoiceForm(blankDraftInvoiceForm("2026-11-26", "2026-11-26"), parsed);
  return { parsed, form, totals: calculateInvoiceTotals(form) };
}

test("bearer comparison rejects a different length and accepts the same key", () => {
  assert.equal(safeTokenEqual(API_KEY, API_KEY), true);
  assert.equal(safeTokenEqual("short", API_KEY), false);
  assert.equal(safeTokenEqual("", API_KEY), false);
});

test("rejects missing, malformed, and wrong bearer tokens", async () => {
  const db = createMemoryDb();
  for (const authorization of [null, "", "Basic " + API_KEY, "Bearer wrong-key", "Bearer " + API_KEY + " extra"]) {
    const result = await createBotDraftInvoice({ authorization, body: shopeeOrder }, deps(db));
    assert.equal(result.status, 401);
    assert.equal(result.body.error, "Unauthorized");
  }
  assert.equal(db.calls.length, 0);

  const missingKey = await createBotDraftInvoice(
    { authorization: "Bearer " + API_KEY, body: shopeeOrder },
    deps(createMemoryDb(), { env: { AUTOBILL_BOT_API_KEY: "" } }),
  );
  assert.equal(missingKey.status, 401);
});

test("binds the invoice to the env company and ignores a company id in the body", async () => {
  const db = createMemoryDb({
    company_settings: [verifiedCompany(COMPANY_ID, "IV"), verifiedCompany(OTHER_COMPANY_ID, "XX")],
    invoices: [{
      id: "other-invoice",
      company_id: OTHER_COMPANY_ID,
      invoice_number: "XX-20261126-0001",
      status: "issued",
      terms_conditions: "261126SAMPLE01",
      subtotal: 1,
      vat_amount: 0,
      total_amount: 1,
      created_at: "2026-11-26T00:00:00.000Z",
    }],
  });
  const result = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: {
      company_id: OTHER_COMPANY_ID,
      shopee_order_text: shopeeOrder,
    },
  }, deps(db));

  assert.equal(result.status, 200);
  assert.equal(result.body.duplicate, false);
  const companyLookups = db.calls.filter((call) => call.table === "company_settings");
  assert.ok(companyLookups.every((call) => call.filters.some((filter) => filter.op === "eq" && filter.column === "id" && filter.value === COMPANY_ID)));
  assert.equal(db.tables.invoices.some((invoice) => invoice.company_id === OTHER_COMPANY_ID && invoice.id !== "other-invoice"), false);
  const created = db.tables.invoices.find((invoice) => invoice.company_id === COMPANY_ID);
  assert.equal(created.company_id, COMPANY_ID);
  assert.equal(created.status, "draft");
  assert.equal(created.sales_channel, "shopee");
  assert.equal(created.terms_conditions, "261126SAMPLE01");
  assert.equal(db.tables.customers.every((customer) => customer.company_id === COMPANY_ID), true);
  assert.equal(db.calls.some((call) => call.table === "usage" || call.op === "rpc"), false);
});

test("rejects a company that is not VAT-verified", async () => {
  for (const company of [
    { ...verifiedCompany(COMPANY_ID), vat_verification_status: "pending" },
    { ...verifiedCompany(COMPANY_ID), vat_registered: false },
    { ...verifiedCompany(COMPANY_ID), vat_verification_status: "rejected" },
  ]) {
    const db = createMemoryDb({ company_settings: [company] });
    const result = await createBotDraftInvoice({
      authorization: `Bearer ${API_KEY}`,
      body: shopeeOrder,
    }, deps(db));
    assert.equal(result.status, 403);
    assert.equal(result.body.error, "Company is not VAT-verified");
    assert.equal(db.tables.invoices.length, 0);
  }

  const missing = createMemoryDb({ company_settings: [] });
  const missingResult = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: shopeeOrder,
  }, deps(missing, { env: { AUTOBILL_BOT_COMPANY_ID: "" } }));
  assert.equal(missingResult.status, 403);
  assert.equal(missing.calls.length, 0);
});

test("returns the existing non-cancelled invoice for the same Shopee order", async () => {
  const db = createMemoryDb({
    invoices: [
      {
        id: "cancelled-invoice",
        company_id: COMPANY_ID,
        invoice_number: "IV-20261120-0001",
        status: "cancelled",
        terms_conditions: "261126SAMPLE01",
        subtotal: 346,
        vat_amount: 22.64,
        total_amount: 346,
        amount_before_vat: 323.36,
        discount1_amount: 0,
        discount2_amount: 0,
        platform_discount_amount: 87,
        shopee_coin_discount_amount: 0,
        payment_method_discount_amount: 0,
        created_at: "2026-11-20T00:00:00.000Z",
      },
      {
        id: "issued-invoice",
        company_id: COMPANY_ID,
        invoice_number: "IV-20261125-0004",
        status: "issued",
        terms_conditions: "261126SAMPLE01",
        subtotal: 346,
        vat_amount: 22.64,
        total_amount: 346,
        amount_before_vat: 323.36,
        discount1_amount: 0,
        discount2_amount: 0,
        platform_discount_amount: 87,
        shopee_coin_discount_amount: 0,
        payment_method_discount_amount: 0,
        created_at: "2026-11-25T00:00:00.000Z",
      },
    ],
  });
  const result = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: { shopee_order_text: shopeeOrder },
  }, deps(db));

  assert.equal(result.status, 200);
  assert.equal(result.body.duplicate, true);
  assert.equal(result.body.id, "issued-invoice");
  assert.equal(result.body.invoice_number, "IV-20261125-0004");
  assert.equal(result.body.status, "issued");
  assert.equal(result.body.totals.total, 346);
  assert.equal(result.body.totals.customer_payment, 259);
  assert.equal(result.body.url, "https://app.example.com/invoices/issued-invoice/preview");
  assert.equal(db.calls.some((call) => call.op === "insert"), false);
});

test("a cancelled order can be drafted again, and a repeat call is a duplicate", async () => {
  const db = createMemoryDb({
    invoices: [{
      id: "cancelled-only",
      company_id: COMPANY_ID,
      invoice_number: "IV-20261126-0003",
      status: "cancelled",
      terms_conditions: "261126SAMPLE01",
      created_at: "2026-11-26T00:00:00.000Z",
    }],
  });
  const created = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: shopeeOrder,
  }, deps(db));
  assert.equal(created.status, 200);
  assert.equal(created.body.duplicate, false);
  assert.equal(created.body.status, "draft");
  assert.equal(created.body.invoice_number, "IV-20261126-0004");
  assert.match(created.body.url, /\/invoices\/.+\/edit$/);

  const again = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: shopeeOrder,
  }, deps(db));
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  assert.equal(again.body.id, created.body.id);
  assert.equal(db.tables.invoices.filter((invoice) => invoice.status !== "cancelled" && invoice.terms_conditions === "261126SAMPLE01").length, 1);
});

test("API totals match the invoice form for a Shopee order with VAT-inclusive prices", async () => {
  const { parsed, form, totals } = uiTotalsForSample();
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].unit_price, 147);
  assert.equal(parsed.items[1].unit_price, 199);
  assert.equal(parsed.items.every((item) => item.price_includes_vat), true);
  assert.equal(parsed.shopeeDiscount, 87);
  assert.equal(parsed.sellerDiscount, 0);
  assert.equal(form.sales_channel, "shopee");
  assert.equal(form.terms_conditions, "261126SAMPLE01");

  const db = createMemoryDb();
  const result = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: shopeeOrder,
  }, deps(db));

  assert.equal(result.status, 200);
  assert.equal(result.body.totals.subtotal, roundMoney(totals.subtotal));
  assert.equal(result.body.totals.vat, roundMoney(totals.vatAmount));
  assert.equal(result.body.totals.total, roundMoney(totals.totalAmount));
  assert.equal(result.body.totals.subtotal, 346);
  assert.equal(result.body.totals.vat, 22.64);
  assert.equal(result.body.totals.total, 346);
  assert.equal(result.body.totals.discounts.seller, 0);
  assert.equal(result.body.totals.discounts.shopee_voucher, 87);
  assert.equal(result.body.totals.customer_payment, 259);
  assert.equal(result.body.status, "draft");

  const invoice = db.tables.invoices.find((row) => row.company_id === COMPANY_ID);
  assert.equal(invoice.vat_amount, totals.vatAmount);
  assert.equal(invoice.total_amount, totals.totalAmount);
  assert.equal(invoice.platform_discount_amount, 87);
  assert.equal(db.tables.invoice_items.length, 2);
  assert.equal(db.tables.invoice_items.every((item) => item.price_includes_vat === true), true);
});

test("structured JSON uses the same totals as the invoice form and cannot be issued", async () => {
  const structured = {
    status: "draft",
    customer: {
      name: "ลูกค้าทดสอบ",
      tax_id: "0105555555555",
      branch_code: "00000",
      address: "99 ถนนทดสอบ กรุงเทพฯ",
    },
    items: [
      { description: "สินค้าเอ", quantity: 1, unit_price: 147 },
      { description: "สินค้าบี", quantity: 1, unit_price: 199 },
    ],
    discounts: { seller: 0, shopee_voucher: 87, shopee_coin: 0, payment_method: 0 },
    shopee_order_number: "261126JSON01",
    issue_date: "2026-11-26",
  };
  const { totals } = uiTotalsForSample();
  const db = createMemoryDb();
  const result = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: structured,
  }, deps(db));

  assert.equal(result.status, 200);
  assert.equal(result.body.totals.subtotal, roundMoney(totals.subtotal));
  assert.equal(result.body.totals.vat, roundMoney(totals.vatAmount));
  assert.equal(result.body.totals.total, roundMoney(totals.totalAmount));
  assert.equal(result.body.totals.customer_payment, 259);
  assert.equal(db.tables.invoices[0].status, "draft");
  assert.equal(db.tables.invoices[0].terms_conditions, "261126JSON01");

  const issued = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: { ...structured, status: "issued", shopee_order_number: "261126JSON02" },
  }, deps(createMemoryDb()));
  assert.equal(issued.status, 400);
  assert.match(issued.body.error, /draft/i);
});

test("returns 400 for an order that cannot become an invoice", async () => {
  const db = createMemoryDb();
  const missingItems = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: {
      customer: { name: "ลูกค้าทดสอบ" },
      items: [],
      shopee_order_number: "261126EMPTY",
    },
  }, deps(db));
  assert.equal(missingItems.status, 400);
  assert.match(missingItems.body.error, /item/i);

  const both = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: { shopee_order_text: shopeeOrder, customer: { name: "อื่น" }, items: [{ description: "x", quantity: 1, unit_price: 1 }] },
  }, deps(db));
  assert.equal(both.status, 400);
  assert.equal(db.tables.invoices.length, 0);
});

test("retries the day's next invoice number after a unique conflict", async () => {
  const db = createMemoryDb({ failInvoiceInserts: 1 });
  const result = await createBotDraftInvoice({
    authorization: `Bearer ${API_KEY}`,
    body: shopeeOrder,
  }, deps(db));
  assert.equal(result.status, 200);
  assert.equal(result.body.invoice_number, "IV-20261126-0002");
  const numbers = db.tables.invoices.map((invoice) => invoice.invoice_number).sort();
  assert.deepEqual(numbers, ["IV-20261126-0001", "IV-20261126-0002"]);
});
