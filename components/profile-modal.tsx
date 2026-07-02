'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './auth-context'

interface Booking {
  id: number
  centerName: string
  date: string
  time: string
  duration: number
  seats: string
  game: string
  totalPrice: number
  createdAt: string
}

interface MyCenter {
  id: number
  name: string
  district: string
  location: string
  phone: string
  pcCount: number
  pricePerHour: number
  specs: string
  createdAt: string
  color: string
  vipSeats: number[]
  vipPricePerHour: number
}

const ACCENT = '#00e0ff'

interface ProfileModalProps {
  onClose: () => void
  onAddCenter: () => void
  onEditCenter: (center: MyCenter) => void
}

export function ProfileModal({ onClose, onAddCenter, onEditCenter }: ProfileModalProps) {
  const { user, logout, deleteAccount } = useAuth()
  const isAdmin = Boolean(user?.isAdmin)
  const [tab, setTab] = useState<'bookings' | 'centers'>('bookings')
  const [deleting, setDeleting] = useState(false)
  const [delPassword, setDelPassword] = useState('')
  const [delError, setDelError] = useState('')
  const [delLoading, setDelLoading] = useState(false)

  async function handleDeleteAccount() {
    setDelError('')
    setDelLoading(true)
    const r = await deleteAccount(delPassword)
    setDelLoading(false)
    if (!r.ok) setDelError(r.error || 'Устгахад алдаа гарлаа.')
    else onClose() // logged out; close the modal
  }
  const [bookings, setBookings] = useState<Booking[]>([])
  const [centers, setCenters] = useState<MyCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!user?.email) return
    try {
      const res = await fetch(`/api/me?email=${encodeURIComponent(user.email)}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      setBookings(data.bookings || [])
      setCenters(data.centers || [])
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [user?.email])

  useEffect(() => {
    load()
    const h = () => load()
    window.addEventListener('epc:bookings-updated', h)
    window.addEventListener('epc:centers-updated', h)
    return () => {
      window.removeEventListener('epc:bookings-updated', h)
      window.removeEventListener('epc:centers-updated', h)
    }
  }, [load])

  async function handleDelete(id: number) {
    if (!user?.email) return
    try {
      await fetch(
        `/api/centers?id=${id}&email=${encodeURIComponent(user.email)}`,
        { method: 'DELETE' },
      )
      setConfirmId(null)
      window.dispatchEvent(new Event('epc:centers-updated'))
      load()
    } catch {
      /* ignore */
    }
  }

  const initial = user?.name?.charAt(0).toUpperCase() || '?'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/85 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl mx-2 sm:mx-0 rounded-t-2xl sm:rounded-2xl overflow-hidden float-in"
        style={{
          background: 'rgba(20,20,26,0.98)',
          border: `1px solid ${ACCENT}40`,
          boxShadow: `0 0 40px ${ACCENT}1f`,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="h-0.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${ACCENT}, #ff45c8)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: `${ACCENT}20` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg text-background shrink-0"
              style={{ background: ACCENT, fontFamily: 'var(--font-heading)' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-base text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                {user?.name}
              </h2>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
            aria-label="Хаах"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 px-6 py-4 shrink-0">
          <button
            onClick={() => setTab('bookings')}
            className="rounded-xl px-4 py-3 text-left transition-all"
            style={{
              background: tab === 'bookings' ? `${ACCENT}12` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tab === 'bookings' ? ACCENT + '50' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div className="text-2xl font-black" style={{ color: ACCENT, fontFamily: 'var(--font-heading)' }}>
              {bookings.length}
            </div>
            <div className="text-xs text-muted-foreground">Захиалга</div>
          </button>
          <button
            onClick={() => setTab('centers')}
            className="rounded-xl px-4 py-3 text-left transition-all"
            style={{
              background: tab === 'centers' ? '#ff45c812' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tab === 'centers' ? '#ff45c850' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div className="text-2xl font-black neon-text-magenta" style={{ fontFamily: 'var(--font-heading)' }}>
              {centers.length}
            </div>
            <div className="text-xs text-muted-foreground">Миний төв</div>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 pb-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Уншиж байна...</div>
          ) : tab === 'bookings' ? (
            bookings.length === 0 ? (
              <EmptyState text="Одоогоор захиалга алга" hint="Заал захиалахад энд харагдана." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {b.centerName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.date} · {b.time} · {b.duration}ц {b.seats && `· PC ${b.seats}`}
                      </p>
                      {b.game && <p className="text-[11px] text-muted-foreground mt-0.5">🎮 {b.game}</p>}
                    </div>
                    <span className="text-sm font-black shrink-0" style={{ color: ACCENT, fontFamily: 'var(--font-heading)' }}>
                      ₮{b.totalPrice.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : centers.length === 0 ? (
            <EmptyState
              text={isAdmin ? 'Та төв нэмээгүй байна' : 'Танд төв алга'}
              hint={isAdmin ? 'Өөрийн gaming төвөө бүртгүүлээрэй.' : 'Зөвхөн админ эрхтэй хэрэглэгч төв нэмнэ.'}
              action={isAdmin ? onAddCenter : undefined}
              actionLabel={isAdmin ? 'ТӨВ НЭМЭХ' : undefined}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {centers.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}30` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {c.district || c.location} · {c.pcCount} PC · ₮{(c.pricePerHour || 0).toLocaleString()}/цаг
                      </p>
                      {c.specs && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.specs}</p>}
                    </div>
                    {confirmId === c.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold text-background"
                          style={{ background: '#ff45c8' }}
                        >
                          Тийм
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2.5 py-1 rounded-md text-[11px] border border-border text-muted-foreground"
                        >
                          Болих
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onEditCenter(c)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:border-neon-cyan"
                          style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#00e0ff' }}
                          aria-label="Засах"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmId(c.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:border-neon-magenta"
                          style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#ff45c8' }}
                          aria-label="Устгах"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 4h12M6 4V2.5h4V4M4.5 4l.5 9h6l.5-9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAdmin && (
                <button
                  onClick={onAddCenter}
                  className="mt-1 py-2.5 rounded-xl font-bold text-sm text-background"
                  style={{ background: ACCENT, fontFamily: 'var(--font-heading)' }}
                >
                  + ТӨВ НЭМЭХ
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t shrink-0 flex flex-col gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {deleting ? (
            <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'rgba(255,69,200,0.06)', border: '1px solid rgba(255,69,200,0.25)' }}>
              <p className="text-xs text-muted-foreground">
                Бүртгэлээ бүрмөсөн устгах уу? Таны төв, захиалга бүгд устана. Баталгаажуулахын тулд нууц үгээ оруул.
              </p>
              <input
                type="password"
                value={delPassword}
                onChange={(e) => setDelPassword(e.target.value)}
                placeholder="Нууц үг"
                className="bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-magenta transition-colors"
              />
              {delError && <p className="text-xs text-red-400">{delError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={delLoading || !delPassword}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-background disabled:opacity-40"
                  style={{ background: '#ff45c8', fontFamily: 'var(--font-heading)' }}
                >
                  {delLoading ? 'УСТГАЖ БАЙНА...' : 'БҮРМӨСӨН УСТГАХ'}
                </button>
                <button
                  onClick={() => { setDeleting(false); setDelError(''); setDelPassword('') }}
                  className="px-4 py-2 rounded-lg text-xs border border-border text-muted-foreground"
                >
                  Болих
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDeleting(true)}
                className="px-4 py-2 text-xs rounded-lg border transition-colors hover:bg-muted"
                style={{ borderColor: 'rgba(255,69,200,0.35)', color: '#ff45c8' }}
              >
                Бүртгэл устгах
              </button>
              <button
                onClick={() => {
                  logout()
                  onClose()
                }}
                className="px-4 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                Гарах
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  text,
  hint,
  action,
  actionLabel,
}: {
  text: string
  hint: string
  action?: () => void
  actionLabel?: string
}) {
  return (
    <div className="text-center py-12 flex flex-col items-center gap-2">
      <p className="text-foreground font-semibold text-sm">{text}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-3 px-5 py-2.5 rounded-xl font-bold text-sm text-background"
          style={{ background: ACCENT, fontFamily: 'var(--font-heading)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
