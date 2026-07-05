import {
  addUserBalance,
  cancelBooking,
  deductUserBalance,
  getBookingById,
  getCenterAvailability,
  getCenterById,
  getUserBalance,
  getUserByEmail,
  insertBooking,
  insertNotification,
  listBookingsByRoomAndDate,
} from '@/lib/db'
import { computeOccupiedSeats } from '@/lib/availability'

export const dynamic = 'force-dynamic'

// Cancelling 1+ hours before the booking starts refunds the full amount;
// cancelling inside that hour still refunds most of it (80%) rather than
// nothing, since the seat is usually still freed up in time for someone
// else. Cancelling after the booking has already started isn't allowed.
const FULL_REFUND_HOURS = 1
const LATE_CANCEL_REFUND_RATE = 0.8

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
    const byRoom = await getCenterAvailability(centerId, date)
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

    const result = await insertBooking({
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

    if (!result.ok) {
      // The check above is best-effort and can be beaten by a concurrent
      // request — insertBooking's UNIQUE constraint is the real guard, and
      // it just lost. Refund the wallet charge already taken above.
      if (totalPrice > 0) await addUserBalance(b.userEmail, totalPrice)
      return Response.json(
        {
          error: 'Сонгосон PC-нүүдийн зарим нь энэ хугацаанд аль хэдийн захиалагдсан байна.',
          conflict: true,
        },
        { status: 409 },
      )
    }
    const booking = result.booking

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

// Cancels a booking and refunds the wallet according to how far out the
// booking's start time is (see FULL_REFUND_HOURS/LATE_CANCEL_REFUND_RATE
// above). Recomputed server-side — never trust a client-supplied refund.
export async function PATCH(req: Request) {
  try {
    const { id, userEmail } = await req.json()
    const bookingId = Number(id)
    if (!bookingId || !userEmail) {
      return Response.json({ error: 'id ба userEmail шаардлагатай.' }, { status: 400 })
    }

    const booking = await getBookingById(bookingId)
    if (!booking || booking.user_email !== String(userEmail).toLowerCase()) {
      return Response.json({ error: 'Захиалга олдсонгүй.' }, { status: 404 })
    }
    if (booking.status === 'cancelled') {
      return Response.json({ error: 'Захиалга аль хэдийн цуцлагдсан байна.' }, { status: 400 })
    }

    const startsAt = new Date(`${booking.date}T${booking.time}:00`)
    const hoursUntilStart = (startsAt.getTime() - Date.now()) / 3600000
    if (hoursUntilStart < 0) {
      return Response.json(
        { error: 'Захиалгын цаг эхэлсэн тул цуцлах боломжгүй.' },
        { status: 400 },
      )
    }
    const fullRefund = hoursUntilStart >= FULL_REFUND_HOURS
    const refundAmount = fullRefund
      ? booking.total_price
      : Math.round(booking.total_price * LATE_CANCEL_REFUND_RATE)

    if (refundAmount > 0) {
      await addUserBalance(booking.user_email, refundAmount)
    }
    await cancelBooking(bookingId, refundAmount)

    // Notify the center's admin. Never fail the cancellation if this breaks.
    try {
      const numId = Number(booking.center_id.replace(/^db-/, ''))
      const center = numId ? await getCenterById(numId) : undefined
      if (center) {
        const bookingUser = await getUserByEmail(booking.user_email)
        const who = bookingUser?.name || booking.user_email
        await insertNotification({
          adminEmail: center.owner_email,
          type: 'cancellation',
          title: `Захиалга цуцлагдлаа — ${center.name}`,
          body: `${who} ${booking.date} ${booking.time} цагт ${booking.room_name ? `«${booking.room_name}» өрөөнд ` : ''}хийсэн PC ${booking.seats} захиалгаа цуцаллаа (${fullRefund ? '100' : '80'}% буцаалт: ${refundAmount.toLocaleString()} ecoin).`,
          centerId: booking.center_id,
          bookingId: booking.id,
        })
      }
    } catch (notifyErr) {
      console.error('[bookings PATCH] мэдэгдэл үүсгэхэд алдаа:', notifyErr)
    }

    const balance = await getUserBalance(booking.user_email)
    return Response.json({
      ok: true,
      refundAmount,
      refundPercent: fullRefund ? 100 : 80,
      balance,
    })
  } catch (err) {
    console.error('[bookings PATCH]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
