import { NextResponse } from 'next/server'
import { getSession, isAuthConfigured } from '@/lib/auth/service'
export async function GET(){const configured=isAuthConfigured();const session=await getSession();return NextResponse.json({configured,authenticated:Boolean(session),session:session?{role:session.role,name:session.name,exp:session.exp}:null})}
