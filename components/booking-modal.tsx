'use client'

import { useState, useMemo, useEffect } from 'react'
import { GAMES, type EsportsCenter } from '@/lib/data'
import { useAuth } from './auth-context'
import { useWallet, announceWalletBalance } from '@/lib/use-wallet'
import { useCenterAvailability } from '@/lib/use-availability'
import { computeOccupiedSeats, timeToHour } from '@/lib/availability'
import { useRooms, type RoomDto } from '@/lib/use-rooms'
import { SelectField } from './ui/select-field'

interface BookingModalProps {
  center: EsportsCenter
  onClose: () => void
  onComplete: (center: EsportsCenter, review: { rating: number; comment: string }) => void
}

type Step = 'details' | 'confirm' | 'success' | 'review'
type Category = 'regular' | 'vip'

const TIME_SLOTS = [
  '00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00',
  '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00',
]
const DURATIONS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

// E-Mongolia (demo) age check: 8+ hour and late-night (22:00+) bookings
// require verified age instead of the self-declared 18+ checkbox. The
// actual verification happens server-side via POST /api/emongolia/verify.
const EM_BLUE = '#1b7fd4'
const EM_LONG_BOOKING_HOURS = 8
const EM_NIGHT_HOUR = 22
const VIP_GOLD = '#f5b942'

// --- Ecoin currency badge (1 ecoin = 1 ₮) ---
function EcoinAmount({
  amount,
  color,
  size = 'lg',
}: {
  amount: number
  color: string
  size?: 'sm' | 'lg'
}) {
  const big = size === 'lg'
  return (
    <span
      className="inline-flex items-center gap-1.5 font-black align-middle"
      style={{
        color,
        fontFamily: 'var(--font-heading)',
        fontSize: big ? '1.5rem' : '0.8em',
        textShadow: big ? `0 0 10px ${color}90, 0 0 26px ${color}45` : 'none',
      }}
    >
      <svg
        width={big ? 20 : 13}
        height={big ? 20 : 13}
        viewBox="0 0 20 20"
        fill="none"
        style={{ filter: big ? `drop-shadow(0 0 4px ${color})` : 'none', flexShrink: 0 }}
      >
        <circle cx="10" cy="10" r="8.5" fill={`${color}22`} stroke={color} strokeWidth="1.6" />
        <text
          x="10"
          y="14"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fill={color}
          fontFamily="var(--font-heading)"
        >
          E
        </text>
      </svg>
      {amount.toLocaleString()}
      <span
        style={{
          fontSize: big ? '0.5em' : '0.85em',
          fontWeight: 700,
          opacity: 0.8,
          letterSpacing: '0.03em',
          textShadow: 'none',
        }}
      >
        ecoin
      </span>
    </span>
  )
}

// --- Room seat (single PC station, lock/monitor iconography) ---
function RoomSeat({
  index,
  occupied,
  selected,
  disabled,
  color,
  onToggle,
}: {
  index: number
  occupied: boolean
  selected: boolean
  disabled: boolean
  color: string
  onToggle: (i: number) => void
}) {
  const clickable = !occupied && !disabled
  const style: React.CSSProperties = selected
    ? { background: `${color}2e`, border: `1.5px solid ${color}`, color, boxShadow: `0 0 8px ${color}60` }
    : occupied
      ? { background: 'rgba(255,69,200,0.10)', border: '1px solid rgba(255,69,200,0.28)', color: 'rgba(255,69,200,0.55)' }
      : disabled
        ? { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.15)' }
        : { background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onToggle(index)}
      title={occupied ? `PC ${index + 1} — Захиалагдсан` : `PC ${index + 1}`}
      className="relative w-9 h-9 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all duration-150"
      style={style}
    >
      {occupied ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="3" y="5.5" width="6" height="4.5" rx="1" />
          <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="1.5" y="2" width="9" height="6" rx="0.8" />
          <path d="M4.5 10.5h3M6 8v2.5" strokeLinecap="round" />
        </svg>
      )}
      <span>{index + 1}</span>
      {selected && (
        <span
          className="pointer-events-none absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ background: color }}
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#0a0a0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6l3 3 5-5" />
          </svg>
        </span>
      )}
    </button>
  )
}

