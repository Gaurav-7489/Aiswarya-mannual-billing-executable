# Aiswarya Billing

Local-first billing and sales management software for Aiswarya Food Products.

## V1 architecture

- Next.js + React + TypeScript
- Local SQLite database
- Offline-first billing workflow
- Deterministic integer-minor-unit money calculations
- Local invoice history and audit trail
- Email and WhatsApp delivery queues when internet is available
- Desktop executable planned with a native shell
- No cloud database in V1

## Development principles

1. Billing data is authoritative and persisted locally.
2. Finalized invoices are immutable financial records; cancellation is explicit and audited.
3. Invoice items keep product/rate/tax snapshots so historical invoices remain stable.
4. Notifications never block successful invoice creation.
5. Customer and product workflows prioritize large controls, clear labels, keyboard support, and minimal steps.
6. Database access will remain behind a repository/data-access layer so a future cloud sync layer can be added without rewriting the billing domain.

## Current foundation

The repository currently contains the application shell, strict TypeScript configuration, local SQLite schema, and the first deterministic invoice calculation module. GST rules and the final invoice layout will be confirmed against the client's approved invoice before production release.
