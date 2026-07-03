import { ageFromRegNumber } from '@/lib/emongolia'

export const dynamic = 'force-dynamic'

const MIN_AGE = 18

// DEMO: a real integration would redirect to E-Mongolia's OAuth consent
// screen and get the verified birth date back via callback — same "demo
// now, real gateway later" shape as the QPay/MonPay wallet top-up. The age
// check runs here (not just in the client) so it can't be bypassed by
// editing client-side state.
export async function POST(req: Request) {
  try {
    const { regNumber } = await req.json()
    if (!regNumber || typeof regNumber !== 'string') {
      return Response.json({ error: 'Регистрийн дугаар шаардлагатай.' }, { status: 400 })
    }
    const age = ageFromRegNumber(regNumber)
    if (age === null) {
      return Response.json(
        { error: 'Регистрийн дугаар буруу байна. Жишээ: УБ05212233' },
        { status: 400 },
      )
    }
    if (age < MIN_AGE) {
      return Response.json(
        { error: `Уучлаарай — энэ захиалгыг зөвхөн ${MIN_AGE} нас хүрсэн хэрэглэгч хийх боломжтой.` },
        { status: 403 },
      )
    }
    return Response.json({ ok: true, age })
  } catch (err) {
    console.error('[emongolia/verify POST]', err)
    return Response.json({ error: 'E-Mongolia үйлчилгээтэй холбогдоход алдаа гарлаа.' }, { status: 500 })
  }
}
