import { addUserBalance, getUserByEmail } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Fixed top-up packages (in ₮ = ecoin, 1:1).
const ALLOWED_AMOUNTS = [10000, 20000, 50000, 100000]
const METHODS = ['qpay', 'monpay'] as const

export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get('email')
    if (!email) {
      return Response.json({ error: 'email шаардлагатай.' }, { status: 400 })
    }
    const user = await getUserByEmail(email)
    if (!user) {
      return Response.json({ error: 'Хэрэглэгч олдсонгүй.' }, { status: 404 })
    }
    return Response.json({ balance: Number(user.balance) || 0 })
  } catch (err) {
    console.error('[wallet GET]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { email, amount, method } = await req.json()

    if (!email) {
      return Response.json({ error: 'Эхлээд нэвтэрнэ үү.' }, { status: 401 })
    }
    const user = await getUserByEmail(email)
    if (!user) {
      return Response.json({ error: 'Хэрэглэгч олдсонгүй.' }, { status: 404 })
    }
    const amt = Number(amount)
    if (!ALLOWED_AMOUNTS.includes(amt)) {
      return Response.json({ error: 'Цэнэглэх дүн буруу байна.' }, { status: 400 })
    }
    if (!METHODS.includes(method)) {
      return Response.json({ error: 'Төлбөрийн хэрэгсэл буруу байна.' }, { status: 400 })
    }

    // DEMO mode: the payment is treated as instantly successful.
    // Real QPay/MonPay integration would create an invoice here and
    // credit the balance only from their payment webhook/callback.
    const balance = await addUserBalance(email, amt)

    return Response.json({ ok: true, balance, method, amount: amt })
  } catch (err) {
    console.error('[wallet POST]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
