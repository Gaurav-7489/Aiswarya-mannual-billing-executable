import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { select } from '@/lib/db/client'
export const runtime='nodejs'
export async function GET(){const guard=await requireApiAuth();if(guard.response)return guard.response;const rows=await select<any>('notifications',`select=id,channel,recipient,status,attempts,last_error,created_at,updated_at,invoices(invoice_number)&order=created_at.desc&limit=100`);return NextResponse.json({notifications:rows.map(n=>({...n,invoice_number:n.invoices?.invoice_number??null}))})}
