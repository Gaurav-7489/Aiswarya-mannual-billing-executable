import { NextResponse } from 'next/server'
import { requireAuth, configurePins } from '@/lib/auth/service'
export const runtime='nodejs'
export async function PUT(request:Request){try{await requireAuth('OWNER');const body=await request.json() as {ownerPin?:string;staffPin?:string;ownerName?:string};configurePins(String(body.ownerPin??''),body.staffPin?String(body.staffPin):undefined,String(body.ownerName??''));return NextResponse.json({ok:true})}catch(e){const m=e instanceof Error?e.message:'Unable to update PINs.';return NextResponse.json({error:m==='FORBIDDEN'?'Owner access required.':m},{status:m==='FORBIDDEN'?403:400})}}
