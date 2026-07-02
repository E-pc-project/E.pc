import {
  countUnreadNotifications,
  listNotificationsByAdmin,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get('email')
    if (!email) {
      return Response.json({ error: 'email шаардлагатай.' }, { status: 400 })
    }
    const [rows, unreadCount] = await Promise.all([
      listNotificationsByAdmin(email),
      countUnreadNotifications(email),
    ])
    const notifications = rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      centerId: n.center_id,
      bookingId: n.booking_id,
      read: Boolean(n.read_at),
      createdAt: n.created_at,
    }))
    return Response.json({ notifications, unreadCount })
  } catch (err) {
    console.error('[notifications GET]', err)
    return Response.json({ notifications: [], unreadCount: 0 }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { email, id, all } = await req.json()
    if (!email) {
      return Response.json({ error: 'email шаардлагатай.' }, { status: 400 })
    }
    if (all) {
      await markAllNotificationsRead(email)
    } else if (id) {
      await markNotificationRead(Number(id), email)
    } else {
      return Response.json({ error: 'id эсвэл all шаардлагатай.' }, { status: 400 })
    }
    const unreadCount = await countUnreadNotifications(email)
    return Response.json({ ok: true, unreadCount })
  } catch (err) {
    console.error('[notifications PATCH]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
