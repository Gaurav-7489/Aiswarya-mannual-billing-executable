import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const db = getDatabase()
  const invoice = db.prepare(`
    SELECT i.*, c.name AS customer_name, c.code AS customer_code, c.phone AS customer_phone,
      c.email AS customer_email, c.gstin AS customer_gstin, c.billing_address AS billing_address,
      c.shipping_address AS shipping_address, c.city AS customer_city, c.state AS customer_state,
      c.pincode AS customer_pincode
    FROM invoices i JOIN customers c ON c.id = i.customer_id
    WHERE i.id = ?
  `).get(id) as Record<string, unknown> | undefined
  if (!invoice) return NextResponse.json({ ok: false, error: 'Invoice not found.' }, { status: 404 })
  const items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid`).all(id)
  return NextResponse.json({ ok: true, invoice, items })
}
