import { getUserByEmail, updatePassword } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json()
    if (!email || !code || !newPassword) {
      return Response.json(
        { error: 'И-мэйл, код, шинэ нууц үг шаардлагатай.' },
        { status: 400 },
      )
    }
    if (String(newPassword).length < 4) {
      return Response.json(
        { error: 'Нууц үг хамгийн багадаа 4 тэмдэгт байна.' },
        { status: 400 },
      )
    }

    const user = await getUserByEmail(email)
    if (!user || !user.reset_code || user.reset_code !== String(code).trim()) {
      return Response.json({ error: 'Код буруу байна.' }, { status: 400 })
    }
    if (!user.reset_expires || new Date(user.reset_expires) < new Date()) {
      return Response.json(
        { error: 'Кодны хугацаа дууссан. Дахин код авна уу.' },
        { status: 400 },
      )
    }

    const passwordHash = bcrypt.hashSync(String(newPassword), 10)
    await updatePassword(email, passwordHash)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[reset]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
