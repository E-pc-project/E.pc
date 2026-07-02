// Server-only database layer for E.PC (libSQL / Turso).
// - Locally (no TURSO env): uses a SQLite file inside node_modules/.epc-data
// - On Vercel: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to use Turso (serverless-safe)
import 'server-only'
import type { Client } from '@libsql/client'
import fs from 'node:fs'
import path from 'node:path'

export interface UserRow {
  id: number
  name: string
  email: string
  password_hash: string
  is_admin: number
  is_dev: number
  reset_code: string | null
  reset_expires: string | null
  balance: number
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

export interface BookingRow {
  id: number
  user_email: string
  center_id: string
  center_name: string
  date: string
  time: string
  duration: number
  seats: string
  game: string
  total_price: number
  created_at: string
}

// Reuse the client + schema-init promise across HMR / warm invocations.
const g = globalThis as unknown as {
  __epcClient?: Promise<Client>
  __epcSchema?: Promise<void>
}

async function makeClient(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (url) {
    // Remote Turso — pure-JS HTTP client, safe on Vercel serverless.
    const { createClient } = await import('@libsql/client/web')
    return createClient({ url, authToken })
  }

  // Local dev fallback — SQLite file kept out of the Next dev watch tree.
  const dataDir =
    process.env.EPC_DATA_DIR || path.join(process.cwd(), 'node_modules', '.epc-data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const { createClient } = await import('@libsql/client')
  return createClient({ url: 'file:' + path.join(dataDir, 'epc.db').replace(/\\/g, '/') })
}

function getClient(): Promise<Client> {
  if (!g.__epcClient) g.__epcClient = makeClient()
  return g.__epcClient
}

async function db(): Promise<Client> {
  const client = await getClient()
  if (!g.__epcSchema) {
    g.__epcSchema = (async () => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          name          TEXT NOT NULL,
          email         TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          is_admin      INTEGER NOT NULL DEFAULT 0,
          is_dev        INTEGER NOT NULL DEFAULT 0,
          reset_code    TEXT,
          reset_expires TEXT,
          balance       INTEGER NOT NULL DEFAULT 0,
          created_at    TEXT NOT NULL
        )`)
      // Migrations for pre-existing databases missing these columns.
      for (const sql of [
        'ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE users ADD COLUMN is_dev INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE users ADD COLUMN reset_code TEXT',
        'ALTER TABLE users ADD COLUMN reset_expires TEXT',
        'ALTER TABLE users ADD COLUMN balance INTEGER NOT NULL DEFAULT 0',
      ]) {
        try {
          await client.execute(sql)
        } catch {
          /* column already exists */
        }
      }
      await client.execute(`
        CREATE TABLE IF NOT EXISTS centers (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          owner_email    TEXT NOT NULL,
          owner_name     TEXT NOT NULL,
          name           TEXT NOT NULL,
          phone          TEXT NOT NULL,
          pc_count       INTEGER NOT NULL,
          specs          TEXT NOT NULL DEFAULT '',
          location       TEXT NOT NULL,
          district       TEXT NOT NULL DEFAULT '',
          price_per_hour INTEGER NOT NULL DEFAULT 0,
          notes          TEXT NOT NULL DEFAULT '',
          status         TEXT NOT NULL DEFAULT 'pending',
          created_at     TEXT NOT NULL
        )`)
      await client.execute(`
        CREATE TABLE IF NOT EXISTS bookings (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email  TEXT NOT NULL,
          center_id   TEXT NOT NULL,
          center_name TEXT NOT NULL,
          date        TEXT NOT NULL DEFAULT '',
          time        TEXT NOT NULL DEFAULT '',
          duration    INTEGER NOT NULL DEFAULT 1,
          seats       TEXT NOT NULL DEFAULT '',
          game        TEXT NOT NULL DEFAULT '',
          total_price INTEGER NOT NULL DEFAULT 0,
          created_at  TEXT NOT NULL
        )`)
    })()
  }
  await g.__epcSchema
  return client
}

/* ----------------------------- Users ----------------------------- */

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  })
  return rs.rows[0] as unknown as UserRow | undefined
}

export async function createUser(input: {
  name: string
  email: string
  passwordHash: string
  isAdmin?: boolean
  isDev?: boolean
}): Promise<UserRow> {
  const client = await db()
  const rs = await client.execute({
    sql: `INSERT INTO users (name, email, password_hash, is_admin, is_dev, created_at)
          VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      input.name,
      input.email.toLowerCase(),
      input.passwordHash,
      input.isAdmin ? 1 : 0,
      input.isDev ? 1 : 0,
      new Date().toISOString(),
    ],
  })
  return rs.rows[0] as unknown as UserRow
}

// Store a password-reset code + expiry on the user.
export async function setResetCode(
  email: string,
  code: string,
  expiresISO: string,
): Promise<void> {
  const client = await db()
  await client.execute({
    sql: 'UPDATE users SET reset_code = ?, reset_expires = ? WHERE email = ?',
    args: [code, expiresISO, email.toLowerCase()],
  })
}

// Update the password hash and clear any reset code.
export async function updatePassword(email: string, passwordHash: string): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: 'UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE email = ?',
    args: [passwordHash, email.toLowerCase()],
  })
  return rs.rowsAffected > 0
}

