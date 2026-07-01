# E.PC — eSports Center Platform

Улаанбаатарын PC gaming төвүүдийг хайх, захиалах, өөрийн төвөө бүртгүүлэх веб платформ.
Next.js 16 + React 19 + SQLite.

## Онцлог

- 🔐 **Нэвтрэлт** — хэрэглэгч бүр заавал бүртгүүлж/нэвтэрч орно. Нууц үг `bcrypt`-ээр шифрлэгдэж **SQLite database**-д хадгалагдана.
- 🖥️ **Өөрийн gaming төв нэмэх** — нэвтэрсэн хэрэглэгч өөрийн төвөө (нэр, **байршил**, **утас**, **PC тоо**, **үзүүлэлт**) бүртгүүлнэ.
- 📧 **Автомат имэйл** — бүртгүүлсэн төвийн мэдээлэл `e.pc.project001@gmail.com` хаягруу автоматаар илгээгдэнэ.
- 🪑 **Суудал сонголт** — гялалзсан дэлгэц, эгнээний шошго, гарцтай, neon өнгийн PC сонголт.
- 🎨 **Загвар** — хар / саарал суурь, neon цэнхэр + ягаан өнгө.

## Суулгах & ажиллуулах

```bash
npm install
npm run dev
```

Дараа нь хөтөч дээр **http://localhost:3000** руу ор. (Dev үед өөр порт зааж өгч болно: `npm run dev -- -p 3001`)

## Имэйл тохируулах (заавал биш)

Имэйл тохируулаагүй ч апп ажиллана — мэдээлэл database-д хадгалагдсаар байна, зөвхөн имэйл явахгүй.
Имэйл идэвхжүүлэхийн тулд:

1. `.env.local.example` файлыг хуулж нэрийг нь **`.env.local`** болго.
2. Gmail дээр (e.pc.project001@gmail.com):
   - **2-Step Verification** асаа.
   - https://myaccount.google.com/apppasswords → **App Password** үүсгэ.
   - Гарсан 16 оронтой кодыг `.env.local` доторх `SMTP_PASS`-д тавь.
3. Dev серверээ дахин асаа (`npm run dev`).

```env
MAIL_TO=e.pc.project001@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=e.pc.project001@gmail.com
SMTP_PASS=your-16-char-app-password
```

## Database (libSQL / Turso)

Апп `@libsql/client` ашиглана:
- **Локал:** `TURSO_*` env хоосон бол `node_modules/.epc-data/epc.db` SQLite файлыг ашиглана (юу ч тохируулах шаардлагагүй).
- **Vercel:** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` тохируулбал Turso (serverless-safe) руу холбогдоно.

Хүснэгтүүд эхний хүсэлт дээр автоматаар үүснэ (`CREATE TABLE IF NOT EXISTS`):
- `users` — id, name, email (unique), password_hash, created_at
- `centers` — id, owner_email, owner_name, name, phone, pc_count, specs, location, district, price_per_hour, notes, status, created_at

## Vercel дээр deploy хийх

1. **Turso database үүсгэх** — https://turso.tech дээр бүртгүүлж DB үүсгэ, `TURSO_DATABASE_URL` ба `TURSO_AUTH_TOKEN`-оо ав.
2. **GitHub** — энэ төслийг GitHub repo болгож push хий.
3. **Vercel** — https://vercel.com → *Add New → Project* → GitHub repo-гоо сонго.
4. **Environment Variables** (Vercel → Settings) дотор оруул:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (заавал)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO` (имэйл идэвхжүүлэх бол)
5. **Deploy** дар. Хүснэгтүүд анхны хүсэлт дээр Turso дээр автоматаар үүснэ.

## API

| Method | Зам | Үүрэг |
|--------|-----|-------|
| POST | `/api/auth/register` | Бүртгүүлэх |
| POST | `/api/auth/login` | Нэвтрэх |
| POST | `/api/centers` | Шинэ төв нэмэх (+ имэйл илгээх) |
| GET  | `/api/centers` | Бүртгүүлсэн төвүүдийн жагсаалт |

## API

| Method | Зам | Үүрэг |
|--------|-----|-------|
| POST | `/api/auth/register` | Бүртгүүлэх |
| POST | `/api/auth/login` | Нэвтрэх |
| POST | `/api/centers` | Шинэ төв нэмэх (+ имэйл илгээх) |
| GET  | `/api/centers` | Бүртгүүлсэн төвүүдийн жагсаалт |
