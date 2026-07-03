// Mongolian registry numbers encode the birth date: АА-YYMMDD-XX, where
// births in 2000+ store the month as month+20 (e.g. 0521.. = 2005-01-..).
export function ageFromRegNumber(reg: string): number | null {
  const m = reg.trim().toUpperCase().match(/^[А-ЯЁӨҮ]{2}(\d{2})(\d{2})(\d{2})\d{2}$/)
  if (!m) return null
  const yy = Number(m[1])
  let mm = Number(m[2])
  const dd = Number(m[3])
  let year: number
  if (mm >= 21 && mm <= 32) {
    year = 2000 + yy
    mm -= 20
  } else if (mm >= 1 && mm <= 12) {
    year = 1900 + yy
  } else {
    return null
  }
  if (dd < 1 || dd > 31) return null
  const birth = new Date(year, mm - 1, dd)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age
}
