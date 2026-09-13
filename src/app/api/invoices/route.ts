import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { createInvoice } from '@/lib/invoice/service'
import { queueInvoiceNotifications } from '@/lib/notifications/queue'
export const runtime='nodejs'
export async function POST(request:Request){const guard=await requireApiAuth();if(guard.response)return guard.response;try{const body=await request.json();const result=await createInvoice(body);await queueInvoiceNotifications(result.id);return NextResponse.json({ok:true,invoice:result},{status:201})}catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to create invoice.'},{status:400})}}
