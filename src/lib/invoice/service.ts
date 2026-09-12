import { randomUUID } from 'node:crypto'
import { getDatabase } from '@/lib/db/client'

export type CreateInvoiceInput = {
  customerId: string
  items: Array<{ productId: string; quantity: string | number; rateMinor?: number }>
  discountMinor?: number
  freightMinor?: number
  otherChargesMinor?: number
  gstMode?: 'INTRA' | 'INTER'
  notes?: string
}

function now() {
  return new Date().toISOString()
}

function moneyRound(value: number) {
  return Math.round(value)
}

function nextInvoiceNumber(db: ReturnType<typeof getDatabase>) {
  const year = new Date().getFullYear()
  const key = `invoice_sequence_${year}`
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined
  const next = Number(row?.value ?? '0') + 1
  db.prepare(`INSERT INTO app_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, String(next))
  return `AFP/${year}/${String(next).padStart(4, '0')}`
}

export function createInvoice(input: CreateInvoiceInput) {
  const db = getDatabase()
  const transaction = db.transaction(() => {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND is_active = 1').get(input.customerId) as Record<string, unknown> | undefined
    if (!customer) throw new Error('Customer not found or inactive.')
    if (!input.items?.length) throw new Error('Add at least one product.')

    const productStmt = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
    const resolved = input.items.map((line) => {
      const product = productStmt.get(line.productId) as Record<string, unknown> | undefined
      if (!product) throw new Error(`Product ${line.productId} was not found or is inactive.`)
      const quantity = Number(line.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Invalid quantity for ${product.name}.`)
      const rateMinor = Number.isInteger(line.rateMinor) && Number(line.rateMinor) >= 0 ? Number(line.rateMinor) : Number(product.default_rate_minor)
      const gstRateBps = Number(product.gst_rate_bps) || 0
      const taxableMinor = moneyRound(quantity * rateMinor)
      const taxMinor = moneyRound(taxableMinor * gstRateBps / 10000)
      return { product, quantity, rateMinor, gstRateBps, taxableMinor, taxMinor }
    })

    const subtotalMinor = resolved.reduce((sum, line) => sum + line.taxableMinor, 0)
    const discountMinor = Math.max(0, Math.min(subtotalMinor, Number(input.discountMinor) || 0))
    const freightMinor = Math.max(0, Number(input.freightMinor) || 0)
    const otherChargesMinor = Math.max(0, Number(input.otherChargesMinor) || 0)
    const taxableValueMinor = Math.max(0, subtotalMinor - discountMinor + freightMinor + otherChargesMinor)
    const taxBeforeSplit = resolved.reduce((sum, line) => sum + line.taxMinor, 0)
    const ratio = subtotalMinor > 0 ? taxableValueMinor / subtotalMinor : 0
    const taxMinor = moneyRound(taxBeforeSplit * ratio)
    const cgstMinor = input.gstMode === 'INTER' ? 0 : Math.floor(taxMinor / 2)
    const sgstMinor = input.gstMode === 'INTER' ? 0 : taxMinor - cgstMinor
    const igstMinor = input.gstMode === 'INTER' ? taxMinor : 0
    const grandTotalMinor = taxableValueMinor + taxMinor
    const id = randomUUID()
    const invoiceNumber = nextInvoiceNumber(db)
    const timestamp = now()

    db.prepare(`INSERT INTO invoices
      (id, invoice_number, customer_id, invoice_date, status, subtotal_minor, discount_minor, freight_minor, other_charges_minor, taxable_value_minor, cgst_minor, sgst_minor, igst_minor, grand_total_minor, notes, created_at, updated_at, finalized_at)
      VALUES (?, ?, ?, ?, 'FINALIZED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, invoiceNumber, input.customerId, timestamp.slice(0, 10), subtotalMinor, discountMinor, freightMinor, otherChargesMinor, taxableValueMinor, cgstMinor, sgstMinor, igstMinor, grandTotalMinor, input.notes ?? null, timestamp, timestamp, timestamp)

    const itemStmt = db.prepare(`INSERT INTO invoice_items
      (id, invoice_id, product_id, product_code, product_name, hsn_code, pack_size, unit, quantity, rate_minor, gst_rate_bps, taxable_minor, cgst_minor, sgst_minor, igst_minor, line_total_minor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    resolved.forEach((line) => {
      const p = line.product
      const lineTax = moneyRound(line.taxMinor * ratio)
      const lineCgst = input.gstMode === 'INTER' ? 0 : Math.floor(lineTax / 2)
      const lineSgst = input.gstMode === 'INTER' ? 0 : lineTax - lineCgst
      const lineIgst = input.gstMode === 'INTER' ? lineTax : 0
      itemStmt.run(randomUUID(), id, p.id, p.code, p.name, p.hsn_code ?? null, p.pack_size ?? null, p.unit, String(line.quantity), line.rateMinor, line.gstRateBps, line.taxableMinor, lineCgst, lineSgst, lineIgst, line.taxableMinor + lineTax)
    })

    db.prepare(`INSERT INTO audit_logs(id, actor, action, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), 'LOCAL_STAFF', 'INVOICE_FINALIZED', 'invoice', id, JSON.stringify({ invoiceNumber, customerId: input.customerId }), timestamp)

    return { id, invoiceNumber, grandTotalMinor, taxableValueMinor }
  })
  return transaction()
}
