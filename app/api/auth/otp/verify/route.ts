import { clearPhoneOtp, createUserWithPhone, getPhoneOtp, getUserByPhone } from '@/lib/db'
import { isValidMnPhone, normalizePhone } from '@/lib/phone'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { phone, code, name } = await req.json()
    const digits = normalizePhone(String(phone ?? ''))
    if (!isValidMnPhone(digits)) {
      return Response.json({ error: 'Утасны дугаар буруу байна.' }, { status: 400 })
    }
    if (!code) {
      return Response.json({ error: 'Код шаардлагатай.' }, { status: 400 })
    }

    const otp = await getPhoneOtp(digits)
    if (!otp || otp.code !== String(code).trim() || new Date(otp.expires_at) < new Date()) {
      return Response.json({ error: 'Код буруу эсвэл хугацаа дууссан байна.' }, { status: 400 })
    }

    // Only consume the OTP once we're actually going to complete sign-in —
    // a new-user request missing a name should still let the same code be
    // retried with the name filled in, not burn it on a validation error.
    let user = await getUserByPhone(digits)
    if (!user) {
      const trimmedName = String(name ?? '').trim()
      if (!trimmedName) {
        return Response.json(
          { error: 'Шинэ хэрэглэгчийн нэрээ оруулна уу.', newUser: true },
          { status: 400 },
        )
      }
      // No password login exists for phone accounts — this hash is random
      // and never entered anywhere, just satisfying the NOT NULL column.
      const passwordHash = bcrypt.hashSync(crypto.randomUUID(), 10)
      user = await createUserWithPhone({ name: trimmedName, phone: digits, passwordHash })
    }
    await clearPhoneOtp(digits)

    return Response.json({
      user: {
        name: user.name,
        email: user.email,
        isAdmin: Boolean(user.is_admin),
        isDev: Boolean(user.is_dev),
      },
    })
  } catch (err) {
    console.error('[otp verify]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
