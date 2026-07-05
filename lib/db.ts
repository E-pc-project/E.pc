// Server-only database layer for E.PC (libSQL / Turso).
// - Locally (no TURSO env): uses a SQLite file inside node_modules/.epc-data
// - On Vercel: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to use Turso (serverless-safe)
import 'server-only'
import type { Client } from '@libsql/client'
import fs from 'node:fs'
import path from 'node:path'
import { parseSeats, timeToHour } from './availability'

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
  phone: string | null
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
  vip_seats: string
  vip_price_per_hour: number
  open_time: string
  close_time: string
  photo: string
  created_at: string
}

// listCenters()/listCentersByOwner() join against rooms/reviews to compute these.
export interface CenterWithAggregatesRow extends CenterRow {
  total_seats: number
  price_from: number | null
  has_vip: number
  avg_rating: number
  review_count: number
}

export interface RoomRow {
  id: number
  center_id: number
  name: string
  category: string
  seat_count: number
  price_per_hour: number
  created_at: string
}

export interface ReviewRow {
  id: number
  center_id: number
  user_email: string
  user_name: string
  booking_id: number | null
  rating: number
  comment: string
  created_at: string
}

export interface BookingRow {
  id: number
  user_email: string
  center_id: string
  center_name: string
  room_id: number
  room_name: string
  date: string
  time: string
  duration: number
  seats: string
  game: string
  total_price: number
  status: string
  cancelled_at: string | null
  refund_amount: number | null
  created_at: string
}

