import {
  deleteRoom,
  getCenterById,
  getRoomById,
  getUserByEmail,
  insertRoom,
  listRoomsByCenter,
  updateRoom,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['regular', 'vip']

function toRoomDto(r: { id: number; name: string; category: string; seat_count: number; price_per_hour: number }) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    seatCount: r.seat_count,
    pricePerHour: r.price_per_hour,
  }
}

export async function GET(req: Request) {
  try {
    const rawCenterId = new URL(req.url).searchParams.get('centerId') || ''
    const centerId = Number(rawCenterId.replace(/^db-/, ''))
    if (!centerId) {
      return Response.json({ rooms: [] })
    }
    const rows = await listRoomsByCenter(centerId)
    return Response.json({ rooms: rows.map(toRoomDto) })
  } catch (err) {
    console.error('[rooms GET]', err)
    return Response.json({ rooms: [] }, { status: 500 })
  }
}

// Only the center's owner (or a dev) may add/edit/delete its rooms.
async function canManageCenter(centerId: number, requesterEmail: string): Promise<boolean> {
  const [center, requester] = await Promise.all([
    getCenterById(centerId),
    getUserByEmail(requesterEmail),
  ])
  if (!center || !requester) return false
  return Boolean(requester.is_dev) || center.owner_email === requesterEmail.toLowerCase()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { centerId: rawCenterId, ownerEmail, name, category, seatCount, pricePerHour } = body
    if (!ownerEmail) {
      return Response.json({ error: 'Эхлээд нэвтэрнэ үү.' }, { status: 401 })
    }
    const centerId = Number(String(rawCenterId ?? '').replace(/^db-/, ''))
    if (!centerId || !name || !CATEGORIES.includes(category) || !seatCount) {
      return Response.json(
        { error: 'Өрөөний нэр, ангилал, суудлын тоо заавал шаардлагатай.' },
        { status: 400 },
      )
    }
    if (!(await canManageCenter(centerId, ownerEmail))) {
      return Response.json({ error: 'Энэ төвийн өрөөг удирдах эрхгүй байна.' }, { status: 403 })
    }
    const room = await insertRoom({
      centerId,
      name,
      category,
      seatCount: Number(seatCount) || 0,
      pricePerHour: Number(pricePerHour) || 0,
    })
    return Response.json({ room: toRoomDto(room) }, { status: 201 })
  } catch (err) {
    console.error('[rooms POST]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, ownerEmail, name, category, seatCount, pricePerHour } = body
    if (!ownerEmail) {
      return Response.json({ error: 'Эхлээд нэвтэрнэ үү.' }, { status: 401 })
    }
    const roomId = Number(id)
    if (!roomId || !name || !CATEGORIES.includes(category) || !seatCount) {
      return Response.json(
        { error: 'Өрөөний нэр, ангилал, суудлын тоо заавал шаардлагатай.' },
        { status: 400 },
      )
    }
    const existing = await getRoomById(roomId)
    if (!existing) {
      return Response.json({ error: 'Өрөө олдсонгүй.' }, { status: 404 })
    }
    if (!(await canManageCenter(existing.center_id, ownerEmail))) {
      return Response.json({ error: 'Энэ өрөөг удирдах эрхгүй байна.' }, { status: 403 })
    }
    const ok = await updateRoom(roomId, {
      name,
      category,
      seatCount: Number(seatCount) || 0,
      pricePerHour: Number(pricePerHour) || 0,
    })
    if (!ok) {
      return Response.json({ error: 'Засахад алдаа гарлаа.' }, { status: 500 })
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[rooms PATCH]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const params = new URL(req.url).searchParams
    const roomId = Number(params.get('id') || '')
    const email = params.get('email') || ''
    if (!roomId || !email) {
      return Response.json({ error: 'id ба email шаардлагатай.' }, { status: 400 })
    }
    const existing = await getRoomById(roomId)
    if (!existing) {
      return Response.json({ error: 'Өрөө олдсонгүй.' }, { status: 404 })
    }
    if (!(await canManageCenter(existing.center_id, email))) {
      return Response.json({ error: 'Энэ өрөөг устгах эрхгүй байна.' }, { status: 403 })
    }
    await deleteRoom(roomId)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[rooms DELETE]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
