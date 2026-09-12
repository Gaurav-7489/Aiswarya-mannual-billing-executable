import { NextResponse } from 'next/server'
import { authenticate, createSession, isAuthConfigured } from '@/lib/auth/service'

let failures=0
let blockedUntil=0
export async function POST(request:Request){
  try{
    if(!isAuthConfigured())return NextResponse.json({error:'SETUP_REQUIRED'},{status:428})
    if(Date.now()<blockedUntil)return NextResponse.json({error:'Too many failed attempts. Try again shortly.'},{status:429})
    const body=await request.json() as {pin?:string}
    const role=authenticate(String(body.pin??''))
    if(!role){failures+=1;if(failures>=5){blockedUntil=Date.now()+60_000;failures=0}return NextResponse.json({error:'Incorrect PIN.'},{status:401})}
    failures=0;blockedUntil=0
    const session=await createSession(role)
    return NextResponse.json({ok:true,session:{role:session.role,name:session.name}})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to sign in.'},{status:400})}
}