export interface NotificationRow {
  id: number
  admin_email: string
  type: string
  title: string
  body: string
  center_id: string
  booking_id: number | null
  read_at: string | null
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
        'ALTER TABLE users ADD COLUMN phone TEXT',
      ]) {
        try {
          await client.execute(sql)
        } catch {
          /* column already exists */
        }
      }
      // SQLite can't add a UNIQUE constraint via ALTER TABLE ADD COLUMN, so
      // it's enforced with a separate index instead — NULLs (email/password
      // accounts with no phone) don't count as duplicates under UNIQUE.
      await client.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
      )
      // OTP codes for phone-number sign-in — one row per phone, overwritten
      // on every new request so only the most recently sent code is valid.
      // Not tied to a user row because the phone may not have an account yet
      // (first-time sign-in creates one on successful verification).
      await client.execute(`
        CREATE TABLE IF NOT EXISTS phone_otps (
          phone      TEXT PRIMARY KEY,
          code       TEXT NOT NULL,
          expires_at TEXT NOT NULL
        )`)
      await client.execute(`
        CREATE TABLE IF NOT EXISTS centers (
          id                 INTEGER PRIMARY KEY AUTOINCREMENT,
          owner_email        TEXT NOT NULL,
          owner_name         TEXT NOT NULL,
          name               TEXT NOT NULL,
          phone              TEXT NOT NULL,
          pc_count           INTEGER NOT NULL,
          specs              TEXT NOT NULL DEFAULT '',
          location           TEXT NOT NULL,
          district           TEXT NOT NULL DEFAULT '',
          price_per_hour     INTEGER NOT NULL DEFAULT 0,
          notes              TEXT NOT NULL DEFAULT '',
          status             TEXT NOT NULL DEFAULT 'pending',
          vip_seats          TEXT NOT NULL DEFAULT '',
          vip_price_per_hour INTEGER NOT NULL DEFAULT 0,
          created_at         TEXT NOT NULL
        )`)
      // Migrations for pre-existing databases missing these columns.
      for (const sql of [
        "ALTER TABLE centers ADD COLUMN vip_seats TEXT NOT NULL DEFAULT ''",
        'ALTER TABLE centers ADD COLUMN vip_price_per_hour INTEGER NOT NULL DEFAULT 0',
        "ALTER TABLE centers ADD COLUMN open_time TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE centers ADD COLUMN close_time TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE centers ADD COLUMN photo TEXT NOT NULL DEFAULT ''",
      ]) {
        try {
          await client.execute(sql)
        } catch {
          /* column already exists */
        }
      }
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
      // Migrations for pre-existing databases missing these columns.
      for (const sql of [
        'ALTER TABLE bookings ADD COLUMN room_id INTEGER NOT NULL DEFAULT 0',
        "ALTER TABLE bookings ADD COLUMN room_name TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE bookings ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'",
        'ALTER TABLE bookings ADD COLUMN cancelled_at TEXT',
        'ALTER TABLE bookings ADD COLUMN refund_amount INTEGER',
      ]) {
        try {
          await client.execute(sql)
        } catch {
          /* column already exists */
        }
      }
      await client.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_email TEXT NOT NULL,
          type        TEXT NOT NULL DEFAULT 'booking',
          title       TEXT NOT NULL,
          body        TEXT NOT NULL DEFAULT '',
          center_id   TEXT NOT NULL DEFAULT '',
          booking_id  INTEGER,
          read_at     TEXT,
          created_at  TEXT NOT NULL
        )`)
      await client.execute(`
        CREATE TABLE IF NOT EXISTS rooms (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          center_id      INTEGER NOT NULL,
          name           TEXT NOT NULL,
          category       TEXT NOT NULL DEFAULT 'regular',
          seat_count     INTEGER NOT NULL,
          price_per_hour INTEGER NOT NULL DEFAULT 0,
          created_at     TEXT NOT NULL
        )`)
      // One-time backfill: centers created before rooms existed get a room
      // (or two, if they had VIP seats) derived from their legacy
      // pc_count/vip_seats fields, so they stay bookable. Only touches
      // centers that don't have any rooms yet, so it's safe to re-run.
      const orphanCenters = await client.execute(`
        SELECT c.* FROM centers c
        LEFT JOIN rooms r ON r.center_id = c.id
        WHERE r.id IS NULL`)
      for (const row of orphanCenters.rows as unknown as CenterRow[]) {
        const vipSeatCount = row.vip_seats ? row.vip_seats.split(',').filter(Boolean).length : 0
        const regularSeatCount = Math.max(0, (row.pc_count || 0) - vipSeatCount)
        const now = new Date().toISOString()
        if (regularSeatCount > 0) {
          await client.execute({
            sql: `INSERT INTO rooms (center_id, name, category, seat_count, price_per_hour, created_at)
                  VALUES (?, 'Ерөнхий', 'regular', ?, ?, ?)`,
            args: [row.id, regularSeatCount, row.price_per_hour || 0, now],
          })
        }
        if (vipSeatCount > 0) {
          await client.execute({
            sql: `INSERT INTO rooms (center_id, name, category, seat_count, price_per_hour, created_at)
                  VALUES (?, 'VIP', 'vip', ?, ?, ?)`,
            args: [row.id, vipSeatCount, row.vip_price_per_hour || row.price_per_hour || 0, now],
          })
        }
        if (regularSeatCount === 0 && vipSeatCount === 0) {
          await client.execute({
            sql: `INSERT INTO rooms (center_id, name, category, seat_count, price_per_hour, created_at)
                  VALUES (?, 'Ерөнхий', 'regular', 1, ?, ?)`,
            args: [row.id, row.price_per_hour || 0, now],
          })
        }
      }
      await client.execute(`
        CREATE TABLE IF NOT EXISTS reviews (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          center_id   INTEGER NOT NULL,
          user_email  TEXT NOT NULL,
          user_name   TEXT NOT NULL DEFAULT '',
          booking_id  INTEGER,
          rating      INTEGER NOT NULL,
          comment     TEXT NOT NULL DEFAULT '',
          created_at  TEXT NOT NULL
        )`)
      // One row per (room, date, seat, hour) a confirmed booking occupies.
      // The UNIQUE constraint is the actual double-booking guard — it's
      // enforced by SQLite itself, so it holds even if two requests race
      // each other (see insertBooking, which inserts these inside a write
      // transaction and treats a constraint violation as a conflict).
      await client.execute(`
        CREATE TABLE IF NOT EXISTS booking_slots (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id INTEGER NOT NULL,
          room_id    INTEGER NOT NULL,
          date       TEXT NOT NULL,
          seat_num   INTEGER NOT NULL,
          hour       INTEGER NOT NULL,
          UNIQUE(room_id, date, seat_num, hour)
        )`)
      // Backfill slots for bookings that predate this table. Uses INSERT OR
      // IGNORE because pre-existing test data may already contain overlaps
      // that were never guarded at the DB level — this only needs to seed
      // the constraint going forward, not retroactively fix old rows.
      const unslotted = await client.execute(`
        SELECT b.* FROM bookings b
        LEFT JOIN booking_slots s ON s.booking_id = b.id
        WHERE s.id IS NULL AND b.status != 'cancelled'`)
      for (const row of unslotted.rows as unknown as BookingRow[]) {
        const startHour = timeToHour(row.time)
        for (const seat of parseSeats(row.seats)) {
          for (let h = startHour; h < startHour + row.duration; h++) {
            await client.execute({
              sql: 'INSERT OR IGNORE INTO booking_slots (booking_id, room_id, date, seat_num, hour) VALUES (?, ?, ?, ?, ?)',
              args: [row.id, row.room_id, row.date, seat, h],
            })
          }
        }
      }
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

export async function getUserByPhone(phone: string): Promise<UserRow | undefined> {
  const client = await db()
  const rs = await client.execute({ sql: 'SELECT * FROM users WHERE phone = ?', args: [phone] })
  return rs.rows[0] as unknown as UserRow | undefined
}

// Phone-first accounts have no real email — this app's whole data model
// (bookings, reviews, notifications, wallet) is keyed on user_email, so a
// synthetic one is created instead of threading a second identifier
// through every table. passwordHash is a random, unusable hash (there's no
// password login for phone accounts) computed by the caller.
export async function createUserWithPhone(input: {
  name: string
  phone: string
  passwordHash: string
}): Promise<UserRow> {
  const client = await db()
  const rs = await client.execute({
    sql: `INSERT INTO users (name, email, password_hash, phone, created_at)
          VALUES (?, ?, ?, ?, ?) RETURNING *`,
    args: [
      input.name,
      `${input.phone}@phone.epc.local`,
      input.passwordHash,
      input.phone,
      new Date().toISOString(),
    ],
  })
  return rs.rows[0] as unknown as UserRow
}

// Upserts the active OTP for a phone number — only the most recently
// requested code is valid, so a re-request invalidates any earlier one.
export async function setPhoneOtp(phone: string, code: string, expiresISO: string): Promise<void> {
  const client = await db()
  await client.execute({
    sql: `INSERT INTO phone_otps (phone, code, expires_at) VALUES (?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at`,
    args: [phone, code, expiresISO],
  })
}

export async function getPhoneOtp(
  phone: string,
): Promise<{ code: string; expires_at: string } | undefined> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT code, expires_at FROM phone_otps WHERE phone = ?',
    args: [phone],
  })
  return rs.rows[0] as unknown as { code: string; expires_at: string } | undefined
}

// Deletes the OTP after a successful verify so the code can't be replayed.
export async function clearPhoneOtp(phone: string): Promise<void> {
  const client = await db()
  await client.execute({ sql: 'DELETE FROM phone_otps WHERE phone = ?', args: [phone] })
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
  await client.execute({
    sql: 'DELETE FROM rooms WHERE center_id IN (SELECT id FROM centers WHERE owner_email = ?)',
    args: [e],
  })
  await client.execute({ sql: 'DELETE FROM centers WHERE owner_email = ?', args: [e] })
  await client.execute({ sql: 'DELETE FROM bookings WHERE user_email = ?', args: [e] })
  await client.execute({ sql: 'DELETE FROM notifications WHERE admin_email = ?', args: [e] })
  await client.execute({ sql: 'DELETE FROM reviews WHERE user_email = ?', args: [e] })
  const rs = await client.execute({ sql: 'DELETE FROM users WHERE email = ?', args: [e] })
  return rs.rowsAffected > 0
}

/* ---------------------------- Centers ---------------------------- */

export async function insertCenter(input: {
  ownerEmail: string
  ownerName: string
  name: string
  phone: string
  specs: string
  location: string
  district?: string
  notes?: string
  openTime?: string
  closeTime?: string
  photo?: string
  rooms: { name: string; category: string; seatCount: number; pricePerHour: number }[]
}): Promise<CenterRow> {
  const client = await db()
  // pc_count / price_per_hour are legacy NOT NULL columns kept only as a
  // mirror for anything that hasn't been migrated to read from rooms.
  const totalSeats = input.rooms.reduce((sum, r) => sum + r.seatCount, 0)
  const priceFrom = input.rooms.length ? Math.min(...input.rooms.map((r) => r.pricePerHour)) : 0
  const rs = await client.execute({
    sql: `INSERT INTO centers
            (owner_email, owner_name, name, phone, pc_count, specs, location, district, price_per_hour, notes, status, vip_seats, vip_price_per_hour, open_time, close_time, photo, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', '', 0, ?, ?, ?, ?) RETURNING *`,
    args: [
      input.ownerEmail.toLowerCase(),
      input.ownerName,
      input.name,
      input.phone,
      totalSeats,
      input.specs,
      input.location,
      input.district ?? '',
      priceFrom,
      input.notes ?? '',
      input.openTime ?? '',
      input.closeTime ?? '',
      input.photo ?? '',
      new Date().toISOString(),
    ],
  })
  const center = rs.rows[0] as unknown as CenterRow
  const now = new Date().toISOString()
  for (const room of input.rooms) {
    await client.execute({
      sql: `INSERT INTO rooms (center_id, name, category, seat_count, price_per_hour, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [center.id, room.name, room.category, room.seatCount, room.pricePerHour, now],
    })
  }
  return center
}

// Rooms and reviews are each pre-aggregated in their own subquery before
// joining to centers — joining both tables directly would fan out (a
// center with 2 rooms and 3 reviews would produce 6 rows), corrupting
// both the seat totals and the rating average.
const CENTER_AGGREGATES_SQL = `
  SELECT c.*,
    COALESCE(rooms_agg.total_seats, 0) as total_seats,
    rooms_agg.price_from as price_from,
    COALESCE(rooms_agg.has_vip, 0) as has_vip,
    COALESCE(reviews_agg.avg_rating, 0) as avg_rating,
    COALESCE(reviews_agg.review_count, 0) as review_count
  FROM centers c
  LEFT JOIN (
    SELECT center_id,
      SUM(seat_count) as total_seats,
      MIN(price_per_hour) as price_from,
      MAX(CASE WHEN category = 'vip' THEN 1 ELSE 0 END) as has_vip
    FROM rooms
    GROUP BY center_id
  ) rooms_agg ON rooms_agg.center_id = c.id
  LEFT JOIN (
    SELECT center_id, AVG(rating) as avg_rating, COUNT(*) as review_count
    FROM reviews
    GROUP BY center_id
  ) reviews_agg ON reviews_agg.center_id = c.id`

export async function listCenters(): Promise<CenterWithAggregatesRow[]> {
  const client = await db()
  const rs = await client.execute(`${CENTER_AGGREGATES_SQL} ORDER BY c.created_at DESC`)
  return rs.rows as unknown as CenterWithAggregatesRow[]
}

export async function listCentersByOwner(email: string): Promise<CenterWithAggregatesRow[]> {
  const client = await db()
  const rs = await client.execute({
    sql: `${CENTER_AGGREGATES_SQL} WHERE c.owner_email = ? ORDER BY c.created_at DESC`,
    args: [email.toLowerCase()],
  })
  return rs.rows as unknown as CenterWithAggregatesRow[]
}

export async function getCenterById(id: number): Promise<CenterRow | undefined> {
  const client = await db()
  const rs = await client.execute({ sql: 'SELECT * FROM centers WHERE id = ?', args: [id] })
  return rs.rows[0] as unknown as CenterRow | undefined
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
    specs: string
    location: string
    district: string
    openTime: string
    closeTime: string
    photo: string
  },
): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: `UPDATE centers
             SET name = ?, phone = ?, specs = ?, location = ?, district = ?, open_time = ?, close_time = ?, photo = ?
           WHERE id = ? AND owner_email = ?`,
    args: [
      fields.name,
      fields.phone,
      fields.specs,
      fields.location,
      fields.district,
      fields.openTime,
      fields.closeTime,
      fields.photo,
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
    specs: string
    location: string
    district: string
    openTime: string
    closeTime: string
    photo: string
  },
): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: `UPDATE centers
             SET name = ?, phone = ?, specs = ?, location = ?, district = ?, open_time = ?, close_time = ?, photo = ?
           WHERE id = ?`,
    args: [
      fields.name,
      fields.phone,
      fields.specs,
      fields.location,
      fields.district,
      fields.openTime,
      fields.closeTime,
      fields.photo,
      id,
    ],
  })
  return rs.rowsAffected > 0
}

/* ----------------------------- Rooms ------------------------------ */

export async function insertRoom(input: {
  centerId: number
  name: string
  category: string
  seatCount: number
  pricePerHour: number
}): Promise<RoomRow> {
  const client = await db()
  const rs = await client.execute({
    sql: `INSERT INTO rooms (center_id, name, category, seat_count, price_per_hour, created_at)
          VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      input.centerId,
      input.name,
      input.category,
      input.seatCount,
      input.pricePerHour,
      new Date().toISOString(),
    ],
  })
  return rs.rows[0] as unknown as RoomRow
}

