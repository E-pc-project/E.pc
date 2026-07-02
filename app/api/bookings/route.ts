import { deductUserBalance, getUserBalance, insertBooking } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const b = await req.json()
    if (!b.userEmail || !b.centerName) {
      return Response.json({ error: 'Дутуу мэдээлэл.' }, { status: 400 })
    }

    const totalPrice = Number(b.totalPrice) || 0

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
      centerId: String(b.centerId ?? ''),
      centerName: b.centerName,
      date: b.date ?? '',
      time: b.time ?? '',
      duration: Number(b.duration) || 1,
      seats: Array.isArray(b.seats) ? b.seats.join(', ') : String(b.seats ?? ''),
      game: b.game ?? '',
      totalPrice,
    })

    const balance = await getUserBalance(b.userEmail)
    return Response.json({ id: booking.id, balance }, { status: 201 })
  } catch (err) {
    console.error('[bookings POST]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
