import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { getDatabase } from '@/lib/db/client'

export const runtime = 'nodejs'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard.response) return guard.response
  const drafts = getDatabase().prepare(`
    SELECT i.id, i.invoice_number AS invoiceNumber, i.invoice_date AS invoiceDate,
      i.updated_at AS updatedAt, i.grand_total_minor AS grandTotalMinor,
      c.id AS customerId, c.name AS customerName, c.code AS customerCode
    FROM invoices i JOIN customers c ON c.id = i.customer_id
    WHERE i.status = 'DRAFT'
    ORDER BY i.updated_at DESC LIMIT 20
  `).all()
  return NextResponse.json({ drafts })
}