export async function listRoomsByCenter(centerId: number): Promise<RoomRow[]> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT * FROM rooms WHERE center_id = ? ORDER BY id ASC',
    args: [centerId],
  })
  return rs.rows as unknown as RoomRow[]
}

export async function getRoomById(id: number): Promise<RoomRow | undefined> {
  const client = await db()
  const rs = await client.execute({ sql: 'SELECT * FROM rooms WHERE id = ?', args: [id] })
  return rs.rows[0] as unknown as RoomRow | undefined
}

export async function updateRoom(
  id: number,
  fields: { name: string; category: string; seatCount: number; pricePerHour: number },
): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: `UPDATE rooms SET name = ?, category = ?, seat_count = ?, price_per_hour = ? WHERE id = ?`,
    args: [fields.name, fields.category, fields.seatCount, fields.pricePerHour, id],
  })
  return rs.rowsAffected > 0
}

export async function deleteRoom(id: number): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({ sql: 'DELETE FROM rooms WHERE id = ?', args: [id] })
  return rs.rowsAffected > 0
}

/* ---------------------------- Reviews ------------------------------ */

export async function insertReview(input: {
  centerId: number
  userEmail: string
  userName: string
  bookingId?: number
  rating: number
  comment?: string
}): Promise<ReviewRow> {
  const client = await db()
  const rs = await client.execute({
    sql: `INSERT INTO reviews (center_id, user_email, user_name, booking_id, rating, comment, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      input.centerId,
      input.userEmail.toLowerCase(),
      input.userName,
      input.bookingId ?? null,
      input.rating,
      input.comment ?? '',
      new Date().toISOString(),
    ],
  })
  return rs.rows[0] as unknown as ReviewRow
}

/* ---------------------------- Bookings --------------------------- */

// Inserts the booking and its per-seat-per-hour slots inside a single write
// transaction. The slot inserts are the real conflict guard: they hit the
// UNIQUE(room_id, date, seat_num, hour) constraint on booking_slots, which
// SQLite enforces even if two requests race each other — the app-level
// pre-check in the API route can still be beaten by a race, this can't.
export async function insertBooking(input: {
  userEmail: string
  centerId: string
  centerName: string
  roomId: number
  roomName: string
  date: string
  time: string
  duration: number
  seats: string
  game: string
  totalPrice: number
}): Promise<{ ok: true; booking: BookingRow } | { ok: false }> {
  const client = await db()
  const tx = await client.transaction('write')
  try {
    const rs = await tx.execute({
      sql: `INSERT INTO bookings
              (user_email, center_id, center_name, room_id, room_name, date, time, duration, seats, game, total_price, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        input.userEmail.toLowerCase(),
        input.centerId,
        input.centerName,
        input.roomId,
        input.roomName,
        input.date,
        input.time,
        input.duration,
        input.seats,
        input.game,
        input.totalPrice,
        new Date().toISOString(),
      ],
    })
    const booking = rs.rows[0] as unknown as BookingRow

    const startHour = timeToHour(input.time)
    for (const seat of parseSeats(input.seats)) {
      for (let h = startHour; h < startHour + input.duration; h++) {
        await tx.execute({
          sql: 'INSERT INTO booking_slots (booking_id, room_id, date, seat_num, hour) VALUES (?, ?, ?, ?, ?)',
          args: [booking.id, input.roomId, input.date, seat, h],
        })
      }
    }

    await tx.commit()
    return { ok: true, booking }
  } catch {
    try {
      await tx.rollback()
    } catch {
      /* transaction already aborted by the failed statement */
    }
    return { ok: false }
  } finally {
    tx.close()
  }
}

