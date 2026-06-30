import { createUser, getUserByEmail } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return Response.json(
        { error: 'Нэр, и-мэйл, нууц үг шаардлагатай.' },
        { status: 400 },
      )
    }
    if (String(password).length < 4) {
      return Response.json(
        { error: 'Нууц үг хамгийн багадаа 4 тэмдэгт байна.' },
        { status: 400 },
      )
    }

    if (getUserByEmail(email)) {
      return Response.json(
        { error: 'Энэ и-мэйл хаяг бүртгэлтэй байна.' },
        { status: 409 },
      )
    }

    const passwordHash = bcrypt.hashSync(String(password), 10)
    const user = createUser({ name, email, passwordHash })

    return Response.json(
      { user: { name: user.name, email: user.email } },
      { status: 201 },
    )
  } catch (err) {
    console.error('[register]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
