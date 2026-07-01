import { deleteUserAccount, getUserByEmail } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return Response.json(
        { error: 'И-мэйл, нууц үг шаардлагатай.' },
        { status: 400 },
      )
    }

    const user = await getUserByEmail(email)
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return Response.json({ error: 'Нууц үг буруу байна.' }, { status: 401 })
    }

    await deleteUserAccount(email)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[account/delete]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
