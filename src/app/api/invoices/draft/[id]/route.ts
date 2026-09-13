import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { finalizeDraft } from '@/lib/invoice/service'
import { queueInvoiceNotifications } from '@/lib/notifications/queue'
export const runtime='nodejs'
type Params={params:Promise<{id:string}>}
export async function POST(request:Request,{params}:Params){const guard=await requireApiAuth();if(guard.response)return guard.response;try{const{id}=await params,body=await request.json().catch(()=>({})),result=await finalizeDraft(id,body.gstMode==='INTER'?'INTER':'INTRA');await queueInvoiceNotifications(result.id);return NextResponse.json({ok:true,invoice:result})}catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:'Unable to finalize draft.'},{status:400})}}
