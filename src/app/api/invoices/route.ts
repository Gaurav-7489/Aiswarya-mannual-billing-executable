import { NextResponse } from 'next/server'
import { createInvoice } from '@/lib/invoice/service'
import { queueInvoiceNotifications } from '@/lib/notifications/queue'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = createInvoice(body)
    queueInvoiceNotifications(result.id)
    return NextResponse.json({ ok: true, invoice: result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create invoice.'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
