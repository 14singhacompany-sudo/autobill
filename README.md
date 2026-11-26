# Autobill

Tax invoices, quotations, receipts, and billing invoices for Thai businesses. The web app signs in with Supabase and writes through row-level security.

## Bot draft invoices

An external bot can create a Shopee tax-invoice **draft** without a browser:

`POST /api/invoices/drafts`

The request uses `Authorization: Bearer <AUTOBILL_BOT_API_KEY>`. The company is `AUTOBILL_BOT_COMPANY_ID` (`company_settings.id`) and cannot be chosen in the request. The route only saves drafts. It does not issue, send, or count quota.

Generate a key with:

```bash
openssl rand -base64 32
```

Set both variables in the Vercel project, plus the existing server-only `SUPABASE_SERVICE_ROLE_KEY`. Full request and response examples: [docs/bot-draft-invoices.md](docs/bot-draft-invoices.md).

## Scripts

```bash
npm test
npm run build
```