function RoomCard({
  room,
  occupied,
  selected,
  disabled,
  color,
  onToggle,
}: {
  room: RoomDto
  occupied: Set<number>
  selected: Set<number>
  disabled: boolean
  color: string
  onToggle: (i: number) => void
}) {
  const free = room.seatCount - occupied.size
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2.5 transition-opacity duration-200"
      style={{
        background: 'rgba(11,11,15,0.8)',
        border: `1px solid ${color}20`,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-black tracking-wide" style={{ color, fontFamily: 'var(--font-heading)' }}>
          {room.name}
        </span>
        {free === 0 ? (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,69,200,0.12)', color: '#ff45c8' }}
          >
            ДҮҮРЭН
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{free} сул</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: room.seatCount }, (_, i) => (
          <RoomSeat
            key={i}
            index={i}
            occupied={occupied.has(i)}
            selected={selected.has(i)}
            disabled={disabled}
            color={color}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

export function BookingModal({ center, onClose, onComplete }: BookingModalProps) {
  const { user } = useAuth()
  const { balance } = useWallet(user?.email)
  const [step, setStep] = useState<Step>('details')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const [date, setDate] = useState(getTodayStr())
  const [time, setTime] = useState('18:00')
  const [duration, setDuration] = useState(2)
  const [partySize, setPartySize] = useState(1)
  const [selectedSeats, setSelectedSeats] = useState<Set<number>>(new Set())
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null)
  const [selectedGame, setSelectedGame] = useState(GAMES[0].id)

  const [ageConfirmed, setAgeConfirmed] = useState(false)

  // E-Mongolia demo verification (required for 8h+ / 22:00+ bookings)
  const [emOpen, setEmOpen] = useState(false)
  const [emRegNumber, setEmRegNumber] = useState('')
  const [emAge, setEmAge] = useState<number | null>(null)
  const [emError, setEmError] = useState('')
  const [emChecking, setEmChecking] = useState(false)

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')

  const { rooms, loading: roomsLoading } = useRooms(center.id)
  // Real bookings for this center/date, polled so seats other users take
  // flip to occupied without a manual refresh.
  const { bookingsForRoom, reload: reloadAvailability } = useCenterAvailability(center.id, date)

  const roomOccupied = useMemo(() => {
    const map: Record<number, Set<number>> = {}
    for (const room of rooms) {
      const occupied1Based = computeOccupiedSeats(bookingsForRoom(room.id), time, duration)
      map[room.id] = new Set(Array.from(occupied1Based, (n) => n - 1))
    }
    return map
  }, [rooms, bookingsForRoom, time, duration])

  const [activeCategory, setActiveCategory] = useState<Category>('regular')
  useEffect(() => {
    if (rooms.length === 0) return
    if (rooms.some((r) => r.category === activeCategory)) return
    setActiveCategory(rooms.some((r) => r.category === 'regular') ? 'regular' : 'vip')
  }, [rooms, activeCategory])

  const hasRegular = rooms.some((r) => r.category === 'regular')
  const hasVip = rooms.some((r) => r.category === 'vip')
  const showTabs = hasRegular && hasVip
  const visibleRooms = rooms.filter((r) => r.category === activeCategory)
  const activeRoom = rooms.find((r) => r.id === activeRoomId)
  const maxPartySize = Math.max(1, ...rooms.map((r) => r.seatCount))

  function categoryFreeCount(category: Category) {
    return rooms
      .filter((r) => r.category === category)
      .reduce((sum, r) => sum + (r.seatCount - (roomOccupied[r.id]?.size || 0)), 0)
  }
  const categoryTotal = visibleRooms.reduce((sum, r) => sum + r.seatCount, 0)
  const categoryFree = categoryFreeCount(activeCategory)

  // If a selected seat becomes occupied (someone else booked it, or the
  // time/duration changed to overlap an existing booking), drop it.
  useEffect(() => {
    if (!activeRoomId) return
    const occ = roomOccupied[activeRoomId]
    if (!occ) return
    setSelectedSeats((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const i of prev) {
        if (occ.has(i)) {
          next.delete(i)
          changed = true
        }
      }
      if (!changed) return prev
      if (next.size === 0) setActiveRoomId(null)
      return next
    })
  }, [roomOccupied, activeRoomId])

  // Shrinking the party size trims any excess selected seats.
  useEffect(() => {
    setSelectedSeats((prev) => {
      if (prev.size <= partySize) return prev
      const trimmed = new Set(Array.from(prev).sort((a, b) => a - b).slice(0, partySize))
      if (trimmed.size === 0) setActiveRoomId(null)
      return trimmed
    })
  }, [partySize])

  const game = GAMES.find((g) => g.id === selectedGame) || GAMES[0]
  const seats = selectedSeats.size
  const totalPrice = activeRoom ? seats * activeRoom.pricePerHour * duration : 0

  // Long (8h+) and late-night (22:00+) bookings need E-Mongolia-verified
  // age; a self-declared checkbox is enough for everything else.
  const needsEMongolia = duration >= EM_LONG_BOOKING_HOURS || timeToHour(time) >= EM_NIGHT_HOUR
  const ageOk = needsEMongolia ? emAge !== null : ageConfirmed

  function toggleSeat(room: RoomDto, seatIndex: number) {
    if (activeRoomId !== null && activeRoomId !== room.id) return
    const occ = roomOccupied[room.id]
    if (occ?.has(seatIndex)) return
    const next = new Set(selectedSeats)
    if (next.has(seatIndex)) {
      next.delete(seatIndex)
    } else {
      if (next.size >= partySize) return
      next.add(seatIndex)
    }
    setSelectedSeats(next)
    setActiveRoomId(next.size === 0 ? null : room.id)
  }

  async function handleEMongoliaVerify() {
    setEmError('')
    setEmChecking(true)
    try {
      const res = await fetch('/api/emongolia/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNumber: emRegNumber }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEmError(data.error || 'Баталгаажуулалт амжилтгүй боллоо.')
        setEmChecking(false)
        return
      }
      setEmAge(data.age)
      setEmOpen(false)
    } catch {
      setEmError('Сервертэй холбогдож чадсангүй.')
    }
    setEmChecking(false)
  }

  function handleBook() {
    setStep('confirm')
  }

  async function handleConfirm() {
    if (!activeRoom) return
    setConfirming(true)
    setConfirmError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user?.email,
          centerId: center.id,
          centerName: center.name,
          roomId: activeRoom.id,
          roomName: activeRoom.name,
          date,
          time,
          duration,
          seats: Array.from(selectedSeats)
            .sort((a, b) => a - b)
            .map((i) => i + 1),
          game: game.name,
          totalPrice,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setConfirmError(data.error || 'Захиалга амжилтгүй боллоо.')
        // The server includes the authoritative current balance even on failure
        // (e.g. insufficient funds) — sync it so the shown balance is never stale.
        if (typeof data.balance === 'number') announceWalletBalance(data.balance)
        // Someone else took one of these seats first — refresh the live
        // seat map immediately so the user sees the current state.
        if (data.conflict) reloadAvailability()
        setConfirming(false)
        return
      }
      window.dispatchEvent(new Event('epc:bookings-updated'))
      // Push the server-confirmed post-deduction balance directly — avoids a
      // race where an immediate re-fetch could observe a not-yet-settled value.
      announceWalletBalance(data.balance)
      setStep('success')
    } catch {
      setConfirmError('Сервертэй холбогдож чадсангүй.')
    }
    setConfirming(false)
  }

  function handleSubmitReview() {
    onComplete(center, { rating, comment })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg mx-2 sm:mx-0 rounded-t-2xl sm:rounded-2xl overflow-hidden float-in"
        style={{
          background: 'rgba(22,22,28,0.98)',
          border: `1px solid ${center.color}40`,
          boxShadow: `0 0 40px ${center.color}20`,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top accent */}
        <div className="h-0.5 w-full shrink-0" style={{ background: center.color }} />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: `${center.color}20` }}
        >
          <div>
            <h2
              className="font-black text-foreground text-lg"
              style={{ fontFamily: 'var(--font-heading)', color: center.color }}
            >
              {step === 'success' ? 'ЗАХИАЛГА АМЖИЛТТАЙ' : step === 'review' ? 'ҮНЭЛГЭЭ ӨГ' : 'СУУДАЛ СОНГОХ'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{center.name}</p>
              {step === 'details' && rooms.length > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: `${center.color}15`,
                    color: center.color,
                    border: `1px solid ${center.color}30`,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {categoryTotal} PC · {categoryFree} сул
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Step: Details */}
        {step === 'details' && (
          <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
            {/* User info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-background shrink-0"
                style={{ background: center.color }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Date / Duration / Time / Party size */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">Огноо</label>
                <input
                  type="date"
                  value={date}
                  min={getTodayStr()}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-input border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-neon-cyan transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">Хугацаа</label>
                <SelectField
                  value={String(duration)}
                  onChange={(v) => setDuration(Number(v))}
                  options={DURATIONS.map((d) => ({ value: String(d), label: `${d} цаг` }))}
                  className="bg-input border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-neon-cyan transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">Цаг</label>
                <SelectField
                  value={time}
                  onChange={setTime}
                  options={TIME_SLOTS}
                  className="bg-input border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-neon-cyan transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">Хүний тоо</label>
                <SelectField
                  value={String(partySize)}
                  onChange={(v) => setPartySize(Number(v))}
                  options={Array.from({ length: maxPartySize }, (_, i) => ({ value: String(i + 1), label: `${i + 1} хүн` }))}
                  className="bg-input border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-neon-cyan transition-colors"
                />
              </div>
            </div>

            {/* Category tabs + room cards */}
            {roomsLoading ? (
              <div className="text-center py-6 text-sm text-muted-foreground">Уншиж байна...</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">Одоогоор суудал бүртгэгдээгүй байна.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {showTabs && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveCategory('regular')}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150"
                      style={
                        activeCategory === 'regular'
                          ? { background: `${center.color}20`, border: `1px solid ${center.color}`, color: center.color }
                          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#9a9aae' }
                      }
                    >
                      <span className="text-xs font-black" style={{ fontFamily: 'var(--font-heading)' }}>Заал</span>
                      <span className="text-[10px]">{categoryFreeCount('regular')} сул</span>
                    </button>
                    <button
                      onClick={() => setActiveCategory('vip')}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150"
                      style={
                        activeCategory === 'vip'
                          ? { background: `${VIP_GOLD}20`, border: `1px solid ${VIP_GOLD}`, color: VIP_GOLD }
                          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#9a9aae' }
                      }
                    >
                      <span className="text-xs font-black" style={{ fontFamily: 'var(--font-heading)' }}>VIP</span>
                      <span className="text-[10px]">{categoryFreeCount('vip')} сул</span>
                    </button>
                  </div>
                )}

                {activeRoomId !== null && !visibleRooms.some((r) => r.id === activeRoomId) && (
                  <p className="text-[11px] text-muted-foreground -mb-1">
                    Та «{activeRoom?.name}» өрөөнөөс сонгосон байна — өөр өрөө сонгохын тулд эхлээд сонголтоо цуцлана уу.
                  </p>
                )}

                {visibleRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    occupied={roomOccupied[room.id] || new Set()}
                    selected={activeRoomId === room.id ? selectedSeats : new Set()}
                    disabled={activeRoomId !== null && activeRoomId !== room.id}
                    color={room.category === 'vip' ? VIP_GOLD : center.color}
                    onToggle={(i) => toggleSeat(room, i)}
                  />
                ))}
              </div>
            )}

            {/* Game selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Тоглоом</label>
              <div className="grid grid-cols-5 gap-1.5 max-h-28 overflow-y-auto">
                {GAMES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGame(g.id)}
                    className="py-1.5 px-1 rounded-lg text-xs font-bold border transition-all duration-150 truncate"
                    style={
                      selectedGame === g.id
                        ? { background: `${g.color}20`, borderColor: g.color, color: g.color }
                        : { background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#9a9aae' }
                    }
                  >
                    {g.icon}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{game.name}</p>
            </div>

            {/* Total price */}
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3 shrink-0"
              style={{ background: `${center.color}10`, border: `1px solid ${center.color}25` }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-muted-foreground">Нийт дүн</span>
                {activeRoom && seats > 0 && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    {seats} PC × {duration}ц ×{' '}
                    <EcoinAmount amount={activeRoom.pricePerHour} color={center.color} size="sm" />
                  </span>
                )}
              </div>
              <EcoinAmount amount={totalPrice} color={center.color} size="lg" />
            </div>

            {/* Age gate: E-Mongolia verification for 8h+ / 22:00+ bookings,
                self-declared 18+ checkbox for everything else */}
            {needsEMongolia ? (
              <div
                className="flex flex-col gap-2.5 rounded-xl px-4 py-3 border transition-all duration-200 shrink-0"
                style={{
                  borderColor: emAge !== null ? `${EM_BLUE}60` : 'rgba(255,69,200,0.25)',
                  background: emAge !== null ? `${EM_BLUE}0d` : 'rgba(255,69,200,0.05)',
                }}
              >
                {emAge !== null ? (
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: EM_BLUE }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </span>
                    <span className="text-xs text-foreground">
                      <span className="font-bold" style={{ color: EM_BLUE, fontFamily: 'var(--font-heading)' }}>
                        Регистрийн дугаараар
                      </span>{' '}
                      нас баталгаажсан ({emAge} настай)
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-bold" style={{ color: '#ff45c8' }}>{EM_LONG_BOOKING_HOURS}+ цагийн</span> болон{' '}
                      <span className="font-bold" style={{ color: '#ff45c8' }}>{EM_NIGHT_HOUR}:00-оос хойших</span> захиалгад
                      регистрийн дугаараа оруулж насаа баталгаажуулах шаардлагатай.
                    </p>
                    <button
                      onClick={() => setEmOpen(true)}
                      className="py-2 rounded-lg text-xs font-black tracking-widest text-white transition-all duration-200"
                      style={{ background: EM_BLUE, boxShadow: `0 0 14px ${EM_BLUE}50`, fontFamily: 'var(--font-heading)' }}
                    >
                      РЕГИСТРИЙН ДУГААРААР БАТАЛГААЖУУЛАХ
                    </button>
                  </>
                )}
              </div>
            ) : (
              <label
                className="flex items-start gap-3 cursor-pointer rounded-xl px-4 py-3 border transition-all duration-200 shrink-0"
                style={{
                  borderColor: ageConfirmed ? `${center.color}50` : 'rgba(255,69,200,0.25)',
                  background: ageConfirmed ? `${center.color}08` : 'rgba(255,69,200,0.05)',
                }}
              >
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                  />
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                    style={{
                      background: ageConfirmed ? center.color : 'transparent',
                      border: ageConfirmed ? `1px solid ${center.color}` : '1px solid rgba(255,69,200,0.5)',
                    }}
                  >
                    {ageConfirmed && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="#0a0a0d" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <span
                    className="text-xs font-bold tracking-wide"
                    style={{ color: ageConfirmed ? center.color : '#ff45c8', fontFamily: 'var(--font-heading)' }}
                  >
                    18+
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    Би 18 ба түүнээс дээш настай болохоо баталгаажуулж байна
                  </span>
                </div>
              </label>
            )}

            <button
              onClick={handleBook}
              disabled={seats === 0 || seats !== partySize || !ageOk}
              className="py-3 rounded-xl font-black text-background tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: center.color,
                boxShadow: (seats === 0 || seats !== partySize || !ageOk) ? 'none' : `0 0 20px ${center.color}50`,
                fontFamily: 'var(--font-heading)',
              }}
            >
              {seats === 0
                ? 'PC СОНГОНО УУ'
                : seats !== partySize
                  ? `${seats}/${partySize} PC СОНГОСОН`
                  : !ageOk
                    ? needsEMongolia
                      ? 'НАС БАТАЛГААЖУУЛНА УУ'
                      : '18+ БАТАЛГААЖУУЛНА УУ'
                    : `${seats} PC ЗАХИАЛАХ`}
            </button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="px-6 py-6 flex flex-col gap-5">
            <p className="text-sm text-muted-foreground">Дараах захиалгыг баталгаажуулна уу:</p>
            <div className="rounded-xl overflow-hidden border border-border">
              {(
                [
                  ['Төв', center.name],
                  ['Өрөө', activeRoom?.name || '—'],
                  ['Огноо', date],
                  ['Цаг', `${time} (${duration} цаг)`],
                  ['PC дугаар', Array.from(selectedSeats).sort((a,b) => a-b).map(i => `#${i+1}`).join(', ')],
                  ['PC тоо', `${seats} ширхэг`],
                  ['Тоглоом', game.name],
                  ['Үнэ', <EcoinAmount key="ecoin" amount={totalPrice} color={center.color} size="sm" />],
                ] as [string, React.ReactNode][]
              ).map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex items-start justify-between px-4 py-3 text-sm gap-2 ${i % 2 === 0 ? 'bg-muted' : 'bg-card'}`}
                >
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="font-semibold text-foreground text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Wallet balance vs required amount */}
            <div
              className="flex items-center justify-between rounded-lg px-4 py-2.5 text-xs"
              style={{
                background: balance < totalPrice ? 'rgba(255,69,200,0.06)' : 'rgba(0,224,255,0.06)',
                border: `1px solid ${balance < totalPrice ? 'rgba(255,69,200,0.3)' : 'rgba(0,224,255,0.2)'}`,
              }}
            >
              <span className="text-muted-foreground">Таны хэтэвчний үлдэгдэл</span>
              <EcoinAmount amount={balance} color={balance < totalPrice ? '#ff45c8' : '#00e0ff'} size="sm" />
            </div>
            {balance < totalPrice && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 -mt-2">
                Ecoin үлдэгдэл хүрэлцэхгүй байна. Профайл → Хэтэвч хэсгээс цэнэглэнэ үү.
              </p>
            )}

            {confirmError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {confirmError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('details')}
                disabled={confirming}
                className="flex-1 py-3 rounded-xl font-bold border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-40"
              >
                Буцах
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming || balance < totalPrice}
                className="flex-1 py-3 rounded-xl font-black text-background tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: center.color, boxShadow: confirming || balance < totalPrice ? 'none' : `0 0 20px ${center.color}50`, fontFamily: 'var(--font-heading)' }}
              >
                {confirming ? 'БОЛОВСРУУЛЖ БАЙНА...' : balance < totalPrice ? 'ҮЛДЭГДЭЛ ДУТУУ' : 'БАТАЛГААЖУУЛАХ'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="px-6 py-10 flex flex-col items-center gap-5 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: `${center.color}15`, border: `2px solid ${center.color}`, boxShadow: `0 0 30px ${center.color}40` }}
            >
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={center.color} strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black mb-2" style={{ color: center.color, fontFamily: 'var(--font-heading)' }}>
                ЗАХИАЛГА АМЖИЛТТАЙ!
              </h3>
              <p className="text-muted-foreground text-sm">
                {center.name} · {activeRoom?.name} — {date}, {time} цагт{' '}
                <span className="text-foreground font-semibold">
                  PC {Array.from(selectedSeats).sort((a,b)=>a-b).map(i=>`#${i+1}`).join(', ')}
                </span> захиалсан.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={() => setStep('review')} className="flex-1 py-3 rounded-xl font-black text-background" style={{ background: center.color, fontFamily: 'var(--font-heading)' }}>
                ҮНЭЛГЭЭ ӨГ
              </button>
              <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold border border-border text-muted-foreground hover:text-foreground transition-colors">
                Хаах
              </button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="px-6 py-6 flex flex-col gap-5">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">{center.name}</span>-д үнэлгээ өг
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Одоор үнэлэх</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform duration-150 hover:scale-110"
                  >
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill={star <= (hoverRating || rating) ? '#f59e0b' : '#33333d'} stroke={star <= (hoverRating || rating) ? '#f59e0b' : '#44444f'} strokeWidth="1">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                    </svg>
                  </button>
                ))}
              </div>
              {rating > 0 && <p className="text-xs text-muted-foreground">{['','Маш муу','Муу','Дундаж','Сайн','Маш сайн'][rating]}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">Сэтгэгдэл</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Тоглоомын туршлага, заалын орчин, үйлчилгээний талаар..."
                rows={3}
                className="bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors resize-none leading-relaxed"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold border border-border text-muted-foreground hover:text-foreground transition-colors">
                Алгасах
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={rating === 0}
                className="flex-1 py-3 rounded-xl font-black text-background transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: center.color, fontFamily: 'var(--font-heading)' }}
              >
                ИЛГЭЭХ
              </button>
            </div>
          </div>
        )}

        {/* E-Mongolia verification overlay (demo) */}
        {emOpen && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center px-6"
            style={{ background: 'rgba(10,10,13,0.92)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: '#12141c',
                border: `1px solid ${EM_BLUE}50`,
                boxShadow: `0 0 40px ${EM_BLUE}25`,
              }}
            >
              <div className="h-0.5 w-full" style={{ background: EM_BLUE }} />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: EM_BLUE }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.3">
                      <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
                      <circle cx="5.5" cy="7" r="1.3" />
                      <path d="M3.5 11c0-1.4 1-2 2-2s2 .6 2 2" strokeLinecap="round" />
                      <path d="M9.5 6.5h3M9.5 8.5h3M9.5 10.5h2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-black" style={{ color: EM_BLUE, fontFamily: 'var(--font-heading)' }}>
                      НАС БАТАЛГААЖУУЛАЛТ
                    </p>
                    <p className="text-[11px] text-muted-foreground">Регистрийн дугаараар</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Регистрийн дугаараа оруулснаар таны нас баталгаажина.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground uppercase tracking-widest">Регистрийн дугаар</label>
                  <input
                    type="text"
                    value={emRegNumber}
                    onChange={(e) => setEmRegNumber(e.target.value)}
                    placeholder="УБ05212233"
                    className="bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none transition-colors"
                    style={{ borderColor: emError ? 'rgba(255,69,200,0.4)' : undefined }}
                  />
                </div>

                {emError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {emError}
                  </p>
                )}

                <div className="flex gap-2.5">
                  <button
                    onClick={() => {
                      setEmOpen(false)
                      setEmError('')
                    }}
                    disabled={emChecking}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    Болих
                  </button>
                  <button
                    onClick={handleEMongoliaVerify}
                    disabled={emChecking || !emRegNumber.trim()}
                    className="flex-1 py-2.5 rounded-lg text-xs font-black tracking-widest text-white transition-all duration-200 disabled:opacity-40"
                    style={{ background: EM_BLUE, fontFamily: 'var(--font-heading)' }}
                  >
                    {emChecking ? 'ШАЛГАЖ БАЙНА...' : 'БАТАЛГААЖУУЛАХ'}
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground text-center opacity-70">
                  Демо горим — жинхэнэ бүртгэлийн сантай холбогдоогүй.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
