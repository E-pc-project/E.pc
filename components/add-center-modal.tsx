'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'
import { SelectField } from './ui/select-field'

export interface EditCenterInput {
  id: number
  name: string
  location: string
  district: string
  phone: string
  pcCount: number
  pricePerHour: number
  specs: string
  vipSeats: number[]
  vipPricePerHour: number
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

const ACCENT = '#00e0ff'
const VIP_GOLD = '#f5b942'

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
  const [pcCount, setPcCount] = useState(editCenter ? String(editCenter.pcCount) : '')
  const [pricePerHour, setPricePerHour] = useState(
    editCenter?.pricePerHour ? String(editCenter.pricePerHour) : '',
  )
  const [vipSeats, setVipSeats] = useState<Set<number>>(new Set(editCenter?.vipSeats || []))
  const [vipPricePerHour, setVipPricePerHour] = useState(
    editCenter?.vipPricePerHour ? String(editCenter.vipPricePerHour) : '',
  )

  // Specs (үзүүлэлт)
  const [gpu, setGpu] = useState(pick(GPU_OPTIONS))
  const [cpu, setCpu] = useState(pick(CPU_OPTIONS))
  const [ram, setRam] = useState(pick(RAM_OPTIONS))
  const [monitor, setMonitor] = useState(pick(MONITOR_OPTIONS))
  const [notes, setNotes] = useState('')

  const canSubmit = name && location && phone && pcCount && !loading
  const pcCountNum = Number(pcCount) || 0

  function buildSpecs(): string {
    return [gpu, cpu, ram, monitor].filter(Boolean).join(' · ')
  }

  function toggleVipSeat(n: number) {
    setVipSeats((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
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
          pcCount: Number(pcCount),
          specs: buildSpecs(),
          location,
          district,
          pricePerHour: pricePerHour ? Number(pricePerHour) : 0,
          notes,
          vipSeats: Array.from(vipSeats).filter((n) => n <= pcCountNum),
          vipPricePerHour: vipPricePerHour ? Number(vipPricePerHour) : 0,
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="PC-ийн тоо *">
                  <input
                    type="number"
                    value={pcCount}
                    onChange={(e) => setPcCount(e.target.value)}
                    placeholder="40"
                    min={1}
                    className={inputCls}
                  />
                </Field>
                <Field label="Цагийн үнэ (₮)">
                  <input
                    type="number"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(e.target.value)}
                    placeholder="2500"
                    min={0}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Section: VIP суудал */}
            <div className="flex flex-col gap-3">
              <SectionLabel label="VIP суудал" />
              {pcCountNum > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground -mt-1">
                    VIP болгох PC-г дарж сонгоно уу ({vipSeats.size} сонгосон)
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                    {Array.from({ length: pcCountNum }, (_, i) => i + 1).map((n) => {
                      const active = vipSeats.has(n)
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleVipSeat(n)}
                          className="w-7 h-7 rounded-md text-[10px] font-bold shrink-0 transition-colors"
                          style={
                            active
                              ? { background: `${VIP_GOLD}2e`, border: `1.5px solid ${VIP_GOLD}`, color: VIP_GOLD }
                              : {
                                  background: 'rgba(255,255,255,0.045)',
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  color: 'rgba(255,255,255,0.4)',
                                }
                          }
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                  {vipSeats.size > 0 && (
                    <Field label="VIP цагийн үнэ (₮)">
                      <input
                        type="number"
                        value={vipPricePerHour}
                        onChange={(e) => setVipPricePerHour(e.target.value)}
                        placeholder={pricePerHour || '3500'}
                        min={0}
                        className={inputCls}
                      />
                    </Field>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground -mt-1">
                  Эхлээд PC-ийн тоог оруулснаар VIP суудал сонгох боломжтой болно.
                </p>
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
