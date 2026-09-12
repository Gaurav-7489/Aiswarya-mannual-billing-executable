import { getDatabase } from './client'

export type Customer = {
  id: number
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
  id: number
  code: string
  name: string
  hsn: string | null
  packSize: string | null
  unit: string
  rate: number
  gstRate: number
  active: boolean
}

export function searchCustomers(term = ''): Customer[] {
  const q = `%${term.trim()}%`
  return getDatabase().prepare(`
    SELECT id, code, name, phone, email, gstin,
      billing_address AS billingAddress,
      shipping_address AS shippingAddress, state, city
    FROM customers
    WHERE active = 1 AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR gstin LIKE ? OR city LIKE ?)
    ORDER BY name COLLATE NOCASE LIMIT 50
  `).all(q, q, q, q, q) as Customer[]
}

export function searchProducts(term = ''): Product[] {
  const q = `%${term.trim()}%`
  return getDatabase().prepare(`
    SELECT id, code, name, hsn, pack_size AS packSize, unit,
      rate, gst_rate AS gstRate, active
    FROM products
    WHERE active = 1 AND (name LIKE ? OR code LIKE ? OR hsn LIKE ?)
    ORDER BY name COLLATE NOCASE LIMIT 100
  `).all(q, q, q) as Product[]
}

export function getCustomer(id: number): Customer | undefined {
  return getDatabase().prepare(`
    SELECT id, code, name, phone, email, gstin,
      billing_address AS billingAddress,
      shipping_address AS shippingAddress, state, city
    FROM customers WHERE id = ? AND active = 1
  `).get(id) as Customer | undefined
}

export function getProduct(id: number): Product | undefined {
  return getDatabase().prepare(`
    SELECT id, code, name, hsn, pack_size AS packSize, unit,
      rate, gst_rate AS gstRate, active
    FROM products WHERE id = ?
  `).get(id) as Product | undefined
}
