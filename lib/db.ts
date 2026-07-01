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
          created_at    TEXT NOT NULL
        )`)
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
}): Promise<UserRow> {
  const client = await db()
  const rs = await client.execute({
    sql: `INSERT INTO users (name, email, password_hash, created_at)
          VALUES (?, ?, ?, ?) RETURNING *`,
    args: [input.name, input.email.toLowerCase(), input.passwordHash, new Date().toISOString()],
  })
  return rs.rows[0] as unknown as UserRow
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
