import { createHash, timingSafeEqual } from "node:crypto";
import { getCustomerPayment } from "@/lib/platform-discount";
import { parseShopeeOrderText } from "@/lib/shopee-import";
import {
  applyShopeeOrderToInvoiceForm,
  blankDraftInvoiceForm,
  defaultDueDate,
  findOrCreateCustomerRecord,
  getLocalDateString,
  insertDraftInvoice,
  InvoiceItemsInsertError,
  type DraftInvoiceInput,
  type InvoiceDb,
} from "@/lib/invoice-draft";
import {
  presentInvoiceTotals,
  roundMoney,
  type PresentedInvoiceTotals,
} from "@/lib/invoice-totals";

const MAX_TEXT_LENGTH = 100_000;
const MAX_ITEMS = 200;

export interface BotDraftEnv {
  AUTOBILL_BOT_API_KEY?: string;
  AUTOBILL_BOT_COMPANY_ID?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

export interface BotDraftDependencies {
  supabase: InvoiceDb;
  env: BotDraftEnv;
  origin?: string;
  now?: Date;
  delay?: (ms: number) => Promise<void>;
}

export interface BotDraftResult {
  status: number;
  body: Record<string, unknown>;
}

export function safeTokenEqual(provided: string, expected: string): boolean {
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function isAuthorizedBearer(header: string | null, expectedKey: string | undefined): boolean {
  if (!expectedKey) return false;
  const token = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "")?.[1] ?? "";
  const matches = safeTokenEqual(token.length > 512 ? "" : token, expectedKey);
  return token.length <= 512 && matches;
}

function jsonError(status: number, error: string): BotDraftResult {
  return { status, body: { error } };
}

function appBase(deps: BotDraftDependencies) {
  return (deps.env.NEXT_PUBLIC_APP_URL || deps.origin || "").replace(/\/$/, "");
}

function invoicePageUrl(deps: BotDraftDependencies, id: string, status: string) {
  const page = status === "draft" ? "edit" : "preview";
  const path = `/invoices/${id}/${page}`;
  const base = appBase(deps);
  return base ? `${base}${path}` : path;
}

function presentStoredTotals(row: Record<string, unknown>): PresentedInvoiceTotals {
  const total = Number(row.total_amount) || 0;
  const voucher = Number(row.platform_discount_amount) || 0;
  const coin = Number(row.shopee_coin_discount_amount) || 0;
  const payment = Number(row.payment_method_discount_amount) || 0;
  return {
    subtotal: roundMoney(Number(row.subtotal) || 0),
    vat: roundMoney(Number(row.vat_amount) || 0),
    total: roundMoney(total),
    amount_before_vat: roundMoney(Number(row.amount_before_vat) || 0),
    discounts: {
      seller: roundMoney(Number(row.discount1_amount ?? row.discount_amount) || 0),
      additional: roundMoney(Number(row.discount2_amount) || 0),
      shopee_voucher: roundMoney(voucher),
      shopee_coin: roundMoney(coin),
      payment_method: roundMoney(payment),
    },
    customer_payment: roundMoney(getCustomerPayment(total, voucher, coin, payment)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function readMoney(value: unknown, label: string): number | string {
  if (value == null || value === "") return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return `${label} must be a number greater than or equal to 0`;
  }
  return value;
}

function formFromShopeeText(
  text: string,
  issueDate: string,
  dueDate: string,
): { form: DraftInvoiceInput } | { error: string } {
  if (!text.trim()) return { error: "Shopee order text is empty" };
  if (text.length > MAX_TEXT_LENGTH) return { error: "Shopee order text is too long" };

  const parsed = parseShopeeOrderText(text);
  if (!parsed.orderNumber) return { error: "Shopee order number was not found in the order text" };
  if (!parsed.customerName) return { error: "Customer name was not found in the order text" };
  if (parsed.items.length === 0) return { error: "No invoice items were found in the order text" };

  return {
    form: applyShopeeOrderToInvoiceForm(blankDraftInvoiceForm(issueDate, dueDate), parsed),
  };
}

function formFromStructured(
  body: Record<string, unknown>,
  issueDate: string,
  dueDate: string,
): { form: DraftInvoiceInput } | { error: string } {
  if (body.sales_channel != null && String(body.sales_channel).trim().toLowerCase() !== "shopee") {
    return { error: "This endpoint only creates Shopee drafts" };
  }
  if (!isRecord(body.customer)) return { error: "customer is required" };

  const customer = body.customer;
  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  if (!name) return { error: "customer.name is required" };
  if (name.length > 255) return { error: "customer.name is too long" };

  const taxRaw = typeof customer.tax_id === "string" ? customer.tax_id.replace(/\D/g, "") : "";
  if (customer.tax_id != null && customer.tax_id !== "" && !/^\d{13}$/.test(taxRaw)) {
    return { error: "customer.tax_id must be 13 digits" };
  }

  const branchRaw = typeof customer.branch_code === "string" ? customer.branch_code.trim() : "";
  if (branchRaw && !/^\d{5}$/.test(branchRaw)) {
    return { error: "customer.branch_code must be 5 digits, such as 00000" };
  }

  const address = typeof customer.address === "string" ? customer.address.trim() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim() : "";
  const contact = typeof customer.contact === "string" ? customer.contact.trim() : "";
  if (address.length > 1000) return { error: "customer.address is too long" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "customer.email is not a valid email" };

  if (!Array.isArray(body.items) || body.items.length === 0) return { error: "At least one item is required" };
  if (body.items.length > MAX_ITEMS) return { error: `A draft can include at most ${MAX_ITEMS} items` };

  const items: DraftInvoiceInput["items"] = [];
  for (let index = 0; index < body.items.length; index += 1) {
    const item = body.items[index];
    const label = `items[${index}]`;
    if (!isRecord(item)) return { error: `${label} must be an object` };
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!description) return { error: `${label}.description is required` };
    if (description.length > 500) return { error: `${label}.description is too long` };
    if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      return { error: `${label}.quantity must be a number greater than 0` };
    }
    if (typeof item.unit_price !== "number" || !Number.isFinite(item.unit_price) || item.unit_price < 0) {
      return { error: `${label}.unit_price must be a number greater than or equal to 0` };
    }
    const unit = typeof item.unit === "string" && item.unit.trim() ? item.unit.trim() : "ชิ้น";
    if (unit.length > 40) return { error: `${label}.unit is too long` };
    let discountPercent = 0;
    if (item.discount_percent != null) {
      const parsedDiscount = readMoney(item.discount_percent, `${label}.discount_percent`);
      if (typeof parsedDiscount === "string") return { error: parsedDiscount };
      if (parsedDiscount > 100) return { error: `${label}.discount_percent cannot exceed 100` };
      discountPercent = parsedDiscount;
    }
    items.push({
      description,
      quantity: item.quantity,
      unit,
      unit_price: item.unit_price,
      discount_percent: discountPercent,
      price_includes_vat: item.price_includes_vat == null ? true : Boolean(item.price_includes_vat),
    });
  }

  const discounts = body.discounts == null ? {} : body.discounts;
  if (!isRecord(discounts)) return { error: "discounts must be an object" };
  if (discounts.additional != null && discounts.additional !== 0) {
    return {
      error: "Shopee drafts use discounts.seller for the seller voucher. Shopee voucher, coin, and payment discounts stay off the VAT base.",
    };
  }

  const seller = readMoney(discounts.seller, "discounts.seller");
  const voucher = readMoney(discounts.shopee_voucher, "discounts.shopee_voucher");
  const coin = readMoney(discounts.shopee_coin, "discounts.shopee_coin");
  const payment = readMoney(discounts.payment_method, "discounts.payment_method");
  if (typeof seller === "string") return { error: seller };
  if (typeof voucher === "string") return { error: voucher };
  if (typeof coin === "string") return { error: coin };
  if (typeof payment === "string") return { error: payment };

  const orderNumber = typeof body.shopee_order_number === "string" ? body.shopee_order_number.trim() : "";
  if (!orderNumber) return { error: "shopee_order_number is required" };
  if (orderNumber.length > 100 || /[\r\n]/.test(orderNumber)) {
    return { error: "shopee_order_number must be a single line of at most 100 characters" };
  }

  let vatRate = 7;
  if (body.vat_rate != null) {
    if (typeof body.vat_rate !== "number" || !Number.isFinite(body.vat_rate) || body.vat_rate <= 0 || body.vat_rate > 100) {
      return { error: "vat_rate must be a number greater than 0 and at most 100" };
    }
    vatRate = body.vat_rate;
  }

  let withholding = 0;
  if (body.withholding_tax_rate != null) {
    const parsedWithholding = readMoney(body.withholding_tax_rate, "withholding_tax_rate");
    if (typeof parsedWithholding === "string") return { error: parsedWithholding };
    if (parsedWithholding > 100) return { error: "withholding_tax_rate cannot exceed 100" };
    withholding = parsedWithholding;
  }

  const notes = typeof body.notes === "string" ? body.notes : "";
  if (notes.length > 2000) return { error: "notes is too long" };

  const form = blankDraftInvoiceForm(issueDate, dueDate);
  form.customer_name = name;
  form.customer_address = address;
  form.customer_tax_id = taxRaw;
  form.customer_branch_code = branchRaw || "00000";
  form.customer_phone = phone;
  form.customer_email = email;
  form.customer_contact = contact;
  form.items = items;
  form.vat_rate = vatRate;
  form.withholding_tax_rate = withholding;
  form.discount1_type = "fixed";
  form.discount1_value = seller;
  form.discount_type = "fixed";
  form.discount_value = seller;
  form.sales_channel = "shopee";
  form.platform_discount_amount = voucher;
  form.shopee_coin_discount_amount = coin;
  form.payment_method_discount_amount = payment;
  form.notes = notes;
  form.terms_conditions = orderNumber;
  return { form };
}

function readDates(body: Record<string, unknown> | null, now: Date, dueDays: number): { error: string } | { issueDate: string; dueDate: string } {
  const issueDate = typeof body?.issue_date === "string" && body.issue_date
    ? body.issue_date
    : getLocalDateString(now);
  if (!isIsoDate(issueDate)) return { error: "issue_date must be YYYY-MM-DD" } as const;

  if (body?.due_date != null && body.due_date !== "") {
    if (typeof body.due_date !== "string" || !isIsoDate(body.due_date)) {
      return { error: "due_date must be YYYY-MM-DD" } as const;
    }
    return { issueDate, dueDate: body.due_date } as const;
  }
  return { issueDate, dueDate: defaultDueDate(issueDate, dueDays) } as const;
}

async function findExistingOrder(supabase: InvoiceDb, companyId: string, orderNumber: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, subtotal, vat_amount, total_amount, amount_before_vat, discount_amount, discount1_amount, discount2_amount, platform_discount_amount, shopee_coin_discount_amount, payment_method_discount_amount")
    .eq("company_id", companyId)
    .eq("terms_conditions", orderNumber)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function createBotDraftInvoice(
  request: { authorization: string | null; body: unknown },
  deps: BotDraftDependencies,
): Promise<BotDraftResult> {
  if (!isAuthorizedBearer(request.authorization, deps.env.AUTOBILL_BOT_API_KEY)) {
    return jsonError(401, "Unauthorized");
  }

  const companyId = deps.env.AUTOBILL_BOT_COMPANY_ID?.trim() || "";
  if (!companyId) return jsonError(403, "Bot is not bound to a company");

  try {
    const { data: company, error: companyError } = await deps.supabase
      .from("company_settings")
      .select("id, iv_prefix, iv_due_days, vat_registered, vat_verification_status")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) {
      console.error("Bot draft company lookup failed");
      return jsonError(500, "Could not load the bound company");
    }
    if (!company || company.id !== companyId) return jsonError(403, "Bound company was not found");
    if (company.vat_registered !== true || company.vat_verification_status !== "verified") {
      return jsonError(403, "Company is not VAT-verified");
    }

    let record: Record<string, unknown> | null = null;
    if (typeof request.body === "string") {
      record = { shopee_order_text: request.body };
    } else if (isRecord(request.body)) {
      record = request.body;
    } else {
      return jsonError(400, "Send Shopee order text or a JSON object");
    }

    if (record.status != null && record.status !== "draft") {
      return jsonError(400, "Only draft invoices can be created");
    }

    const dates = readDates(record, deps.now ?? new Date(), Number(company.iv_due_days ?? 0));
    if ("error" in dates) return jsonError(400, dates.error);

    const shopeeText = typeof record.shopee_order_text === "string"
      ? record.shopee_order_text
      : typeof record.order_text === "string"
        ? record.order_text
        : null;
    const hasStructured = ["customer", "items", "discounts", "shopee_order_number", "notes", "vat_rate", "withholding_tax_rate"]
      .some((key) => record?.[key] != null);

    let parsed: { form: DraftInvoiceInput } | { error: string };
    if (shopeeText != null && hasStructured) {
      return jsonError(400, "Send either Shopee order text or structured fields, not both");
    } else if (shopeeText != null) {
      parsed = formFromShopeeText(shopeeText, dates.issueDate, dates.dueDate);
    } else if (hasStructured) {
      parsed = formFromStructured(record, dates.issueDate, dates.dueDate);
    } else {
      return jsonError(400, "Send shopee_order_text or customer, items, and shopee_order_number");
    }
    if ("error" in parsed) return jsonError(400, parsed.error);

    const orderNumber = parsed.form.terms_conditions;
    const existing = await findExistingOrder(deps.supabase, companyId, orderNumber);
    if (existing) {
      const status = String(existing.status || "draft");
      return {
        status: 200,
        body: {
          id: existing.id,
          invoice_number: existing.invoice_number,
          status,
          duplicate: true,
          totals: presentStoredTotals(existing),
          url: invoicePageUrl(deps, existing.id, status),
        },
      };
    }

    const customerResult = await findOrCreateCustomerRecord(deps.supabase, companyId, {
      customer_type: "company",
      name: parsed.form.customer_name,
      tax_id: parsed.form.customer_tax_id || undefined,
      branch_code: parsed.form.customer_branch_code || "00000",
      address: parsed.form.customer_address || undefined,
      contact_name: parsed.form.customer_contact || undefined,
      phone: parsed.form.customer_phone || undefined,
      email: parsed.form.customer_email || undefined,
    });
    if (!customerResult) return jsonError(400, "customer.name is required");

    let invoice;
    try {
      invoice = await insertDraftInvoice(deps.supabase, {
        companyId,
        prefix: company.iv_prefix || "IV",
        data: parsed.form,
        delay: deps.delay,
      });
    } catch (error) {
      if (error instanceof InvoiceItemsInsertError) {
        await deps.supabase.from("invoices").delete().eq("id", error.invoiceId).eq("company_id", companyId);
      }
      throw error;
    }

    return {
      status: 200,
      body: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: "draft",
        duplicate: false,
        totals: presentInvoiceTotals(parsed.form),
        url: invoicePageUrl(deps, invoice.id, "draft"),
      },
    };
  } catch (error) {
    console.error("Bot draft invoice failed", error instanceof Error ? error.message : "unknown error");
    return jsonError(500, "Could not create draft invoice");
  }
}
