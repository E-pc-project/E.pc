import { createUser, getUserByEmail } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Anyone who supplies this code at registration becomes an admin (can add/manage own centers).
const ADMIN_CODE = process.env.ADMIN_CODE || 'EPC-ADMIN-2026'
// The developer code grants super-admin: manage ALL centers (any owner).
const DEV_CODE = process.env.DEV_CODE || 'EPC-DEV-2026'

export async function POST(req: Request) {
  try {
    const { name, email, password, adminCode } = await req.json()

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

    // If a code was entered, it must match the admin OR developer code; otherwise reject.
    let isAdmin = false
    let isDev = false
    if (adminCode) {
      const code = String(adminCode).trim()
      if (code === DEV_CODE) {
        isDev = true
        isAdmin = true // developers can do everything admins can, and more
      } else if (code === ADMIN_CODE) {
        isAdmin = true
      } else {
        return Response.json({ error: 'Код буруу байна.' }, { status: 400 })
      }
    }

    if (await getUserByEmail(email)) {
      return Response.json(
        { error: 'Энэ и-мэйл хаяг бүртгэлтэй байна.' },
        { status: 409 },
      )
    }

    const passwordHash = bcrypt.hashSync(String(password), 10)
    const user = await createUser({ name, email, passwordHash, isAdmin, isDev })

    return Response.json(
      { user: { name: user.name, email: user.email, isAdmin, isDev } },
      { status: 201 },
    )
  } catch (err) {
    console.error('[register]', err)
    return Response.json({ error: 'Серверийн алдаа гарлаа.' }, { status: 500 })
  }
}
