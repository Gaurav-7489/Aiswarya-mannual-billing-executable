import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

let database: Database.Database | null = null

export function getDatabase() {
  if (database) return database

  const dataDir = path.join(process.cwd(), 'data')
  fs.mkdirSync(dataDir, { recursive: true })

  database = new Database(path.join(dataDir, 'aiswarya.sqlite'))
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')

  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql')
  database.exec(fs.readFileSync(schemaPath, 'utf8'))

  return database
}
