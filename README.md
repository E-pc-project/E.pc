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

## Database

SQLite файл нь `node_modules/.epc-data/epc.db` дотор хадгалагдана (Next.js dev watcher-аас гадуур
байрлуулсан тул бичих болгонд хуудас reload хийгдэхгүй). Өөр байршил зааж өгөх бол `EPC_DATA_DIR`
орчны хувьсагчийг ашигла.

Хүснэгтүүд:
- `users` — id, name, email (unique), password_hash, created_at
- `centers` — id, owner_email, owner_name, name, phone, pc_count, specs, location, district, price_per_hour, notes, status, created_at

## API

| Method | Зам | Үүрэг |
|--------|-----|-------|
| POST | `/api/auth/register` | Бүртгүүлэх |
| POST | `/api/auth/login` | Нэвтрэх |
| POST | `/api/centers` | Шинэ төв нэмэх (+ имэйл илгээх) |
| GET  | `/api/centers` | Бүртгүүлсэн төвүүдийн жагсаалт |
