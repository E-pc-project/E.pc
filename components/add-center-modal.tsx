'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'
import { SelectField } from './ui/select-field'
import { useRooms, announceRoomsUpdated, type RoomDto } from '@/lib/use-rooms'

export interface EditCenterInput {
  id: number
  name: string
  location: string
  district: string
  phone: string
  specs: string
  openTime: string
  closeTime: string
  photo: string
}

interface AddCenterModalProps {
  onClose: () => void
  onCreated?: () => void
  editCenter?: EditCenterInput
}

const DISTRICTS = [
  'Багануур', 'Багахангай', 'Баянгол', 'Баянзүрх', 'Налайх',
  'Сонгинохайрхан', 'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй',
]
const GPU_OPTIONS = [
  'RTX 4090', 'RTX 4080 Super', 'RTX 4070 Ti', 'RTX 4070', 'RTX 4060 Ti',
  'RTX 3080', 'RTX 3070', 'RTX 3060', 'RX 7900 XTX', 'RX 6800 XT', 'Бусад',
]
const CPU_OPTIONS = [
  'Intel Core i9-14900K', 'Intel Core i7-14700K', 'Intel Core i5-14600K',
  'Intel Core i5-13400F', 'AMD Ryzen 9 7950X', 'AMD Ryzen 7 7800X3D',
  'AMD Ryzen 5 7600X', 'AMD Ryzen 5 5600', 'Бусад',
]
const RAM_OPTIONS = ['16GB DDR4', '32GB DDR4', '16GB DDR5', '32GB DDR5', '64GB DDR5']
const MONITOR_OPTIONS = [
  '1080p 144Hz', '1080p 165Hz', '1080p 240Hz',
  '1440p 144Hz', '1440p 165Hz', '1440p 240Hz', '4K 144Hz',
]
const TIME_OPTIONS = [
  '00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00',
  '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00',
]

const ACCENT = '#00e0ff'
const VIP_GOLD = '#f5b942'

