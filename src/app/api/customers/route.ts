import { NextResponse } from 'next/server'
import { searchCustomers } from '@/lib/db/repositories'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get('q') ?? ''
  return NextResponse.json({ customers: searchCustomers(term) })
}
