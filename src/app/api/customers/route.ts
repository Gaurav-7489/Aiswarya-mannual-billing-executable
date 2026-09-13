import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { searchCustomers } from '@/lib/db/repositories'
export const runtime='nodejs'
export async function GET(request:Request){const guard=await requireApiAuth();if(guard.response)return guard.response;const term=new URL(request.url).searchParams.get('q')??'';return NextResponse.json({customers:await searchCustomers(term)})}
