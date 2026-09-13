# Aiswarya Billing

Production billing and sales management software for Aiswarya Food Products.

## Production architecture

- Next.js + React + TypeScript
- Supabase PostgreSQL as the cloud source of truth
- Server-only Supabase secret key; never ship it to the browser
- Row Level Security enabled on every application table
- PIN-based application session with server-side scrypt PIN hashes
- Invoice, customer, product, notification, settings and audit data stored in PostgreSQL
- Online-only billing: a live connection is required for customer/product lookup, draft persistence and invoice finalization
- Cloud drafts can be recovered when the operator reconnects; there is no offline invoice queue or fake local commit
- Product catalogue supports biscuit categories, quick product creation during billing and rate/GST editing
- Atomic invoice persistence and database-generated invoice numbering
- Dashboard summaries use a database aggregate RPC rather than loading thousands of rows into the browser/server process
- Notification queue for email and WhatsApp recipients
- Premium, high-contrast UI designed for older operators
- Print/PDF invoice layout and desktop executable packaging are part of the production finishing pass

## Business catalogue

The product model is tailored to Aiswarya Food Products' biscuit business: Biscuits, Fried Biscuits, Bakery Biscuits and Bakery Products. The supplied company material describes the Pazookkara, Thrissur facility and these three primary biscuit/product lines. fileciteturn205file0L13-L19 fileciteturn205file0L25-L35

## Supabase setup

Create `.env.local` from `.env.example` and provide the server-only `SUPABASE_SECRET_KEY` from the Supabase project settings. Do not prefix that secret with `NEXT_PUBLIC_`, do not commit it, and never put it inside the desktop bundle.

The production project is in the `ap-south-1` region. Schema migrations are tracked in `supabase/migrations/` and must also be applied to the production Supabase project.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Safety principles

1. Supabase PostgreSQL is authoritative for finalized financial records.
2. Finalized invoices are immutable financial records; cancellation is explicit and audited.
3. Invoice items keep product/rate/tax snapshots so historical invoices remain stable.
4. Invoice numbering is generated atomically in PostgreSQL.
5. Secret database credentials are server-only.
6. RLS is enabled and public API roles are denied access to application tables; the server performs application authorization before privileged database operations.
7. Billing stops when the live connection is unavailable; the application never claims an invoice was committed when it was not.
8. Notification failures do not block successful invoice creation.
9. Customer and product workflows prioritize large controls, clear labels, keyboard support, and minimal steps.

## Company defaults

- WhatsApp: 9846195439
- Email: thisisajay2001@gmail.com
- Website: https://aiswaryafoodproducts.com/
