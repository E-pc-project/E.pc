import {
  deleteCenter,
  deleteCenterById,
  getUserByEmail,
  insertCenter,
  listCenters,
  updateCenter,
  updateCenterById,
} from '@/lib/db'
import { sendCenterNotification } from '@/lib/mailer'

// Always run fresh on the server (no static caching of the centers list).
export const dynamic = 'force-dynamic'

// Alternating neon accent for community-submitted centers.
const ACCENTS = ['#00e0ff', '#ff45c8']
const ROOM_CATEGORIES = ['regular', 'vip']

interface RoomInput {
  name: string
  category: string
  seatCount: number
  pricePerHour: number
}

function parseRooms(raw: unknown): RoomInput[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (r) =>
        r && typeof r.name === 'string' && r.name.trim() && ROOM_CATEGORIES.includes(r.category) && Number(r.seatCount) > 0,
    )
    .map((r) => ({
      name: r.name.trim(),
      category: r.category,
      seatCount: Number(r.seatCount) || 0,
      pricePerHour: Number(r.pricePerHour) || 0,
    }))
}

export async function GET() {
  try {
    const rows = await listCenters()
    const centers = rows.map((c, i) => ({
      id: `db-${c.id}`,
      name: c.name,
      district: c.district,
      location: c.location,
      phone: c.phone,
      totalSeats: c.total_seats,
      priceFrom: c.price_from || 0,
      hasVip: Boolean(c.has_vip),
      specs: c.specs,
      ownerName: c.owner_name,
      createdAt: c.created_at,
      color: ACCENTS[i % ACCENTS.length],
      openTime: c.open_time,
      closeTime: c.close_time,
      photo: c.photo,
      rating: Math.round((c.avg_rating || 0) * 10) / 10,
      reviewCount: c.review_count || 0,
    }))
    return Response.json({ centers })
  } catch (err) {
    console.error('[centers GET]', err)
    return Response.json({ centers: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      ownerName,
      ownerEmail,
      name,
      phone,
      specs,
      location,
      district,
      notes,
      openTime,
      closeTime,
      photo,
      rooms,
    } = body

    if (!ownerEmail) {
      return Response.json({ error: 'Эхлээд нэвтэрнэ үү.' }, { status: 401 })
    }
    // Only admins may add centers.
    const owner = await getUserByEmail(ownerEmail)
    if (!owner || !owner.is_admin) {
      return Response.json(
        { error: 'Зөвхөн админ эрхтэй хэрэглэгч төв нэмэх боломжтой.' },
        { status: 403 },
      )
    }
    const parsedRooms = parseRooms(rooms)
    if (!name || !phone || !location) {
      return Response.json(
        { error: 'Төвийн нэр, утас, байршил заавал шаардлагатай.' },
        { status: 400 },
      )
    }
    if (parsedRooms.length === 0) {
      return Response.json(
        { error: 'Дор хаяж нэг өрөө (суудлын тоо, үнэтэй) нэмнэ үү.' },
        { status: 400 },
      )
    }

    const center = await insertCenter({
      ownerEmail,
      ownerName: ownerName || ownerEmail,
      name,
      phone,
      specs: specs || '',
      location,
      district: district || '',
      notes: notes || '',
      openTime: openTime || '',
      closeTime: closeTime || '',
      photo: photo || '',
      rooms: parsedRooms,
    })

    // Forward to the project inbox. Never fail the request if email is down.
    let emailed = false
    try {
      emailed = await sendCenterNotification({
        ownerName: center.owner_name,
        ownerEmail: center.owner_email,
        name: center.name,
        phone: center.phone,
        pcCount: center.pc_count,
        specs: center.specs,
        location: center.location,
        district: center.district,
        pricePerHour: center.price_per_hour,
        notes: center.notes,
      })
    } catch (mailErr) {
      console.error('[centers POST] имэйл илгээхэд алдаа:', mailErr)
    }

    return Response.json({ id: center.id, emailed }, { status: 201 })
  } catch (err) {
    console.error('[centers POST]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const params = new URL(req.url).searchParams
    const rawId = params.get('id') || ''
    const email = params.get('email') || ''
    // Client ids look like "db-4" — strip the prefix to the numeric row id.
    const id = Number(rawId.replace(/^db-/, ''))
    if (!id || !email) {
      return Response.json({ error: 'id ба email шаардлагатай.' }, { status: 400 })
    }
    // Developers may delete any center; admins only their own.
    const requester = await getUserByEmail(email)
    const ok = requester?.is_dev
      ? await deleteCenterById(id)
      : await deleteCenter(id, email)
    if (!ok) {
      return Response.json(
        { error: 'Устгах эрхгүй эсвэл олдсонгүй.' },
        { status: 403 },
      )
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[centers DELETE]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, ownerEmail, name, phone, specs, location, district, openTime, closeTime, photo } = body
    const numId = Number(String(id ?? '').replace(/^db-/, ''))
    if (!numId || !ownerEmail) {
      return Response.json({ error: 'id ба ownerEmail шаардлагатай.' }, { status: 400 })
    }
    if (!name || !phone || !location) {
      return Response.json(
        { error: 'Төвийн нэр, утас, байршил заавал шаардлагатай.' },
        { status: 400 },
      )
    }
    const fields = {
      name,
      phone,
      specs: specs || '',
      location,
      district: district || '',
      openTime: openTime || '',
      closeTime: closeTime || '',
      photo: photo || '',
    }
    // Developers may edit any center; admins only their own.
    const requester = await getUserByEmail(ownerEmail)
    const ok = requester?.is_dev
      ? await updateCenterById(numId, fields)
      : await updateCenter(numId, ownerEmail, fields)
    if (!ok) {
      return Response.json({ error: 'Засах эрхгүй эсвэл олдсонгүй.' }, { status: 403 })
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[centers PATCH]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
