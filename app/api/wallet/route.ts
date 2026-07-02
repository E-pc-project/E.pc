import { addUserBalance, getUserByEmail } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Fixed top-up packages (in ₮ = ecoin, 1:1).
const ALLOWED_AMOUNTS = [10000, 20000, 50000, 100000]
const METHODS = ['qpay', 'monpay'] as const

// Explicit no-store headers so no CDN/edge layer between the client and the
// database can ever serve a stale balance.
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, must-revalidate' }

export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get('email')
    if (!email) {
      return Response.json({ error: 'email шаардлагатай.' }, { status: 400, headers: NO_STORE_HEADERS })
    }
    const user = await getUserByEmail(email)
    if (!user) {
      return Response.json({ error: 'Хэрэглэгч олдсонгүй.' }, { status: 404, headers: NO_STORE_HEADERS })
    }
    return Response.json({ balance: Number(user.balance) || 0 }, { headers: NO_STORE_HEADERS })
  } catch (err) {
    console.error('[wallet GET]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500, headers: NO_STORE_HEADERS })
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