export async function listBookingsByUser(email: string): Promise<BookingRow[]> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT * FROM bookings WHERE user_email = ? ORDER BY created_at DESC',
    args: [email.toLowerCase()],
  })
  return rs.rows as unknown as BookingRow[]
}

export async function getBookingById(id: number): Promise<BookingRow | undefined> {
  const client = await db()
  const rs = await client.execute({ sql: 'SELECT * FROM bookings WHERE id = ?', args: [id] })
  return rs.rows[0] as unknown as BookingRow | undefined
}

// Marks a booking cancelled and records how much was refunded. Cancelled
// bookings are excluded from the availability queries below so the seat
// becomes bookable again.
export async function cancelBooking(id: number, refundAmount: number): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: `UPDATE bookings SET status = 'cancelled', cancelled_at = ?, refund_amount = ?
          WHERE id = ? AND status != 'cancelled'`,
    args: [new Date().toISOString(), refundAmount, id],
  })
  if (rs.rowsAffected > 0) {
    // Free the seat/hour slots this booking held, otherwise the UNIQUE
    // constraint on booking_slots would keep blocking anyone else from
    // booking them even though the booking is now cancelled.
    await client.execute({ sql: 'DELETE FROM booking_slots WHERE booking_id = ?', args: [id] })
  }
  return rs.rowsAffected > 0
}

