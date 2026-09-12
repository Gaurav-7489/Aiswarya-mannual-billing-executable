import { randomUUID } from 'node:crypto'
import { getDatabase } from '@/lib/db/client'

export function queueInvoiceNotifications(invoiceId: string) {
  const db = getDatabase()
  const invoice = db.prepare(`SELECT i.invoice_number, c.email, c.phone FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.id=?`).get(invoiceId) as {invoice_number:string;email:string|null;phone:string|null}|undefined
  if (!invoice) return
  const settings = db.prepare('SELECT key,value FROM settings WHERE key IN (?,?,?)').all('owner_email','owner_whatsapp','notifications_enabled') as Array<{key:string;value:string}>
  const map = Object.fromEntries(settings.map(x=>[x.key,x.value]))
  if (map.notifications_enabled === 'false') return
  const email = map.owner_email || invoice.email
  const whatsapp = map.owner_whatsapp || invoice.phone
  const insert = db.prepare(`INSERT INTO notifications(id,invoice_id,channel,recipient,status,attempts,created_at,updated_at) VALUES(?,?,?,?, 'PENDING',0,?,?)`)
  const timestamp = new Date().toISOString()
  if (email) insert.run(randomUUID(),invoiceId,'EMAIL',email,timestamp,timestamp)
  if (whatsapp) insert.run(randomUUID(),invoiceId,'WHATSAPP',whatsapp,timestamp,timestamp)
}

export function getPendingNotifications(limit=20) {
  return getDatabase().prepare(`SELECT n.*,i.invoice_number FROM notifications n JOIN invoices i ON i.id=n.invoice_id WHERE n.status IN ('PENDING','FAILED') ORDER BY n.created_at LIMIT ?`).all(limit)
}
