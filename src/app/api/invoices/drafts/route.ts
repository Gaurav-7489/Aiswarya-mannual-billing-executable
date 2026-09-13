import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { select } from '@/lib/db/client'
export const runtime='nodejs'
export async function GET(){const guard=await requireApiAuth();if(guard.response)return guard.response;const rows=await select<any>('invoices',`select=id,invoice_number,invoice_date,updated_at,grand_total_minor,customers(id,name,code)&status=eq.DRAFT&order=updated_at.desc&limit=20`);const drafts=rows.map(i=>({id:i.id,invoiceNumber:i.invoice_number,invoiceDate:i.invoice_date,updatedAt:i.updated_at,grandTotalMinor:Number(i.grand_total_minor),customerId:i.customers?.id,customerName:i.customers?.name,customerCode:i.customers?.code}));return NextResponse.json({drafts})}
