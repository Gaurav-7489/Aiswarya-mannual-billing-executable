import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { rpc } from '@/lib/db/client'

export const runtime = 'nodejs'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard.response) return guard.response

  try {
    const today = new Date().toISOString().slice(0, 10)
    const data = await rpc<Record<string, unknown>>('dashboard_summary', { p_today: today })
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load dashboard'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
