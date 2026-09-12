import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { createDraft } from '@/lib/invoice/service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const guard = await requireApiAuth()
  if (guard.response) return guard.response
  try {
    const body = await request.json()
    const draft = createDraft(body)
    return NextResponse.json({ ok: true, draft }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to save draft.' }, { status: 400 })
  }
}