// All bookings for a given center on a given day, across every one of its
// rooms — one query covers every room card the booking modal shows
// (client_id here matches the "db-<id>" ids used everywhere centers are
// referenced on the client, so no id-stripping is needed). Cancelled
// bookings are excluded so their seats show as free again.
export async function listBookingsByCenterAndDate(
  centerId: string,
  date: string,
): Promise<BookingRow[]> {
  const client = await db()
  const rs = await client.execute({
    sql: "SELECT * FROM bookings WHERE center_id = ? AND date = ? AND status != 'cancelled'",
    args: [centerId, date],
  })
  return rs.rows as unknown as BookingRow[]
}

// Grouped-by-room availability shape shared by the plain GET endpoint and
// the SSE stream endpoint (app/api/bookings/route.ts and
// app/api/bookings/stream/route.ts) — one query covers every room card the
// booking modal shows.
export async function getCenterAvailability(
  centerId: string,
  date: string,
): Promise<Record<string, { time: string; duration: number; seats: string }[]>> {
  const rows = await listBookingsByCenterAndDate(centerId, date)
  const byRoom: Record<string, { time: string; duration: number; seats: string }[]> = {}
  for (const r of rows) {
    const key = String(r.room_id)
    if (!byRoom[key]) byRoom[key] = []
    byRoom[key].push({ time: r.time, duration: r.duration, seats: r.seats })
  }
  return byRoom
}