// Permanently delete a user and everything they own.
export async function deleteUserAccount(email: string): Promise<boolean> {
  const client = await db()
  const e = email.toLowerCase()
  await client.execute({ sql: 'DELETE FROM centers WHERE owner_email = ?', args: [e] })
  await client.execute({ sql: 'DELETE FROM bookings WHERE user_email = ?', args: [e] })
  const rs = await client.execute({ sql: 'DELETE FROM users WHERE email = ?', args: [e] })
  return rs.rowsAffected > 0
}

/* ---------------------------- Centers ---------------------------- */

export async function insertCenter(input: {
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
}): Promise<CenterRow> {
  const client = await db()
  const rs = await client.execute({
    sql: `INSERT INTO centers
            (owner_email, owner_name, name, phone, pc_count, specs, location, district, price_per_hour, notes, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?) RETURNING *`,
    args: [
      input.ownerEmail.toLowerCase(),
      input.ownerName,
      input.name,
      input.phone,
      input.pcCount,
      input.specs,
      input.location,
      input.district ?? '',
      input.pricePerHour ?? 0,
      input.notes ?? '',
      new Date().toISOString(),
    ],
  })
  return rs.rows[0] as unknown as CenterRow
}

export async function listCenters(): Promise<CenterRow[]> {
  const client = await db()
  const rs = await client.execute('SELECT * FROM centers ORDER BY created_at DESC')
  return rs.rows as unknown as CenterRow[]
}

export async function listCentersByOwner(email: string): Promise<CenterRow[]> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT * FROM centers WHERE owner_email = ? ORDER BY created_at DESC',
    args: [email.toLowerCase()],
  })
  return rs.rows as unknown as CenterRow[]
}

export async function deleteCenter(id: number, ownerEmail: string): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: 'DELETE FROM centers WHERE id = ? AND owner_email = ?',
    args: [id, ownerEmail.toLowerCase()],
  })
  return rs.rowsAffected > 0
}

// Developer / super-admin: delete any center regardless of owner.
export async function deleteCenterById(id: number): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: 'DELETE FROM centers WHERE id = ?',
    args: [id],
  })
  return rs.rowsAffected > 0
}

export async function updateCenter(
  id: number,
  ownerEmail: string,
  fields: {
    name: string
    phone: string
    pcCount: number
    specs: string
    location: string
    district: string
    pricePerHour: number
  },
): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: `UPDATE centers
             SET name = ?, phone = ?, pc_count = ?, specs = ?, location = ?, district = ?, price_per_hour = ?
           WHERE id = ? AND owner_email = ?`,
    args: [
      fields.name,
      fields.phone,
      fields.pcCount,
      fields.specs,
      fields.location,
      fields.district,
      fields.pricePerHour,
      id,
      ownerEmail.toLowerCase(),
    ],
  })
  return rs.rowsAffected > 0
}

// Developer / super-admin: update any center regardless of owner.
export async function updateCenterById(
  id: number,
  fields: {
    name: string
    phone: string
    pcCount: number
    specs: string
    location: string
    district: string
    pricePerHour: number
  },
): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: `UPDATE centers
             SET name = ?, phone = ?, pc_count = ?, specs = ?, location = ?, district = ?, price_per_hour = ?
           WHERE id = ?`,
    args: [
      fields.name,
      fields.phone,
      fields.pcCount,
      fields.specs,
      fields.location,
      fields.district,
      fields.pricePerHour,
      id,
    ],
  })
  return rs.rowsAffected > 0
}

/* ---------------------------- Bookings --------------------------- */

export async function insertBooking(input: {
  userEmail: string
  centerId: string
  centerName: string
  date: string
  time: string
  duration: number
  seats: string
  game: string
  totalPrice: number
}): Promise<BookingRow> {
  const client = await db()
  const rs = await client.execute({
    sql: `INSERT INTO bookings
            (user_email, center_id, center_name, date, time, duration, seats, game, total_price, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      input.userEmail.toLowerCase(),
      input.centerId,
      input.centerName,
      input.date,
      input.time,
      input.duration,
      input.seats,
      input.game,
      input.totalPrice,
      new Date().toISOString(),
    ],
  })
  return rs.rows[0] as unknown as BookingRow
}

export async function listBookingsByUser(email: string): Promise<BookingRow[]> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT * FROM bookings WHERE user_email = ? ORDER BY created_at DESC',
    args: [email.toLowerCase()],
  })
  return rs.rows as unknown as BookingRow[]
}

/* ----------------------------- Wallet ---------------------------- */

export async function getUserBalance(email: string): Promise<number> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT balance FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  })
  const row = rs.rows[0] as { balance?: number } | undefined
  return row ? Number(row.balance) || 0 : 0
}

// Adds (or subtracts, with a negative amount) ecoin and returns the new balance.
export async function addUserBalance(email: string, amount: number): Promise<number> {
  const client = await db()
  await client.execute({
    sql: 'UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE email = ?',
    args: [amount, email.toLowerCase()],
  })
  return getUserBalance(email)
}

// Atomically deducts `amount` only if the user currently has enough balance.
// Returns false (no-op) if the balance is insufficient — safe under concurrent requests.
export async function deductUserBalance(email: string, amount: number): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: 'UPDATE users SET balance = balance - ? WHERE email = ? AND balance >= ?',
    args: [amount, email.toLowerCase(), amount],
  })
  return rs.rowsAffected > 0
}
