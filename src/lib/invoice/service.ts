import { randomUUID } from 'node:crypto'
import { getDatabase } from '@/lib/db/client'

export type InvoiceLineInput = { productId: string; quantity: string | number; rateMinor?: number }
export type CreateInvoiceInput = {
  customerId: string
  items: InvoiceLineInput[]
  discountMinor?: number
  freightMinor?: number
  otherChargesMinor?: number
  gstMode?: 'INTRA' | 'INTER'
  notes?: string
}

type DraftInput = CreateInvoiceInput & { id?: string }

type ResolvedLine = {
  product: Record<string, unknown>
  productId: string
  quantity: number
  rateMinor: number
  gstRateBps: number
  taxableMinor: number
}

function now() { return new Date().toISOString() }
function moneyRound(value: number) { return Math.round(value) }

function allocateByWeight(amountMinor: number, weights: number[]) {
  if (amountMinor === 0 || weights.length === 0) return weights.map(() => 0)
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  if (totalWeight <= 0) return weights.map(() => 0)
  const allocations = weights.map((weight) => moneyRound(amountMinor * weight / totalWeight))
  allocations[allocations.length - 1] += amountMinor - allocations.reduce((sum, value) => sum + value, 0)
  return allocations
}

function resolveProducts(db: ReturnType<typeof getDatabase>, items: InvoiceLineInput[]) {
  if (!items?.length) throw new Error('Add at least one product.')
  const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
  return items.map((line) => {
    const product = stmt.get(line.productId) as Record<string, unknown> | undefined
    if (!product) throw new Error(`Product ${line.productId} was not found or is inactive.`)
    const quantity = Number(line.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Invalid quantity for ${product.name}.`)
    const rateMinor = Number.isInteger(line.rateMinor) && Number(line.rateMinor) >= 0 ? Number(line.rateMinor) : Number(product.default_rate_minor)
    const gstRateBps = Number(product.gst_rate_bps) || 0
    return { product, productId: String(product.id), quantity, rateMinor, gstRateBps, taxableMinor: moneyRound(quantity * rateMinor) } satisfies ResolvedLine
  })
}

function calculate(lines: ResolvedLine[], input: Pick<CreateInvoiceInput, 'discountMinor' | 'freightMinor' | 'otherChargesMinor' | 'gstMode'>) {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.taxableMinor, 0)
  const discountMinor = Math.max(0, Math.min(subtotalMinor, Number(input.discountMinor) || 0))
  const freightMinor = Math.max(0, Number(input.freightMinor) || 0)
  const otherChargesMinor = Math.max(0, Number(input.otherChargesMinor) || 0)
  const weights = lines.map((line) => line.taxableMinor)
  const discounts = allocateByWeight(discountMinor, weights)
  const charges = allocateByWeight(freightMinor + otherChargesMinor, weights)
  const calculated = lines.map((line, index) => {
    const taxableMinor = Math.max(0, line.taxableMinor - discounts[index] + charges[index])
    const taxMinor = moneyRound(taxableMinor * line.gstRateBps / 10000)
    const cgstMinor = input.gstMode === 'INTER' ? 0 : Math.floor(taxMinor / 2)
    const sgstMinor = input.gstMode === 'INTER' ? 0 : taxMinor - cgstMinor
    const igstMinor = input.gstMode === 'INTER' ? taxMinor : 0
    return { ...line, taxableMinor, cgstMinor, sgstMinor, igstMinor, lineTotalMinor: taxableMinor + taxMinor }
  })
  return {
    lines: calculated,
    subtotalMinor,
    discountMinor,
    freightMinor,
    otherChargesMinor,
    taxableValueMinor: calculated.reduce((sum, line) => sum + line.taxableMinor, 0),
    cgstMinor: calculated.reduce((sum, line) => sum + line.cgstMinor, 0),
    sgstMinor: calculated.reduce((sum, line) => sum + line.sgstMinor, 0),
    igstMinor: calculated.reduce((sum, line) => sum + line.igstMinor, 0),
  }
}

function nextInvoiceNumber(db: ReturnType<typeof getDatabase>) {
  const year = new Date().getFullYear()
  const key = `invoice_sequence_${year}`
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined
  const next = Number(row?.value ?? '0') + 1
  db.prepare('INSERT INTO app_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(next))
  return `AFP/${year}/${String(next).padStart(4, '0')}`
}

function assertCustomer(db: ReturnType<typeof getDatabase>, customerId: string) {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND is_active = 1').get(customerId) as Record<string, unknown> | undefined
  if (!customer) throw new Error('Customer not found or inactive.')
  return customer
}

function insertItems(db: ReturnType<typeof getDatabase>, invoiceId: string, lines: ReturnType<typeof calculate>['lines']) {
  const stmt = db.prepare(`INSERT INTO invoice_items
    (id, invoice_id, product_id, product_code, product_name, hsn_code, pack_size, unit, quantity, rate_minor, gst_rate_bps, taxable_minor, cgst_minor, sgst_minor, igst_minor, line_total_minor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  lines.forEach((line) => {
    const p = line.product
    stmt.run(randomUUID(), invoiceId, line.productId, p.code, p.name, p.hsn_code ?? null, p.pack_size ?? null, p.unit,
      String(line.quantity), line.rateMinor, line.gstRateBps, line.taxableMinor, line.cgstMinor, line.sgstMinor, line.igstMinor, line.lineTotalMinor)
  })
}

export function createDraft(input: DraftInput) {
  const db = getDatabase()
  const transaction = db.transaction(() => {
    assertCustomer(db, input.customerId)
    const resolved = resolveProducts(db, input.items)
    const totals = calculate(resolved, input)
    const id = input.id || randomUUID()
    const existing = db.prepare('SELECT id,status FROM invoices WHERE id = ?').get(id) as { id: string; status: string } | undefined
    if (existing && existing.status !== 'DRAFT') throw new Error('Only an existing draft can be autosaved.')
    const timestamp = now()
    const draftNumber = existing ? undefined : `DRAFT-${id.slice(0, 8).toUpperCase()}`
    if (!existing) {
      db.prepare(`INSERT INTO invoices(id,invoice_number,customer_id,invoice_date,status,subtotal_minor,discount_minor,freight_minor,other_charges_minor,taxable_value_minor,cgst_minor,sgst_minor,igst_minor,grand_total_minor,notes,created_at,updated_at)
        VALUES(?,?,?,?, 'DRAFT',?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, draftNumber, input.customerId, timestamp.slice(0,10), totals.subtotalMinor, totals.discountMinor, totals.freightMinor, totals.otherChargesMinor, totals.taxableValueMinor, totals.cgstMinor, totals.sgstMinor, totals.igstMinor, totals.taxableValueMinor + totals.cgstMinor + totals.sgstMinor + totals.igstMinor, input.notes ?? null, timestamp, timestamp)
    } else {
      db.prepare(`UPDATE invoices SET customer_id=?,invoice_date=?,subtotal_minor=?,discount_minor=?,freight_minor=?,other_charges_minor=?,taxable_value_minor=?,cgst_minor=?,sgst_minor=?,igst_minor=?,grand_total_minor=?,notes=?,updated_at=? WHERE id=? AND status='DRAFT'`)
        .run(input.customerId, timestamp.slice(0,10), totals.subtotalMinor, totals.discountMinor, totals.freightMinor, totals.otherChargesMinor, totals.taxableValueMinor, totals.cgstMinor, totals.sgstMinor, totals.igstMinor, totals.taxableValueMinor + totals.cgstMinor + totals.sgstMinor + totals.igstMinor, input.notes ?? null, timestamp, id)
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)
    }
    insertItems(db, id, totals.lines)
    db.prepare(`INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)`)
      .run(randomUUID(), 'LOCAL_STAFF', existing ? 'INVOICE_DRAFT_AUTOSAVED' : 'INVOICE_DRAFT_CREATED', 'invoice', id, JSON.stringify({ customerId: input.customerId, itemCount: input.items.length }), timestamp)
    return { id, invoiceNumber: draftNumber ?? (db.prepare('SELECT invoice_number FROM invoices WHERE id=?').get(id) as {invoice_number:string}).invoice_number, status: 'DRAFT', grandTotalMinor: totals.taxableValueMinor + totals.cgstMinor + totals.sgstMinor + totals.igstMinor }
  })
  return transaction()
}

export function finalizeDraft(id: string, gstMode: 'INTRA' | 'INTER' = 'INTRA') {
  const db = getDatabase()
  const transaction = db.transaction(() => {
    const draft = db.prepare('SELECT * FROM invoices WHERE id = ? AND status = \'DRAFT\'').get(id) as Record<string, unknown> | undefined
    if (!draft) throw new Error('Draft invoice not found.')
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid').all(id) as Array<Record<string, unknown>>
    if (!items.length) throw new Error('Add at least one product before finalizing.')
    const resolved: ResolvedLine[] = items.map((item) => ({ product: { id: item.product_id, code: item.product_code, name: item.product_name, hsn_code: item.hsn_code, pack_size: item.pack_size, unit: item.unit, gst_rate_bps: item.gst_rate_bps }, productId: String(item.product_id ?? ''), quantity: Number(item.quantity), rateMinor: Number(item.rate_minor), gstRateBps: Number(item.gst_rate_bps), taxableMinor: moneyRound(Number(item.quantity) * Number(item.rate_minor)) }))
    const totals = calculate(resolved, { discountMinor: Number(draft.discount_minor), freightMinor: Number(draft.freight_minor), otherChargesMinor: Number(draft.other_charges_minor), gstMode })
    const invoiceNumber = nextInvoiceNumber(db)
    const timestamp = now()
    db.prepare(`UPDATE invoices SET invoice_number=?,status='FINALIZED',subtotal_minor=?,discount_minor=?,freight_minor=?,other_charges_minor=?,taxable_value_minor=?,cgst_minor=?,sgst_minor=?,igst_minor=?,grand_total_minor=?,updated_at=?,finalized_at=? WHERE id=? AND status='DRAFT'`)
      .run(invoiceNumber, totals.subtotalMinor, totals.discountMinor, totals.freightMinor, totals.otherChargesMinor, totals.taxableValueMinor, totals.cgstMinor, totals.sgstMinor, totals.igstMinor, totals.taxableValueMinor + totals.cgstMinor + totals.sgstMinor + totals.igstMinor, timestamp, timestamp, id)
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)
    insertItems(db, id, totals.lines)
    db.prepare(`INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)`)
      .run(randomUUID(), 'LOCAL_STAFF', 'INVOICE_FINALIZED', 'invoice', id, JSON.stringify({ invoiceNumber, fromDraft: true }), timestamp)
    return { id, invoiceNumber, grandTotalMinor: totals.taxableValueMinor + totals.cgstMinor + totals.sgstMinor + totals.igstMinor, taxableValueMinor: totals.taxableValueMinor }
  })
  return transaction()
}

export function createInvoice(input: CreateInvoiceInput) {
  const db = getDatabase()
  const transaction = db.transaction(() => {
    assertCustomer(db, input.customerId)
    const resolved = resolveProducts(db, input.items)
    const totals = calculate(resolved, input)
    const id = randomUUID(); const invoiceNumber = nextInvoiceNumber(db); const timestamp = now()
    db.prepare(`INSERT INTO invoices(id,invoice_number,customer_id,invoice_date,status,subtotal_minor,discount_minor,freight_minor,other_charges_minor,taxable_value_minor,cgst_minor,sgst_minor,igst_minor,grand_total_minor,notes,created_at,updated_at,finalized_at)
      VALUES(?,?,?,?, 'FINALIZED',?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, invoiceNumber, input.customerId, timestamp.slice(0,10), totals.subtotalMinor, totals.discountMinor, totals.freightMinor, totals.otherChargesMinor, totals.taxableValueMinor, totals.cgstMinor, totals.sgstMinor, totals.igstMinor, totals.taxableValueMinor + totals.cgstMinor + totals.sgstMinor + totals.igstMinor, input.notes ?? null, timestamp, timestamp, timestamp)
    insertItems(db, id, totals.lines)
    db.prepare(`INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)`).run(randomUUID(),'LOCAL_STAFF','INVOICE_FINALIZED','invoice',id,JSON.stringify({invoiceNumber,customerId:input.customerId}),timestamp)
    return { id, invoiceNumber, grandTotalMinor: totals.taxableValueMinor + totals.cgstMinor + totals.sgstMinor + totals.igstMinor, taxableValueMinor: totals.taxableValueMinor }
  })
  return transaction()
}
