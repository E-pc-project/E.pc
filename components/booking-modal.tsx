'use client'

import { useState, useMemo } from 'react'
import { GAMES, type EsportsCenter } from '@/lib/data'
import { useAuth } from './auth-context'

interface BookingModalProps {
  center: EsportsCenter
  onClose: () => void
  onComplete: (center: EsportsCenter, review: { rating: number; comment: string }) => void
}

type Step = 'details' | 'confirm' | 'success' | 'review'

const TIME_SLOTS = [
  '00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00',
  '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00',
]
const DURATIONS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]

// Simulate ~30% of seats as already taken for realism
function generateOccupied(total: number): Set<number> {
  const occupied = new Set<number>()
  const count = Math.floor(total * 0.28)
  while (occupied.size < count) {
    occupied.add(Math.floor(Math.random() * total))
  }
  return occupied
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

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

// --- Seat (single PC station) ---
const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function Seat({
  index,
  state,
  color,
  onToggle,
}: {
  index: number
  state: 'free' | 'selected' | 'occupied'
  color: string
  onToggle: (i: number) => void
}) {
  const base: React.CSSProperties = {
    position: 'relative',
    width: 26,
    height: 26,
    borderRadius: 7,
    transition: 'transform 0.12s ease, box-shadow 0.15s ease, background 0.15s ease',
  }
  const style: React.CSSProperties =
    state === 'selected'
      ? {
          ...base,
          background: `${color}2e`,
          border: `1.5px solid ${color}`,
          color,
          boxShadow: `0 0 10px ${color}70, inset 0 0 6px ${color}40`,
          transform: 'translateY(-1px)',
        }
      : state === 'occupied'
        ? {
            ...base,
            background: 'rgba(255,69,200,0.10)',
            border: '1px solid rgba(255,69,200,0.28)',
            color: 'rgba(255,69,200,0.55)',
            cursor: 'not-allowed',
          }
        : {
            ...base,
            background: 'rgba(255,255,255,0.045)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.35)',
          }

  return (
    <button
      type="button"
      disabled={state === 'occupied'}
      onClick={() => onToggle(index)}
      title={state === 'occupied' ? `PC ${index + 1} — Захиалагдсан` : `PC ${index + 1}`}
      className="group flex items-center justify-center text-[9px] font-bold seat-btn"
      style={style}
    >
      {/* monitor cap */}
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-sm"
        style={{
          top: 3,
          width: 13,
          height: 2.5,
          background:
            state === 'selected' ? color : state === 'occupied' ? 'rgba(255,69,200,0.5)' : 'rgba(255,255,255,0.25)',
          boxShadow: state === 'selected' ? `0 0 5px ${color}` : 'none',
        }}
      />
      <span style={{ marginTop: 5 }}>{index + 1}</span>
      {/* hover tooltip */}
      {state !== 'occupied' && (
        <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 bg-card border border-border text-foreground text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
          PC {index + 1}
        </span>
      )}
    </button>
  )
}

// --- Seat Map Component ---
function SeatMap({
  total,
  selected,
  occupied,
  onToggle,
  color,
}: {
  total: number
  selected: Set<number>
  occupied: Set<number>
  onToggle: (i: number) => void
  color: string
}) {
  const cols = total <= 18 ? 6 : total <= 32 ? 8 : total <= 50 ? 10 : 12
  const rows = Math.ceil(total / cols)
  const aisleAfter = Math.floor(cols / 2) // gap between the two PC blocks

  function seatState(i: number): 'free' | 'selected' | 'occupied' {
    if (occupied.has(i)) return 'occupied'
    if (selected.has(i)) return 'selected'
    return 'free'
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ borderColor: color, border: `1.5px solid ${color}`, background: `${color}2e` }} />
          Сонгосон
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.12)' }} />
          Сул
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgba(255,69,200,0.10)', border: '1px solid rgba(255,69,200,0.28)' }} />
          Захиалагдсан
        </span>
      </div>

      {/* Curved glowing screen */}
      <div className="flex flex-col items-center gap-1 mb-0.5">
        <div
          className="w-3/4 text-center text-[10px] font-bold tracking-[0.4em] py-1"
          style={{
            color,
            borderRadius: '0 0 50% 50% / 0 0 100% 100%',
            background: `linear-gradient(180deg, ${color}22, transparent)`,
            borderTop: `2px solid ${color}`,
            boxShadow: `0 -2px 14px ${color}55`,
            fontFamily: 'var(--font-heading)',
          }}
        >
          ДЭЛГЭЦ
        </div>
      </div>

      {/* Seat rows with center aisle + row letters */}
      <div className="overflow-x-auto pb-1">
        <div className="flex flex-col items-center gap-1.5 min-w-fit mx-auto">
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-1.5">
              <span className="w-4 text-center text-[9px] font-mono text-muted-foreground shrink-0">
                {ROW_LETTERS[r]}
              </span>
              {Array.from({ length: cols }, (_, c) => {
                const i = r * cols + c
                const showAisle = c === aisleAfter
                return (
                  <div key={c} className="flex items-center">
                    {showAisle && <span className="w-3 shrink-0" />}
                    {i < total ? (
                      <Seat index={i} state={seatState(i)} color={color} onToggle={onToggle} />
                    ) : (
                      <span style={{ width: 26, height: 26 }} className="shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between text-[11px] mt-0.5">
        <span className="text-muted-foreground">{rows} эгнээ × {cols} PC</span>
        <span className="font-semibold" style={{ color }}>
          {selected.size > 0 ? `${selected.size} PC сонгосон` : 'PC дарж сонгоно уу'}
        </span>
      </div>
    </div>
  )
}

export function BookingModal({ center, onClose, onComplete }: BookingModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('details')

  const [date, setDate] = useState(getTodayStr())
  const [time, setTime] = useState('18:00')
  const [duration, setDuration] = useState(2)
  const [selectedSeats, setSelectedSeats] = useState<Set<number>>(new Set())
  const [selectedGame, setSelectedGame] = useState(GAMES[0].id)

  const [ageConfirmed, setAgeConfirmed] = useState(false)

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')

  // Stable occupied set per center (re-generated only when center changes)
  const occupiedSeats = useMemo(() => generateOccupied(center.pcCount), [center.id])

  const game = GAMES.find((g) => g.id === selectedGame) || GAMES[0]
  const seats = selectedSeats.size
  const totalPrice = center.pricePerHour * duration * Math.max(1, seats)

  function toggleSeat(i: number) {
    setSelectedSeats((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function handleBook() {
    setStep('confirm')
  }

  async function handleConfirm() {
    setStep('success')
    // Persist the booking so it shows up in the user's profile.
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user?.email,
          centerId: center.id,
          centerName: center.name,
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
      window.dispatchEvent(new Event('epc:bookings-updated'))
    } catch {
      /* booking still succeeds visually; ignore network error */
    }
  }

  function handleSubmitReview() {
    onComplete(center, { rating, comment })
  }

  const availableCount = center.pcCount - occupiedSeats.size

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
              {step === 'success' ? 'ЗАХИАЛГА АМЖИЛТТАЙ' : step === 'review' ? 'ҮНЭЛГЭЭ ӨГ' : 'ЗАХИАЛГА ӨГӨХ'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{center.name}</p>
              {step === 'details' && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: `${center.color}15`,
                    color: center.color,
                    border: `1px solid ${center.color}30`,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {center.pcCount} PC · {availableCount} сул
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

            {/* Date / Time / Duration */}
            <div className="grid grid-cols-3 gap-3">
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
                <label className="text-xs text-muted-foreground uppercase tracking-widest">Цаг</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-input border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-neon-cyan transition-colors"
                >
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">Хугацаа</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="bg-input border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-neon-cyan transition-colors"
                >
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} цаг</option>)}
                </select>
              </div>
            </div>

            {/* Interactive seat map */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                PC сонгох
                <span className="ml-2 normal-case" style={{ color: center.color }}>
                  ({center.pcCount} нийт)
                </span>
              </label>
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(11,11,15,0.8)',
                  border: `1px solid ${center.color}20`,
                }}
              >
                <SeatMap
                  total={center.pcCount}
                  selected={selectedSeats}
                  occupied={occupiedSeats}
                  onToggle={toggleSeat}
                  color={center.color}
                />
              </div>
            </div>

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
                {seats > 0 && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    {seats} PC × {duration}ц ×{' '}
                    <EcoinAmount amount={center.pricePerHour} color={center.color} size="sm" />
                  </span>
                )}
              </div>
              <EcoinAmount amount={totalPrice} color={center.color} size="lg" />
            </div>

            {/* 18+ age confirmation */}
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

            <button
              onClick={handleBook}
              disabled={seats === 0 || !ageConfirmed}
              className="py-3 rounded-xl font-black text-background tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: center.color,
                boxShadow: (seats === 0 || !ageConfirmed) ? 'none' : `0 0 20px ${center.color}50`,
                fontFamily: 'var(--font-heading)',
              }}
            >
              {seats === 0 ? 'PC СОНГОНО УУ' : !ageConfirmed ? '18+ БАТАЛГААЖУУЛНА УУ' : `${seats} PC ЗАХИАЛАХ`}
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
                  ['Заал', center.name],
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
            <div className="flex gap-3">
              <button
                onClick={() => setStep('details')}
                className="flex-1 py-3 rounded-xl font-bold border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                Буцах
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl font-black text-background tracking-widest transition-all duration-200"
                style={{ background: center.color, boxShadow: `0 0 20px ${center.color}50`, fontFamily: 'var(--font-heading)' }}
              >
                БАТАЛГААЖУУЛАХ
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
                {center.name} — {date}, {time} цагт{' '}
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
      </div>
    </div>
  )
}
