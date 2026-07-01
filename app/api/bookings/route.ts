import { insertBooking } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const b = await req.json()
    if (!b.userEmail || !b.centerName) {
      return Response.json({ error: 'Дутуу мэдээлэл.' }, { status: 400 })
    }
    const booking = await insertBooking({
      userEmail: b.userEmail,
      centerId: String(b.centerId ?? ''),
      centerName: b.centerName,
      date: b.date ?? '',
      time: b.time ?? '',
      duration: Number(b.duration) || 1,
      seats: Array.isArray(b.seats) ? b.seats.join(', ') : String(b.seats ?? ''),
      game: b.game ?? '',
      totalPrice: Number(b.totalPrice) || 0,
    })
    return Response.json({ id: booking.id }, { status: 201 })
  } catch (err) {
    console.error('[bookings POST]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
