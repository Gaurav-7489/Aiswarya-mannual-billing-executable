const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vsngsoywjjtejztwchkc.supabase.co'
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

function headers() {
  if (!SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY is not configured.')
  return { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}`, 'Content-Type': 'application/json' }
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) }, cache: 'no-store' })
  const text = await response.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!response.ok) {
    const message = typeof body === 'object' && body && 'message' in body ? String((body as { message: string }).message) : `Supabase request failed (${response.status})`
    throw new Error(message)
  }
  return body
}

export async function select<T = Record<string, unknown>>(table: string, query = ''): Promise<T[]> { return ((await request(`${table}?${query}`)) || []) as T[] }
export async function selectOne<T = Record<string, unknown>>(table: string, query: string): Promise<T | undefined> { const rows = await select<T>(table, `${query}&limit=1`); return rows[0] }
export async function insert<T = Record<string, unknown>>(table: string, row: Record<string, unknown>): Promise<T> { const body = await request(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) }); return (Array.isArray(body) ? body[0] : body) as T }
export async function insertMany<T = Record<string, unknown>>(table: string, rows: Record<string, unknown>[]): Promise<T[]> { if (!rows.length) return []; return ((await request(table, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(rows) })) || []) as T[] }
export async function update<T = Record<string, unknown>>(table: string, query: string, patch: Record<string, unknown>): Promise<T[]> { return ((await request(`${table}?${query}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) })) || []) as T[] }
export async function remove(table: string, query: string): Promise<void> { await request(`${table}?${query}`, { method: 'DELETE' }) }
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> { return (await request(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })) as T }
export function getSupabaseUrl() { return SUPABASE_URL }
