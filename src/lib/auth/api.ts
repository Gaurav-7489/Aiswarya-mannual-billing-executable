import { NextResponse } from 'next/server'
import { requireAuth, type AuthRole } from '@/lib/auth/service'

export async function requireApiAuth(role?:AuthRole){
 try{return{session:await requireAuth(role),response:null as NextResponse|null}}
 catch(error){const code=error instanceof Error?error.message:'';return{session:null,response:NextResponse.json({error:code==='FORBIDDEN'?'Owner access required.':'Authentication required.'},{status:code==='FORBIDDEN'?403:401})}}
}
