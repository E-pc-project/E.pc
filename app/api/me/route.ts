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
      pcCount: c.pc_count,
      pricePerHour: c.price_per_hour,
      specs: c.specs,
      createdAt: c.created_at,
      color: ACCENTS[i % ACCENTS.length],
      vipSeats: c.vip_seats ? c.vip_seats.split(',').map(Number).filter(Boolean) : [],
      vipPricePerHour: c.vip_price_per_hour || 0,
    }))

    const bookings = bookingRows.map((b) => ({
      id: b.id,
      centerName: b.center_name,
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