// Scoped to a single room — used for the server-side seat-conflict check
// on booking creation.
export async function listBookingsByRoomAndDate(
  roomId: number,
  date: string,
): Promise<BookingRow[]> {
  const client = await db()
  const rs = await client.execute({
    sql: "SELECT * FROM bookings WHERE room_id = ? AND date = ? AND status != 'cancelled'",
    args: [roomId, date],
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

/* -------------------------- Notifications ------------------------- */

export async function insertNotification(input: {
  adminEmail: string
  type?: string
  title: string
  body?: string
  centerId?: string
  bookingId?: number
}): Promise<NotificationRow> {
  const client = await db()
  const rs = await client.execute({
    sql: `INSERT INTO notifications
            (admin_email, type, title, body, center_id, booking_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      input.adminEmail.toLowerCase(),
      input.type ?? 'booking',
      input.title,
      input.body ?? '',
      input.centerId ?? '',
      input.bookingId ?? null,
      new Date().toISOString(),
    ],
  })
  return rs.rows[0] as unknown as NotificationRow
}

export async function listNotificationsByAdmin(
  email: string,
  limit = 30,
): Promise<NotificationRow[]> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT * FROM notifications WHERE admin_email = ? ORDER BY created_at DESC LIMIT ?',
    args: [email.toLowerCase(), limit],
  })
  return rs.rows as unknown as NotificationRow[]
}

export async function countUnreadNotifications(email: string): Promise<number> {
  const client = await db()
  const rs = await client.execute({
    sql: 'SELECT COUNT(*) as n FROM notifications WHERE admin_email = ? AND read_at IS NULL',
    args: [email.toLowerCase()],
  })
  const row = rs.rows[0] as { n?: number } | undefined
  return row ? Number(row.n) || 0 : 0
}

export async function markNotificationRead(id: number, adminEmail: string): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: 'UPDATE notifications SET read_at = ? WHERE id = ? AND admin_email = ? AND read_at IS NULL',
    args: [new Date().toISOString(), id, adminEmail.toLowerCase()],
  })
  return rs.rowsAffected > 0
}

export async function markAllNotificationsRead(adminEmail: string): Promise<boolean> {
  const client = await db()
  const rs = await client.execute({
    sql: 'UPDATE notifications SET read_at = ? WHERE admin_email = ? AND read_at IS NULL',
    args: [new Date().toISOString(), adminEmail.toLowerCase()],
  })
  return rs.rowsAffected > 0
}
