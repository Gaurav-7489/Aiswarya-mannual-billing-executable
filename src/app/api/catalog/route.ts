import { NextResponse } from 'next/server'
import { searchProducts } from '@/lib/db/repositories'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get('q') ?? ''
  return NextResponse.json({ products: searchProducts(term) })
}
