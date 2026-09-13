# Aiswarya Billing

Production billing and sales management software for Aiswarya Food Products.

## Production architecture

- Next.js + React + TypeScript
- Supabase PostgreSQL as the cloud source of truth
- Server-only Supabase secret key; never ship it to the browser
- Row Level Security enabled on every application table
- PIN-based application session with server-side scrypt PIN hashes
- Invoice, customer, product, notification, settings and audit data stored in PostgreSQL
- Browser recovery for in-progress invoice drafts
- Safe offline mode: existing draft work can remain on the operator's computer; finalized invoices require a live connection so the financial record is never silently forked
- Automatic notification queue for email and WhatsApp recipients
- Premium, high-contrast UI designed for older operators
- Desktop executable packaging planned through a native shell after the web build is verified

## Supabase setup

Create `.env.local` from `.env.example` and provide the server-only `SUPABASE_SECRET_KEY` from the Supabase project settings. Do not prefix that secret with `NEXT_PUBLIC_`, do not commit it, and never put it inside the desktop bundle.

The production project is in the `ap-south-1` region. Database schema migrations are stored in Supabase rather than the repository's old SQLite schema.

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
7. Offline recovery never pretends that an invoice has been committed to the cloud when it has not.
8. Notification failures do not block successful invoice creation.
9. Customer and product workflows prioritize large controls, clear labels, keyboard support, and minimal steps.

## Company defaults

- WhatsApp: 9846195439
- Email: thisisajay2001@gmail.com
- Website: https://aiswaryafoodproducts.com/
