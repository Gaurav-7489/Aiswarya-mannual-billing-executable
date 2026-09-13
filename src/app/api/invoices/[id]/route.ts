import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { selectOne, select } from '@/lib/db/client'
export const runtime='nodejs'
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){const guard=await requireApiAuth();if(guard.response)return guard.response;const{id}=await context.params;const invoice=await selectOne<any>('invoices',`select=*,customers(name,code,phone,email,gstin,billing_address,shipping_address,city,state,pincode)&id=eq.${encodeURIComponent(id)}`);if(!invoice)return NextResponse.json({ok:false,error:'Invoice not found.'},{status:404});const items=await select<any>('invoice_items',`select=*&invoice_id=eq.${encodeURIComponent(id)}&order=created_at.asc`);return NextResponse.json({ok:true,invoice,items})}
