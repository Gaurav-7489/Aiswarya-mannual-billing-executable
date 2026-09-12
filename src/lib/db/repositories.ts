import { getDatabase } from './client'

export type Customer = {
  id: string
  code: string
  name: string
  phone: string | null
  email: string | null
  gstin: string | null
  billingAddress: string | null
  shippingAddress: string | null
  state: string | null
  city: string | null
}

export type Product = {
  id: string
  code: string
  name: string
  hsn: string | null
  packSize: string | null
  unit: string
  rateMinor: number
  gstRateBps: number
  active: boolean
}

export function searchCustomers(term = ''): Customer[] {
  const q = `%${term.trim()}%`
  return getDatabase().prepare(`
    SELECT id, code, name, phone, email, gstin,
      billing_address AS billingAddress,
      shipping_address AS shippingAddress, state, city
    FROM customers
    WHERE is_active = 1 AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR gstin LIKE ? OR city LIKE ?)
    ORDER BY name COLLATE NOCASE LIMIT 50
  `).all(q, q, q, q, q) as Customer[]
}

export function searchProducts(term = ''): Product[] {
  const q = `%${term.trim()}%`
  const rows = getDatabase().prepare(`
    SELECT id, code, name, hsn_code AS hsn, pack_size AS packSize, unit,
      default_rate_minor AS rateMinor, gst_rate_bps AS gstRateBps, is_active AS active
    FROM products
    WHERE is_active = 1 AND (name LIKE ? OR code LIKE ? OR hsn_code LIKE ?)
    ORDER BY name COLLATE NOCASE LIMIT 100
  `).all(q, q, q) as Array<Product & { active: number }>
  return rows.map((row) => ({ ...row, active: Boolean(row.active) }))
}

export function getCustomer(id: string): Customer | undefined {
  return getDatabase().prepare(`
    SELECT id, code, name, phone, email, gstin,
      billing_address AS billingAddress,
      shipping_address AS shippingAddress, state, city
    FROM customers WHERE id = ? AND is_active = 1
  `).get(id) as Customer | undefined
}

export function getProduct(id: string): Product | undefined {
  const row = getDatabase().prepare(`
    SELECT id, code, name, hsn_code AS hsn, pack_size AS packSize, unit,
      default_rate_minor AS rateMinor, gst_rate_bps AS gstRateBps, is_active AS active
    FROM products WHERE id = ?
  `).get(id) as (Product & { active: number }) | undefined
  return row ? { ...row, active: Boolean(row.active) } : undefined
}
