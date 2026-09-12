import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const term = (params.get('q') ?? '').trim()
  const q = `%${term}%`
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') ?? 50)))
  const invoices = getDatabase().prepare(`
    SELECT i.id, i.invoice_number AS invoiceNumber, i.invoice_date AS invoiceDate,
      i.status, i.subtotal_minor AS subtotalMinor, i.taxable_value_minor AS taxableValueMinor,
      i.cgst_minor AS cgstMinor, i.sgst_minor AS sgstMinor, i.igst_minor AS igstMinor,
      i.grand_total_minor AS grandTotalMinor, c.name AS customerName, c.code AS customerCode
    FROM invoices i JOIN customers c ON c.id = i.customer_id
    WHERE (? = '' OR i.invoice_number LIKE ? OR c.name LIKE ? OR c.code LIKE ?)
    ORDER BY i.invoice_date DESC, i.created_at DESC LIMIT ?
  `).all(term, q, q, q, limit)
  return NextResponse.json({ invoices })
}
