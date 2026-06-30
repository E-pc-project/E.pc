// Server-only email helper. Sends submitted gaming-center info to the project inbox.
import 'server-only'
import nodemailer from 'nodemailer'

// The project inbox every submission is forwarded to.
export const PROJECT_INBOX = process.env.MAIL_TO || 'e.pc.project001@gmail.com'

export interface CenterEmailData {
  ownerName: string
  ownerEmail: string
  name: string
  phone: string
  pcCount: number
  specs: string
  location: string
  district?: string
  pricePerHour?: number
  notes?: string
}

function getTransport() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  const port = Number(process.env.SMTP_PORT || 465)
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user, pass },
  })
}

function buildHtml(d: CenterEmailData): string {
  const row = (label: string, value: string | number) => `
    <tr>
      <td style="padding:8px 14px;color:#9aa;border-bottom:1px solid #222;font:13px system-ui">${label}</td>
      <td style="padding:8px 14px;color:#eee;border-bottom:1px solid #222;font:600 13px system-ui">${value}</td>
    </tr>`
  return `
  <div style="background:#0b0b0f;padding:24px;font-family:system-ui">
    <div style="max-width:560px;margin:auto;background:#16161c;border:1px solid #2a2a32;border-radius:14px;overflow:hidden">
      <div style="height:3px;background:linear-gradient(90deg,#00e0ff,#ff45c8)"></div>
      <div style="padding:20px 22px">
        <h2 style="margin:0 0 4px;color:#00e0ff;font:800 18px system-ui;letter-spacing:2px">E.PC — ШИНЭ GAMING ТӨВ</h2>
        <p style="margin:0 0 16px;color:#888;font:13px system-ui">Шинэ PC gaming center бүртгүүлэх хүсэлт ирлээ.</p>
        <table style="width:100%;border-collapse:collapse;background:#0e0e13;border-radius:10px;overflow:hidden">
          ${row('Төвийн нэр', d.name)}
          ${row('Байршил', d.location)}
          ${d.district ? row('Дүүрэг', d.district) : ''}
          ${row('Утас', d.phone)}
          ${row('PC тоо', d.pcCount)}
          ${row('Үзүүлэлт', d.specs || '—')}
          ${d.pricePerHour ? row('Цагийн үнэ', '₮' + d.pricePerHour.toLocaleString()) : ''}
          ${d.notes ? row('Тэмдэглэл', d.notes) : ''}
          ${row('Илгээсэн', d.ownerName + ' · ' + d.ownerEmail)}
        </table>
      </div>
    </div>
  </div>`
}

function buildText(d: CenterEmailData): string {
  return [
    'E.PC — Шинэ gaming төв бүртгүүлэх хүсэлт',
    '',
    `Төвийн нэр: ${d.name}`,
    `Байршил: ${d.location}`,
    d.district ? `Дүүрэг: ${d.district}` : '',
    `Утас: ${d.phone}`,
    `PC тоо: ${d.pcCount}`,
    `Үзүүлэлт: ${d.specs || '—'}`,
    d.pricePerHour ? `Цагийн үнэ: ₮${d.pricePerHour.toLocaleString()}` : '',
    d.notes ? `Тэмдэглэл: ${d.notes}` : '',
    `Илгээсэн: ${d.ownerName} (${d.ownerEmail})`,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Sends the submitted center info to the project inbox.
 * Returns true if an email was actually dispatched, false if SMTP isn't configured.
 */
export async function sendCenterNotification(d: CenterEmailData): Promise<boolean> {
  const transport = getTransport()
  if (!transport) {
    console.warn(
      '[mailer] SMTP тохируулаагүй тул имэйл илгээгүй. .env.local дотор SMTP_* утгуудыг оруулна уу.',
    )
    return false
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM || `E.PC Platform <${process.env.SMTP_USER}>`,
    to: PROJECT_INBOX,
    replyTo: d.ownerEmail,
    subject: `🎮 Шинэ gaming төв: ${d.name} (${d.district || d.location})`,
    text: buildText(d),
    html: buildHtml(d),
  })
  return true
}
