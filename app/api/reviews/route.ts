import { insertReview } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { centerId: rawCenterId, userEmail, userName, bookingId, rating, comment } = body

    if (!userEmail) {
      return Response.json({ error: 'Эхлээд нэвтэрнэ үү.' }, { status: 401 })
    }
    const centerId = Number(String(rawCenterId ?? '').replace(/^db-/, ''))
    const ratingNum = Number(rating)
    if (!centerId || !ratingNum || ratingNum < 1 || ratingNum > 5) {
      return Response.json(
        { error: 'Төв болон 1-5 хоорондох үнэлгээ шаардлагатай.' },
        { status: 400 },
      )
    }

    const review = await insertReview({
      centerId,
      userEmail,
      userName: userName || userEmail,
      bookingId: bookingId ? Number(bookingId) : undefined,
      rating: ratingNum,
      comment: comment || '',
    })

    return Response.json({ id: review.id }, { status: 201 })
  } catch (err) {
    console.error('[reviews POST]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
