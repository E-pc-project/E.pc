import {
  deductUserBalance,
  getCenterById,
  getUserBalance,
  getUserByEmail,
  insertBooking,
  insertNotification,
  listBookingsByCenterAndDate,
  listBookingsByRoomAndDate,
} from '@/lib/db'
import { computeOccupiedSeats } from '@/lib/availability'

export const dynamic = 'force-dynamic'

// Live seat availability for a center on a given day, grouped by room —
// one request covers every room card the booking modal shows. Deliberately
// returns only time/duration/seats (never user_email/game/total_price) so
// any browsing user can check availability without seeing who booked what.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams
    const centerId = params.get('centerId') || ''
    const date = params.get('date') || ''
    if (!centerId || !date) {
      return Response.json({ byRoom: {} })
    }
    const rows = await listBookingsByCenterAndDate(centerId, date)
    const byRoom: Record<string, { time: string; duration: number; seats: string }[]> = {}
    for (const r of rows) {
      const key = String(r.room_id)
      if (!byRoom[key]) byRoom[key] = []
      byRoom[key].push({ time: r.time, duration: r.duration, seats: r.seats })
    }
    return Response.json({ byRoom })
  } catch (err) {
    console.error('[bookings GET]', err)
    return Response.json({ byRoom: {} }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json()
    if (!b.userEmail || !b.centerName || !b.roomId) {
      return Response.json({ error: 'Дутуу мэдээлэл.' }, { status: 400 })
    }

    const totalPrice = Number(b.totalPrice) || 0
    const centerId = String(b.centerId ?? '')
    const roomId = Number(b.roomId) || 0
    const roomName = String(b.roomName ?? '')
    const date = b.date ?? ''
    const time = b.time ?? ''
    const duration = Number(b.duration) || 1
    const requestedSeats: number[] = Array.isArray(b.seats) ? b.seats.map(Number) : []

    // Reject if any requested seat in this room is already booked for an
    // overlapping time — otherwise the live seat map would be cosmetic and
    // two users could race to double-book the same PC.
    if (roomId && date && requestedSeats.length > 0) {
      const existing = await listBookingsByRoomAndDate(roomId, date)
      const occupied = computeOccupiedSeats(existing, time, duration)
      const conflict = requestedSeats.some((s) => occupied.has(s))
      if (conflict) {
        return Response.json(
          {
            error: 'Сонгосон PC-нүүдийн зарим нь энэ хугацаанд аль хэдийн захиалагдсан байна.',
            conflict: true,
          },
          { status: 409 },
        )
      }
    }

    // Charge the booking to the user's ecoin wallet first — atomic, so two
    // simultaneous bookings can't both succeed against the same balance.
    if (totalPrice > 0) {
      const paid = await deductUserBalance(b.userEmail, totalPrice)
      if (!paid) {
        const balance = await getUserBalance(b.userEmail)
        return Response.json(
          {
            error: 'Ecoin үлдэгдэл хүрэлцэхгүй байна. Хэтэвчээ цэнэглэнэ үү.',
            balance,
            required: totalPrice,
          },
          { status: 402 },
        )
      }
    }

    const booking = await insertBooking({
      userEmail: b.userEmail,
      centerId,
      centerName: b.centerName,
      roomId,
      roomName,
      date,
      time,
      duration,
      seats: Array.isArray(b.seats) ? b.seats.join(', ') : String(b.seats ?? ''),
      game: b.game ?? '',
      totalPrice,
    })

    // Notify the center's admin. Never fail the booking if this breaks.
    try {
      const numId = Number(centerId.replace(/^db-/, ''))
      const center = numId ? await getCenterById(numId) : undefined
      if (center) {
        const bookingUser = await getUserByEmail(b.userEmail)
        const who = bookingUser?.name || b.userEmail
        await insertNotification({
          adminEmail: center.owner_email,
          type: 'booking',
          title: `Шинэ захиалга — ${center.name}`,
          body: `${who} ${date} ${time} цагт ${roomName ? `«${roomName}» өрөөнд ` : ''}PC ${booking.seats} (${duration}ц) захиаллаа. Нийт: ${totalPrice.toLocaleString()} ecoin.`,
          centerId,
          bookingId: booking.id,
        })
      }
    } catch (notifyErr) {
      console.error('[bookings POST] мэдэгдэл үүсгэхэд алдаа:', notifyErr)
    }

    const balance = await getUserBalance(b.userEmail)
    return Response.json({ id: booking.id, balance }, { status: 201 })
  } catch (err) {
    console.error('[bookings POST]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
