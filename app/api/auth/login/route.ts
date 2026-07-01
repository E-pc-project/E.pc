import { getUserByEmail } from '@/lib/db'
import bcrypt from 'bcryptjs'

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
      return Response.json(
        { error: 'И-мэйл эсвэл нууц үг буруу байна.' },
        { status: 401 },
      )
    }

    return Response.json({ user: { name: user.name, email: user.email } })
  } catch (err) {
    console.error('[login]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
