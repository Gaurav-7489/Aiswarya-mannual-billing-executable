import { NextResponse } from 'next/server'
import { configurePins, isAuthConfigured } from '@/lib/auth/service'

export async function POST(request:Request){
  try{
    if(isAuthConfigured())return NextResponse.json({error:'Authentication is already configured.'},{status:409})
    const body=await request.json() as {ownerPin?:string;staffPin?:string;ownerName?:string}
    configurePins(String(body.ownerPin??''),body.staffPin?String(body.staffPin):undefined,String(body.ownerName??''))
    return NextResponse.json({ok:true})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to configure authentication.'},{status:400})}
}
