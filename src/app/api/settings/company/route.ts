import { NextResponse } from 'next/server'
import { getCompanySettings, saveCompanySettings, type CompanySettings } from '@/lib/settings/company'

export async function GET() {
  return NextResponse.json({ settings: getCompanySettings() })
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<CompanySettings>
    const allowed: Array<keyof CompanySettings> = [
      'name','tagline','address','gstin','fssai','phone','email','website','logoUrl',
      'bankAccountName','bankName','bankAccountNumber','bankIfsc','bankBranch','terms',
      'footerMessage','footerTagline','authorizedSignatory','defaultGstMode',
    ]
    const input: Partial<CompanySettings> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) input[key] = String(body[key]) as never
    }
    if (input.defaultGstMode !== undefined && input.defaultGstMode !== 'INTRA' && input.defaultGstMode !== 'INTER') {
      return NextResponse.json({ error: 'GST mode must be INTRA or INTER.' }, { status: 400 })
    }
    const settings = saveCompanySettings(input)
    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save company settings.' }, { status: 400 })
  }
}
