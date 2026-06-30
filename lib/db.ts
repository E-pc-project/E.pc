// Server-only SQLite database layer for E.PC
// All user accounts and submitted gaming centers are persisted here.
import 'server-only'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

export interface UserRow {
  id: number
  name: string
  email: string
  password_hash: string
  created_at: string
}

export interface CenterRow {
  id: number
  owner_email: string
  owner_name: string
  name: string
  phone: string
  pc_count: number
  specs: string
  location: string
  district: string
  price_per_hour: number
  notes: string
  status: string
  created_at: string
}

// Reuse a single connection across HMR reloads in dev.
const globalForDb = globalThis as unknown as { __epcDb?: Database.Database }

function init(): Database.Database {
  // Keep the DB OUTSIDE the watched source tree so writes don't trigger a
  // Next.js dev recompile/reload. node_modules is ignored by the dev watcher.
  // Override with EPC_DATA_DIR for production / a custom location.
  const dataDir =
    process.env.EPC_DATA_DIR || path.join(process.cwd(), 'node_modules', '.epc-data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const db = new Database(path.join(dataDir, 'epc.db'))
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS centers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_email    TEXT    NOT NULL,
      owner_name     TEXT    NOT NULL,
      name           TEXT    NOT NULL,
      phone          TEXT    NOT NULL,
      pc_count       INTEGER NOT NULL,
      specs          TEXT    NOT NULL DEFAULT '',
      location       TEXT    NOT NULL,
      district       TEXT    NOT NULL DEFAULT '',
      price_per_hour INTEGER NOT NULL DEFAULT 0,
      notes          TEXT    NOT NULL DEFAULT '',
      status         TEXT    NOT NULL DEFAULT 'pending',
      created_at     TEXT    NOT NULL
    );
  `)

  return db
}

export function getDb(): Database.Database {
  if (!globalForDb.__epcDb) globalForDb.__epcDb = init()
  return globalForDb.__epcDb
}

/* ----------------------------- Users ----------------------------- */

export function getUserByEmail(email: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase()) as UserRow | undefined
}

export function createUser(input: {
  name: string
  email: string
  passwordHash: string
}): UserRow {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, created_at)
       VALUES (@name, @email, @password_hash, @created_at)`,
    )
    .run({
      name: input.name,
      email: input.email.toLowerCase(),
      password_hash: input.passwordHash,
      created_at: new Date().toISOString(),
    })
  return db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(info.lastInsertRowid) as UserRow
}

/* ---------------------------- Centers ---------------------------- */

export function insertCenter(input: {
  ownerEmail: string
  ownerName: string
  name: string
  phone: string
  pcCount: number
  specs: string
  location: string
  district?: string
  pricePerHour?: number
  notes?: string
}): CenterRow {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO centers
        (owner_email, owner_name, name, phone, pc_count, specs, location, district, price_per_hour, notes, status, created_at)
       VALUES
        (@owner_email, @owner_name, @name, @phone, @pc_count, @specs, @location, @district, @price_per_hour, @notes, 'approved', @created_at)`,
    )
    .run({
      owner_email: input.ownerEmail.toLowerCase(),
      owner_name: input.ownerName,
      name: input.name,
      phone: input.phone,
      pc_count: input.pcCount,
      specs: input.specs,
      location: input.location,
      district: input.district ?? '',
      price_per_hour: input.pricePerHour ?? 0,
      notes: input.notes ?? '',
      created_at: new Date().toISOString(),
    })
  return db
    .prepare('SELECT * FROM centers WHERE id = ?')
    .get(info.lastInsertRowid) as CenterRow
}

export function listCenters(): CenterRow[] {
  return getDb()
    .prepare('SELECT * FROM centers ORDER BY created_at DESC')
    .all() as CenterRow[]
}
