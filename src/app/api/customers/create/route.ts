import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })

    const db = getDatabase()
    const id = crypto.randomUUID()
    const code = String(body.code ?? `CUST-${Date.now().toString().slice(-6)}`).trim().toUpperCase()

    db.prepare(`
      INSERT INTO customers (id, code, name, phone, email, gstin, billing_address, shipping_address, state, state_code, city, pincode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, name, body.phone?.trim() || null, body.email?.trim() || null, body.gstin?.trim().toUpperCase() || null,
      body.billingAddress?.trim() || null, body.shippingAddress?.trim() || null, body.state?.trim() || null,
      body.stateCode?.trim() || null, body.city?.trim() || null, body.pincode?.trim() || null)

    db.prepare(`INSERT INTO audit_logs (id, action, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, ?, ?)`)
      .run(crypto.randomUUID(), 'CREATE', 'CUSTOMER', id, JSON.stringify({ code, name }))

    return NextResponse.json({ customer: db.prepare(`SELECT id, code, name, phone, email, gstin, billing_address AS billingAddress, shipping_address AS shippingAddress, state, state_code AS stateCode, city, pincode FROM customers WHERE id = ?`).get(id) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create customer'
    return NextResponse.json({ error: message.includes('UNIQUE') ? 'Customer code already exists' : message }, { status: 400 })
  }
}
