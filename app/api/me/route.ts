import { listBookingsByUser, listCentersByOwner } from '@/lib/db'

export const dynamic = 'force-dynamic'

const ACCENTS = ['#00e0ff', '#ff45c8']

export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get('email')
    if (!email) {
      return Response.json({ error: 'email шаардлагатай.' }, { status: 400 })
    }

    const [centerRows, bookingRows] = await Promise.all([
      listCentersByOwner(email),
      listBookingsByUser(email),
    ])

    const centers = centerRows.map((c, i) => ({
      id: c.id,
      name: c.name,
      district: c.district,
      location: c.location,
      phone: c.phone,
      totalSeats: c.total_seats,
      priceFrom: c.price_from || 0,
      hasVip: Boolean(c.has_vip),
      specs: c.specs,
      createdAt: c.created_at,
      color: ACCENTS[i % ACCENTS.length],
      openTime: c.open_time,
      closeTime: c.close_time,
      photo: c.photo,
    }))

    const bookings = bookingRows.map((b) => ({
      id: b.id,
      centerName: b.center_name,
      roomName: b.room_name,
      date: b.date,
      time: b.time,
      duration: b.duration,
      seats: b.seats,
      game: b.game,
      totalPrice: b.total_price,
      createdAt: b.created_at,
    }))

    return Response.json({ centers, bookings })
  } catch (err) {
    console.error('[me GET]', err)
    return Response.json({ centers: [], bookings: [] }, { status: 500 })
  }
}