// Shrinks + JPEG-compresses an uploaded photo client-side before it's sent
// as a data-URL — this project has no object storage configured, so a
// center's photo lives straight in the `centers.photo` TEXT column.
function resizeImageToDataUrl(file: File, maxWidth = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no canvas context'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

interface RoomDraft {
  name: string
  category: 'regular' | 'vip'
  seatCount: string
  pricePerHour: string
}

export function AddCenterModal({ onClose, onCreated, editCenter }: AddCenterModalProps) {
  const { user } = useAuth()
  const isEdit = Boolean(editCenter)
  // Split an existing specs string back into the four dropdown values.
  const specParts = (editCenter?.specs || '').split(' · ')
  const pick = (opts: string[]) => specParts.find((p) => opts.includes(p)) || ''

  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailed, setEmailed] = useState(false)

  // Center info
  const [name, setName] = useState(editCenter?.name || '')
  const [location, setLocation] = useState(editCenter?.location || '')
  const [district, setDistrict] = useState(editCenter?.district || '')
  const [phone, setPhone] = useState(editCenter?.phone || '')

  // Operating hours
  const [is24h, setIs24h] = useState(!(editCenter?.openTime && editCenter?.closeTime))
  const [openTime, setOpenTime] = useState(editCenter?.openTime || '09:00')
  const [closeTime, setCloseTime] = useState(editCenter?.closeTime || '23:00')

  // Photo
  const [photo, setPhoto] = useState(editCenter?.photo || '')
  const [photoError, setPhotoError] = useState('')

  // Rooms — new centers batch their initial rooms into the create request;
  // existing centers manage rooms independently (see ExistingRoomRow).
  const [roomDrafts, setRoomDrafts] = useState<RoomDraft[]>(
    isEdit ? [] : [{ name: '', category: 'regular', seatCount: '', pricePerHour: '' }],
  )
  const { rooms: existingRooms, loading: roomsLoading } = useRooms(
    isEdit ? String(editCenter!.id) : null,
  )

  // Specs (үзүүлэлт)
  const [gpu, setGpu] = useState(pick(GPU_OPTIONS))
  const [cpu, setCpu] = useState(pick(CPU_OPTIONS))
  const [ram, setRam] = useState(pick(RAM_OPTIONS))
  const [monitor, setMonitor] = useState(pick(MONITOR_OPTIONS))
  const [notes, setNotes] = useState('')

  const validRoomDrafts = roomDrafts.filter((r) => r.name.trim() && Number(r.seatCount) > 0)
  const canSubmit = Boolean(
    name && location && phone && !loading && (isEdit || validRoomDrafts.length > 0),
  )

  function buildSpecs(): string {
    return [gpu, cpu, ram, monitor].filter(Boolean).join(' · ')
  }

  function addRoomDraft() {
    setRoomDrafts((prev) => [...prev, { name: '', category: 'regular', seatCount: '', pricePerHour: '' }])
  }
  function updateRoomDraft(index: number, patch: Partial<RoomDraft>) {
    setRoomDrafts((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  function removeRoomDraft(index: number) {
    setRoomDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError('')
    try {
      setPhoto(await resizeImageToDataUrl(file))
    } catch {
      setPhotoError('Зураг боловсруулахад алдаа гарлаа.')
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/centers', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editCenter?.id,
          ownerName: user?.name,
          ownerEmail: user?.email,
          name,
          phone,
          specs: buildSpecs(),
          location,
          district,
          notes,
          openTime: is24h ? '' : openTime,
          closeTime: is24h ? '' : closeTime,
          photo,
          rooms: isEdit
            ? undefined
            : validRoomDrafts.map((r) => ({
                name: r.name.trim(),
                category: r.category,
                seatCount: Number(r.seatCount) || 0,
                pricePerHour: Number(r.pricePerHour) || 0,
              })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Илгээхэд алдаа гарлаа.')
        setLoading(false)
        return
      }
      setEmailed(Boolean(data.emailed))
      setStep('success')
      onCreated?.()
    } catch {
      setError('Сервертэй холбогдож чадсангүй.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/85 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg mx-2 sm:mx-0 rounded-t-2xl sm:rounded-2xl overflow-hidden float-in"
        style={{
          background: 'rgba(20,20,26,0.98)',
          border: `1px solid ${ACCENT}40`,
          boxShadow: `0 0 40px ${ACCENT}1f`,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top accent */}
        <div className="h-0.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${ACCENT}, #ff45c8)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: `${ACCENT}20` }}>
          <div>
            <h2 className="font-black text-lg" style={{ fontFamily: 'var(--font-heading)', color: ACCENT }}>
              {isEdit ? 'ТӨВ ЗАСАХ' : 'GAMING ТӨВ НЭМЭХ'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? 'Өөрийн төвийн мэдээллийг шинэчил'
                : 'Өөрийн PC gaming төвөө бүртгүүлж E.PC дээр харагдуул'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
            aria-label="Хаах"
          >
            ✕
          </button>
        </div>

        {step === 'success' ? (
          <div className="px-6 py-10 flex flex-col items-center gap-5 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: `${ACCENT}15`, border: `2px solid ${ACCENT}`, boxShadow: `0 0 30px ${ACCENT}40` }}
            >
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black mb-2" style={{ color: ACCENT, fontFamily: 'var(--font-heading)' }}>
                {isEdit ? 'АМЖИЛТТАЙ ЗАСАГДЛАА!' : 'АМЖИЛТТАЙ БҮРТГЭГДЛЭЭ!'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-foreground font-semibold">{name}</span>{' '}
                {isEdit ? 'төвийн мэдээлэл шинэчлэгдлээ.' : 'төв амжилттай бүртгэгдэж, мэдээлэл хадгалагдлаа.'}
              </p>
              {!isEdit && (
                <p className="text-xs mt-3" style={{ color: emailed ? ACCENT : '#9a9aae' }}>
                  {emailed
                    ? '✓ Мэдээлэл e.pc.project001@gmail.com хаягруу илгээгдлээ.'
                    : '• Мэдээлэл өгөгдлийн санд хадгалагдлаа (имэйл тохиргоо хийгдээгүй).'}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-black text-background"
              style={{ background: ACCENT, fontFamily: 'var(--font-heading)' }}
            >
              ХААХ
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
            {/* Section: Төвийн мэдээлэл */}
            <div className="flex flex-col gap-3">
              <SectionLabel label="Төвийн мэдээлэл" />
              <Field label="Төвийн нэр *">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Жишээ: CyberArena UB"
                  className={inputCls}
                />
              </Field>
              <Field label="Байршил (хаяг) *">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Дүүрэг, хороо, гудамж, байр..."
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Дүүрэг">
                  <SelectField value={district} onChange={setDistrict} options={DISTRICTS} className={inputCls} accent={ACCENT} />
                </Field>
                <Field label="Утас *">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9900-0000"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Section: Ажиллах цаг */}
            <div className="flex flex-col gap-3">
              <SectionLabel label="Ажиллах цаг" />
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={is24h}
                    onChange={(e) => setIs24h(e.target.checked)}
                  />
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                    style={{
                      background: is24h ? ACCENT : 'transparent',
                      border: is24h ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    {is24h && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="#0a0a0d" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-foreground">24 цагийн</span>
              </label>
              {!is24h && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Нээх цаг">
                    <SelectField value={openTime} onChange={setOpenTime} options={TIME_OPTIONS} className={inputCls} accent={ACCENT} />
                  </Field>
                  <Field label="Хаах цаг">
                    <SelectField value={closeTime} onChange={setCloseTime} options={TIME_OPTIONS} className={inputCls} accent={ACCENT} />
                  </Field>
                </div>
              )}
            </div>

            {/* Section: Зураг */}
            <div className="flex flex-col gap-3">
              <SectionLabel label="Зураг" />
              {photo ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="w-full h-32 object-cover rounded-lg" />
                  <button
                    onClick={() => setPhoto('')}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-white"
                    style={{ background: 'rgba(10,10,13,0.7)' }}
                    aria-label="Зураг хасах"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label
                  className="flex items-center justify-center h-24 rounded-lg border border-dashed cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  + Зураг сонгох
                </label>
              )}
              {photoError && <p className="text-xs text-red-400">{photoError}</p>}
            </div>

            {/* Section: Өрөөнүүд */}
            <div className="flex flex-col gap-3">
              <SectionLabel label="Өрөөнүүд" />
              <p className="text-xs text-muted-foreground -mt-1">
                PC-үүдээ өрөөгөөр ангилж, тус бүрд нь нэр, ангилал, суудлын тоо, цагийн үнэ өгнө үү.
              </p>

              {isEdit ? (
                <>
                  {roomsLoading ? (
                    <p className="text-xs text-muted-foreground">Уншиж байна...</p>
                  ) : (
                    existingRooms.map((room) => (
                      <ExistingRoomRow
                        key={room.id}
                        room={room}
                        ownerEmail={user?.email}
                      />
                    ))
                  )}
                  <NewRoomForm centerId={editCenter!.id} ownerEmail={user?.email} />
                </>
              ) : (
                <>
                  {roomDrafts.map((room, i) => (
                    <RoomDraftRow
                      key={i}
                      room={room}
                      onChange={(patch) => updateRoomDraft(i, patch)}
                      onRemove={roomDrafts.length > 1 ? () => removeRoomDraft(i) : undefined}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addRoomDraft}
                    className="py-2 rounded-lg text-xs font-bold border border-dashed transition-colors hover:bg-white/[0.03]"
                    style={{ borderColor: `${ACCENT}40`, color: ACCENT }}
                  >
                    + Өрөө нэмэх
                  </button>
                </>
              )}
            </div>

            {/* Section: Үзүүлэлт */}
            <div className="flex flex-col gap-3">
              <SectionLabel label="PC үзүүлэлт" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Видео карт (GPU)">
                  <SelectField value={gpu} onChange={setGpu} options={GPU_OPTIONS} className={inputCls} accent={ACCENT} />
                </Field>
                <Field label="Процессор (CPU)">
                  <SelectField value={cpu} onChange={setCpu} options={CPU_OPTIONS} className={inputCls} accent={ACCENT} />
                </Field>
                <Field label="RAM">
                  <SelectField value={ram} onChange={setRam} options={RAM_OPTIONS} className={inputCls} accent={ACCENT} />
                </Field>
                <Field label="Монитор">
                  <SelectField value={monitor} onChange={setMonitor} options={MONITOR_OPTIONS} className={inputCls} accent={ACCENT} />
                </Field>
              </div>
              <Field label="Нэмэлт тэмдэглэл">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Тусгай тоног төхөөрөмж, нэмэлт үйлчилгээ..."
                  rows={2}
                  className={`${inputCls} resize-none leading-relaxed`}
                />
              </Field>
            </div>

            {/* Live preview */}
            {(gpu || cpu || ram || monitor) && (
              <div className="rounded-xl px-4 py-3 flex flex-col gap-1.5" style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}20` }}>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Үзүүлэлт</p>
                <p className="text-sm font-medium" style={{ color: ACCENT }}>{buildSpecs()}</p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl font-black text-background tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: ACCENT,
                boxShadow: canSubmit ? `0 0 20px ${ACCENT}50` : 'none',
                fontFamily: 'var(--font-heading)',
              }}
            >
              {loading
                ? isEdit
                  ? 'ХАДГАЛЖ БАЙНА...'
                  : 'ИЛГЭЭЖ БАЙНА...'
                : !canSubmit
                  ? 'ШААРДЛАГАТАЙ ТАЛБАРЫГ БӨГЛӨНӨ ҮҮ'
                  : isEdit
                    ? 'ХАДГАЛАХ'
                    : 'БҮРТГҮҮЛЭХ'}
            </button>

            {!isEdit && (
              <p className="text-[11px] text-muted-foreground text-center pb-1">
                Бүртгүүлснээр мэдээлэл <span style={{ color: ACCENT }}>e.pc.project001@gmail.com</span> руу илгээгдэнэ.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-cyan transition-colors'

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1 h-3.5 rounded-full shrink-0" style={{ background: ACCENT }} />
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT, fontFamily: 'var(--font-heading)' }}>
        {label}
      </span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

function CategoryToggle({
  value,
  onChange,
}: {
  value: 'regular' | 'vip'
  onChange: (v: 'regular' | 'vip') => void
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('regular')}
        className="flex-1 py-1.5 rounded-md text-xs font-bold transition-colors"
        style={
          value === 'regular'
            ? { background: `${ACCENT}20`, border: `1px solid ${ACCENT}`, color: ACCENT }
            : { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#9a9aae' }
        }
      >
        Заал
      </button>
      <button
        type="button"
        onClick={() => onChange('vip')}
        className="flex-1 py-1.5 rounded-md text-xs font-bold transition-colors"
        style={
          value === 'vip'
            ? { background: `${VIP_GOLD}20`, border: `1px solid ${VIP_GOLD}`, color: VIP_GOLD }
            : { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#9a9aae' }
        }
      >
        VIP
      </button>
    </div>
  )
}

// A blank room row while creating a brand-new center — held in local state
// and submitted together with the center itself.
function RoomDraftRow({
  room,
  onChange,
  onRemove,
}: {
  room: RoomDraft
  onChange: (patch: Partial<RoomDraft>) => void
  onRemove?: () => void
}) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={room.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Жишээ: VIP1"
          className={`${inputCls} flex-1`}
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border transition-colors hover:border-neon-magenta"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#ff45c8' }}
            aria-label="Устгах"
          >
            ✕
          </button>
        )}
      </div>
      <CategoryToggle value={room.category} onChange={(category) => onChange({ category })} />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={room.seatCount}
          onChange={(e) => onChange({ seatCount: e.target.value })}
          placeholder="Суудлын тоо"
          min={1}
          className={inputCls}
        />
        <input
          type="number"
          value={room.pricePerHour}
          onChange={(e) => onChange({ pricePerHour: e.target.value })}
          placeholder="Цагийн үнэ (₮)"
          min={0}
          className={inputCls}
        />
      </div>
    </div>
  )
}

// An existing room on an already-created center — every change here is its
// own immediate API call (save/delete), independent of the center-info
// form's save button, so it never has to be diffed against bookings that
// already reference this room's id.
function ExistingRoomRow({ room, ownerEmail }: { room: RoomDto; ownerEmail?: string }) {
  const [name, setName] = useState(room.name)
  const [category, setCategory] = useState<'regular' | 'vip'>(room.category === 'vip' ? 'vip' : 'regular')
  const [seatCount, setSeatCount] = useState(String(room.seatCount))
  const [pricePerHour, setPricePerHour] = useState(String(room.pricePerHour))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty =
    name !== room.name ||
    category !== room.category ||
    seatCount !== String(room.seatCount) ||
    pricePerHour !== String(room.pricePerHour)

  async function save() {
    if (!ownerEmail || !name.trim() || !(Number(seatCount) > 0)) return
    setSaving(true)
    await fetch('/api/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: room.id,
        ownerEmail,
        name: name.trim(),
        category,
        seatCount: Number(seatCount) || 0,
        pricePerHour: Number(pricePerHour) || 0,
      }),
    })
    setSaving(false)
    announceRoomsUpdated()
  }

  async function del() {
    if (!ownerEmail) return
    await fetch(`/api/rooms?id=${room.id}&email=${encodeURIComponent(ownerEmail)}`, { method: 'DELETE' })
    announceRoomsUpdated()
  }

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputCls} flex-1`}
        />
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={del} className="px-2.5 py-1.5 rounded-md text-[11px] font-bold text-background" style={{ background: '#ff45c8' }}>
              Тийм
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1.5 rounded-md text-[11px] border border-border text-muted-foreground">
              Болих
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border transition-colors hover:border-neon-magenta"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#ff45c8' }}
            aria-label="Устгах"
          >
            ✕
          </button>
        )}
      </div>
      <CategoryToggle value={category} onChange={setCategory} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={seatCount} onChange={(e) => setSeatCount(e.target.value)} min={1} className={inputCls} />
        <input type="number" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} min={0} className={inputCls} />
      </div>
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="py-1.5 rounded-md text-xs font-bold text-background disabled:opacity-40"
          style={{ background: ACCENT }}
        >
          {saving ? 'ХАДГАЛЖ БАЙНА...' : 'ӨӨРЧЛӨЛТ ХАДГАЛАХ'}
        </button>
      )}
    </div>
  )
}

// The "add a new room" mini-form on an already-created center — posts
// immediately on its own, independent of the main save button.
function NewRoomForm({ centerId, ownerEmail }: { centerId: number; ownerEmail?: string }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'regular' | 'vip'>('regular')
  const [seatCount, setSeatCount] = useState('')
  const [pricePerHour, setPricePerHour] = useState('')
  const [saving, setSaving] = useState(false)

  const canAdd = Boolean(ownerEmail && name.trim() && Number(seatCount) > 0 && !saving)

  async function add() {
    if (!canAdd) return
    setSaving(true)
    await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centerId,
        ownerEmail,
        name: name.trim(),
        category,
        seatCount: Number(seatCount) || 0,
        pricePerHour: Number(pricePerHour) || 0,
      }),
    })
    setSaving(false)
    setName('')
    setCategory('regular')
    setSeatCount('')
    setPricePerHour('')
    announceRoomsUpdated()
  }

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2 border border-dashed" style={{ borderColor: `${ACCENT}40` }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Шинэ өрөөний нэр"
        className={inputCls}
      />
      <CategoryToggle value={category} onChange={setCategory} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={seatCount} onChange={(e) => setSeatCount(e.target.value)} placeholder="Суудлын тоо" min={1} className={inputCls} />
        <input type="number" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} placeholder="Цагийн үнэ (₮)" min={0} className={inputCls} />
      </div>
      <button
        type="button"
        onClick={add}
        disabled={!canAdd}
        className="py-1.5 rounded-md text-xs font-bold text-background disabled:opacity-40"
        style={{ background: ACCENT }}
      >
        + Өрөө нэмэх
      </button>
    </div>
  )
}
