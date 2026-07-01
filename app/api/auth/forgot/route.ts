import { getUserByEmail, setResetCode } from '@/lib/db'
import { sendResetCode } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return Response.json({ error: 'И-мэйл шаардлагатай.' }, { status: 400 })
    }

    const user = await getUserByEmail(email)
    if (!user) {
      return Response.json({ error: 'Энэ и-мэйлээр бүртгэл олдсонгүй.' }, { status: 404 })
    }

    // Random 6-digit code, valid for 15 minutes.
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    await setResetCode(user.email, code, expires)

    let emailed = false
    try {
      emailed = await sendResetCode(user.email, code)
    } catch (mailErr) {
      console.error('[forgot] имэйл илгээхэд алдаа:', mailErr)
    }

    return Response.json({ ok: true, emailed })
  } catch (err) {
    console.error('[forgot]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
