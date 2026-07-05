import { getUserByPhone, setPhoneOtp } from '@/lib/db'
import { isValidMnPhone, normalizePhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { phone } = await req.json()
    const digits = normalizePhone(String(phone ?? ''))
    if (!isValidMnPhone(digits)) {
      return Response.json(
        { error: 'Утасны дугаар буруу байна (8 оронтой байх ёстой).' },
        { status: 400 },
      )
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    await setPhoneOtp(digits, code, expires)
    const exists = Boolean(await getUserByPhone(digits))

    // DEMO mode: no real SMS gateway is configured for this project, so the
    // code is returned directly to the client instead of being sent by SMS
    // (same "demo now, real gateway later" shape as the QPay/MonPay wallet
    // top-up and the registry-number age check).
    console.log(`[otp] ${digits} → ${code} (демо горим, 5 мин хүчинтэй)`)
    return Response.json({ ok: true, demoCode: code, exists })
  } catch (err) {
    console.error('[otp request]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
