# Bot draft invoices

`POST /api/invoices/drafts` creates a Shopee tax invoice draft for one company. The caller does not sign in and does not send a company id. The route is outside the browser session middleware.

The draft uses the same total, VAT, invoice-number, and customer matching code as the invoice screen. It is always saved as `draft`. It does not issue the invoice, send it, or count it against the document quota. A person opens the returned link, checks the draft, and issues it in the app.

## Vercel environment variables

Set these on the Vercel project (Production, and Preview if a bot should call preview deployments):

| Name | Value |
| --- | --- |
| `AUTOBILL_BOT_API_KEY` | A long random secret. The bot sends it as `Authorization: Bearer <key>`. |
| `AUTOBILL_BOT_COMPANY_ID` | `company_settings.id` of the shop that owns the drafts. Copy the uuid from the Supabase table editor. |

Generate a key:

```bash
openssl rand -base64 32
```

The route also needs the existing server-only `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`. Do not prefix the bot key or the service role key with `NEXT_PUBLIC_`. `NEXT_PUBLIC_APP_URL` is used for the absolute link in the response (for example `https://your-domain.example`).

The company id in the environment is the only company the bot can write. A `company_id` in the request is ignored. The company must already be VAT-registered and VAT-verified (`vat_registered = true` and `vat_verification_status = verified`). Otherwise the route returns 403.

Redeploy after changing the variables so the function picks them up.

## Request

`Authorization: Bearer <AUTOBILL_BOT_API_KEY>`

Send either raw Shopee order text or structured JSON. Do not send both.

### Shopee order text

`Content-Type: text/plain`, or JSON `{ "shopee_order_text": "..." }`.

Item prices in a Shopee paste already include VAT. The seller voucher is discount 1 and reduces the VAT base. The Shopee voucher, Shopee coins, and payment-method discount stay off the VAT base and only reduce what the buyer paid. The Shopee order number is stored in `terms_conditions`, and `sales_channel` is `shopee`.

```bash
curl -sS -X POST "$APP_URL/api/invoices/drafts" \
  -H "Authorization: Bearer $AUTOBILL_BOT_API_KEY" \
  -H "Content-Type: text/plain" \
  --data-binary @shopee-order.txt
```

### Structured JSON

Item `price_includes_vat` defaults to `true`. `status`, when sent, must be `draft`.

```bash
curl -sS -X POST "$APP_URL/api/invoices/drafts" \
  -H "Authorization: Bearer $AUTOBILL_BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "ลูกค้าทดสอบ",
      "tax_id": "0105555555555",
      "branch_code": "00000",
      "address": "99 ถนนทดสอบ กรุงเทพฯ"
    },
    "items": [
      { "description": "สินค้าเอ", "quantity": 1, "unit_price": 147 },
      { "description": "สินค้าบี", "quantity": 1, "unit_price": 199 }
    ],
    "discounts": {
      "seller": 0,
      "shopee_voucher": 87,
      "shopee_coin": 0,
      "payment_method": 0
    },
    "shopee_order_number": "261126SAMPLE01"
  }'
```

For those two VAT-inclusive prices and an 87 baht Shopee voucher, the document total is 346.00, VAT is 22.64, and the buyer paid 259.00.

Optional fields: `issue_date` and `due_date` (`YYYY-MM-DD`), `notes`, `vat_rate` (default 7), and `withholding_tax_rate` (default 0). `due_date` defaults from the company's invoice due-day setting.

## Response

`200` when a draft is created, and also `200` when a non-cancelled invoice for this company already has the same Shopee order number. A duplicate does not create a second invoice.

```json
{
  "id": "8d0c1c2e-0000-4000-8000-000000000001",
  "invoice_number": "IV-20261126-0001",
  "status": "draft",
  "duplicate": false,
  "totals": {
    "subtotal": 346,
    "vat": 22.64,
    "total": 346,
    "amount_before_vat": 323.36,
    "discounts": {
      "seller": 0,
      "additional": 0,
      "shopee_voucher": 87,
      "shopee_coin": 0,
      "payment_method": 0
    },
    "customer_payment": 259
  },
  "url": "https://your-domain.example/invoices/8d0c1c2e-0000-4000-8000-000000000001/edit"
}
```

On a duplicate, `duplicate` is `true`, `status` is the existing invoice's status, and `url` points at the edit page for a draft or the preview page otherwise.

Other responses:

| Status | When |
| --- | --- |
| 400 | The body is invalid, or `status` is anything other than `draft`. |
| 401 | The bearer token is missing or does not match `AUTOBILL_BOT_API_KEY`. |
| 403 | The bot company is unset, missing, or not VAT-verified. |
| 500 | The server cannot reach the database. The response does not include database details. |

Invoice numbers stay `PREFIX-YYYYMMDD-0001`, using the company's invoice prefix and the next number for that day. A unique conflict retries with the next number, same as the screen.
