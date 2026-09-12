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

/**
 * Allocates an invoice-level amount across lines using their pre-allocation
 * taxable values. Rounding is corrected on the final line so the line totals
 * always reconcile exactly to the invoice-level amount.
 */
function allocateByWeight(amountMinor: number, weights: number[]) {
  if (amountMinor === 0 || weights.length === 0) return weights.map(() => 0)
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  if (totalWeight <= 0) return weights.map(() => 0)

  const allocations = weights.map((weight) => moneyRound(amountMinor * weight / totalWeight))
  const difference = amountMinor - allocations.reduce((sum, value) => sum + value, 0)
  allocations[allocations.length - 1] += difference
  return allocations
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
      return { product, quantity, rateMinor, gstRateBps, taxableMinor }
    })

    const subtotalMinor = resolved.reduce((sum, line) => sum + line.taxableMinor, 0)
    const discountMinor = Math.max(0, Math.min(subtotalMinor, Number(input.discountMinor) || 0))
    const freightMinor = Math.max(0, Number(input.freightMinor) || 0)
    const otherChargesMinor = Math.max(0, Number(input.otherChargesMinor) || 0)

    // Allocate the invoice discount and additional taxable charges to the
    // actual lines first. This keeps the item rows and invoice totals in sync.
    const weights = resolved.map((line) => line.taxableMinor)
    const discountAllocations = allocateByWeight(discountMinor, weights)
    const chargeTotalMinor = freightMinor + otherChargesMinor
    const chargeAllocations = allocateByWeight(chargeTotalMinor, weights)

    const lines = resolved.map((line, index) => {
      const lineTaxableMinor = Math.max(0, line.taxableMinor - discountAllocations[index] + chargeAllocations[index])
      const lineTaxMinor = moneyRound(lineTaxableMinor * line.gstRateBps / 10000)
      const lineCgstMinor = input.gstMode === 'INTER' ? 0 : Math.floor(lineTaxMinor / 2)
      const lineSgstMinor = input.gstMode === 'INTER' ? 0 : lineTaxMinor - lineCgstMinor
      const lineIgstMinor = input.gstMode === 'INTER' ? lineTaxMinor : 0
      return {
        ...line,
        taxableMinor: lineTaxableMinor,
        taxMinor: lineTaxMinor,
        cgstMinor: lineCgstMinor,
        sgstMinor: lineSgstMinor,
        igstMinor: lineIgstMinor,
        lineTotalMinor: lineTaxableMinor + lineTaxMinor,
      }
    })

    const taxableValueMinor = lines.reduce((sum, line) => sum + line.taxableMinor, 0)
    const cgstMinor = lines.reduce((sum, line) => sum + line.cgstMinor, 0)
    const sgstMinor = lines.reduce((sum, line) => sum + line.sgstMinor, 0)
    const igstMinor = lines.reduce((sum, line) => sum + line.igstMinor, 0)
    const taxMinor = cgstMinor + sgstMinor + igstMinor
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

    lines.forEach((line) => {
      const p = line.product
      itemStmt.run(
        randomUUID(),
        id,
        p.id,
        p.code,
        p.name,
        p.hsn_code ?? null,
        p.pack_size ?? null,
        p.unit,
        String(line.quantity),
        line.rateMinor,
        line.gstRateBps,
        line.taxableMinor,
        line.cgstMinor,
        line.sgstMinor,
        line.igstMinor,
        line.lineTotalMinor,
      )
    })

    db.prepare(`INSERT INTO audit_logs(id, actor, action, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), 'LOCAL_STAFF', 'INVOICE_FINALIZED', 'invoice', id, JSON.stringify({ invoiceNumber, customerId: input.customerId }), timestamp)

    return { id, invoiceNumber, grandTotalMinor, taxableValueMinor }
  })
  return transaction()
}
