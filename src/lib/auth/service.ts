import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { getDatabase } from '@/lib/db/client'

const COOKIE_NAME = 'aiswarya_session'
const SESSION_DAYS = 7
const PIN_KEY = 'auth.pinHash'
const SECRET_KEY = 'auth.sessionSecret'
const OWNER_NAME_KEY = 'auth.ownerName'

export type AuthRole = 'STAFF' | 'OWNER'
export type Session = { role: AuthRole; name: string; exp: number }

type StoredPin = { salt: string; hash: string }

function setting(key: string) {
  return (getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? ''
}

function setSetting(key: string, value: string) {
  getDatabase().prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key, value, new Date().toISOString())
}

function hashPin(pin: string): StoredPin {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex')
  return { salt, hash }
}

function verifyPin(pin: string, stored: string) {
  try {
    const parsed = JSON.parse(stored) as StoredPin
    const actual = crypto.scryptSync(pin, parsed.salt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(parsed.hash, 'hex'))
  } catch { return false }
}

function sessionSecret() {
  let secret = setting(SECRET_KEY)
  if (!secret) { secret = crypto.randomBytes(32).toString('hex'); setSetting(SECRET_KEY, secret) }
  return secret
}

function sign(payload: string) { return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url') }

function encodeSession(session: Session) {
  const body = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${body}.${sign(body)}`
}

function decodeSession(value: string): Session | null {
  try {
    const [body, signature] = value.split('.')
    if (!body || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(body)))) return null
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session
    if (!session.exp || session.exp < Date.now() || !['STAFF','OWNER'].includes(session.role)) return null
    return session
  } catch { return null }
}

export function isAuthConfigured() { return Boolean(setting(PIN_KEY)) }
export function getOwnerName() { return setting(OWNER_NAME_KEY) || 'Staff' }

export function configurePin(pin: string, ownerName: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must contain 4 to 8 digits.')
  setSetting(PIN_KEY, JSON.stringify(hashPin(pin)))
  setSetting(OWNER_NAME_KEY, ownerName.trim() || 'Owner')
  getDatabase().prepare('INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,metadata_json,created_at) VALUES(lower(hex(randomblob(16))),?,?,?,?,?,?)').run('SETUP','AUTH_CONFIGURED','auth','local',JSON.stringify({ ownerName: ownerName.trim() || 'Owner' }),new Date().toISOString())
}

export function authenticate(pin: string): AuthRole | null {
  const stored = setting(PIN_KEY)
  if (!stored || !verifyPin(pin, stored)) return null
  return 'OWNER'
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const value = store.get(COOKIE_NAME)?.value
  return value ? decodeSession(value) : null
}

export async function createSession(role: AuthRole) {
  const session: Session = { role, name: getOwnerName(), exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 }
  const store = await cookies()
  store.set(COOKIE_NAME, encodeSession(session), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_DAYS * 24 * 60 * 60 })
  return session
}

export async function clearSession() { (await cookies()).set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 }) }

export async function requireAuth(role?: AuthRole) {
  const session = await getSession()
  if (!session) throw new Error('AUTH_REQUIRED')
  if (role && session.role !== role) throw new Error('FORBIDDEN')
  return session
}

export { COOKIE_NAME }
