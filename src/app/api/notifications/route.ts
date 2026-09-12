import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'

export const runtime='nodejs'

export async function GET(){
 const rows=getDatabase().prepare(`SELECT n.id,n.channel,n.recipient,n.status,n.attempts,n.last_error,n.created_at,n.updated_at,i.invoice_number FROM notifications n JOIN invoices i ON i.id=n.invoice_id ORDER BY n.created_at DESC LIMIT 100`).all()
 return NextResponse.json({notifications:rows})
}
