// Pure phone-number helpers shared by the client (auth-modal) and server
// (OTP API routes) — same normalization/validation on both sides so the
// client can give instant feedback before ever hitting the network.

/** Strips a leading +976 country code and any non-digit characters. */
export function normalizePhone(raw: string): string {
  return raw.trim().replace(/^\+?976/, '').replace(/\D/g, '')
}

/** Mongolian mobile numbers are 8 digits. */
export function isValidMnPhone(raw: string): boolean {
  return /^\d{8}$/.test(normalizePhone(raw))
}
