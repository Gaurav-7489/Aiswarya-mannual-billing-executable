import { getDatabase } from '@/lib/db/client'

export type CompanySettings = {
  name: string
  tagline: string
  address: string
  gstin: string
  fssai: string
  phone: string
  email: string
  website: string
  logoUrl: string
  bankAccountName: string
  bankName: string
  bankAccountNumber: string
  bankIfsc: string
  bankBranch: string
  terms: string
  footerMessage: string
  footerTagline: string
  authorizedSignatory: string
  defaultGstMode: 'INTRA' | 'INTER'
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'Aiswarya Food Products',
  tagline: 'QUALITY BISCUITS FOR A BRIGHTER TOMORROW',
  address: 'Pazhookkara,\nChalakkudy,\nKerala 680731, India',
  gstin: '',
  fssai: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  bankAccountName: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  bankBranch: '',
  terms: '1. Goods once sold will not be taken back.\n2. Payment to be made within the due date.\n3. Interest will be charged on overdue amounts.\n4. Subject to Kerala jurisdiction only.',
  footerMessage: 'Thank you for your business.',
  footerTagline: 'TOGETHER FOR A HEALTHIER TOMORROW',
  authorizedSignatory: 'Authorized Signatory',
  defaultGstMode: 'INTRA',
}

const keys = Object.keys(DEFAULT_COMPANY_SETTINGS) as Array<keyof CompanySettings>

export function getCompanySettings(): CompanySettings {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Partial<Record<keyof CompanySettings, string>>
  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...Object.fromEntries(keys.filter((key) => stored[key] !== undefined).map((key) => [key, stored[key]])),
    defaultGstMode: stored.defaultGstMode === 'INTER' ? 'INTER' : stored.defaultGstMode === 'INTRA' ? 'INTRA' : DEFAULT_COMPANY_SETTINGS.defaultGstMode,
  }
}

export function saveCompanySettings(input: Partial<CompanySettings>) {
  const db = getDatabase()
  const current = getCompanySettings()
  const next = { ...current, ...input }
  const timestamp = new Date().toISOString()
  const transaction = db.transaction(() => {
    const stmt = db.prepare('INSERT INTO settings(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at')
    keys.forEach((key) => stmt.run(key, String(next[key]), timestamp))
    db.prepare('INSERT INTO audit_logs(id, actor, action, entity_type, entity_id, metadata_json, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)').run('LOCAL_STAFF', 'COMPANY_SETTINGS_UPDATED', 'settings', 'company', JSON.stringify({ fields: keys }), timestamp)
  })
  transaction()
  return next
}
