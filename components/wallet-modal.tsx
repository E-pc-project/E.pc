'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'
import { useWallet, announceWalletBalance } from '@/lib/use-wallet'

const ACCENT = '#00e0ff'

const TOPUP_AMOUNTS = [10000, 20000, 50000, 100000]

const METHODS = [
  { id: 'qpay', label: 'QPay', color: '#ff3b5c' },
  { id: 'monpay', label: 'MonPay', color: '#00d6a4' },
] as const

type MethodId = (typeof METHODS)[number]['id']
type Step = 'main' | 'topup' | 'processing' | 'success'

// Neon ecoin badge (circle-E icon + amount)
function EcoinBalance({ amount, size = 'lg' }: { amount: number; size?: 'sm' | 'lg' }) {
  const big = size === 'lg'
  return (
    <span
      className="inline-flex items-center gap-2 font-black"
      style={{
        color: ACCENT,
        fontFamily: 'var(--font-heading)',
        fontSize: big ? '2.2rem' : '1rem',
        textShadow: `0 0 12px ${ACCENT}90, 0 0 30px ${ACCENT}40`,
      }}
    >
      <svg
        width={big ? 34 : 16}
        height={big ? 34 : 16}
        viewBox="0 0 20 20"
        fill="none"
        style={{ filter: `drop-shadow(0 0 5px ${ACCENT})`, flexShrink: 0 }}
      >
        <circle cx="10" cy="10" r="8.5" fill={`${ACCENT}22`} stroke={ACCENT} strokeWidth="1.6" />
        <text
          x="10"
          y="14"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fill={ACCENT}
          fontFamily="var(--font-heading)"
        >
          E
        </text>
      </svg>
      {amount.toLocaleString()}
      <span style={{ fontSize: '0.4em', fontWeight: 700, opacity: 0.8, textShadow: 'none' }}>
        ecoin
      </span>
    </span>
  )
}

interface WalletModalProps {
  onClose: () => void
}

export function WalletModal({ onClose }: WalletModalProps) {
  const { user } = useAuth()
  const { balance, loading } = useWallet(user?.email)

  const [step, setStep] = useState<Step>('main')
  const [amount, setAmount] = useState<number | null>(null)
  const [method, setMethod] = useState<MethodId | null>(null)
  const [error, setError] = useState('')
  const [paid, setPaid] = useState<{ amount: number; method: MethodId } | null>(null)

  const canPay = amount !== null && method !== null

  async function handlePay() {
    if (!canPay || !user?.email) return
    setStep('processing')
    setError('')
    try {
      // Small delay so the processing state is visible (demo payment).
      const [res] = await Promise.all([
        fetch('/api/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, amount, method }),
        }),
        new Promise((r) => setTimeout(r, 1200)),
      ])
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Төлбөр амжилтгүй боллоо.')
        setStep('topup')
        return
      }
      setPaid({ amount: amount!, method: method! })
      // Push the server-confirmed post-topup balance directly (see use-wallet.ts).
      announceWalletBalance(data.balance)
      setStep('success')
    } catch {
      setError('Сервертэй холбогдож чадсангүй.')
      setStep('topup')
    }
  }

  function backToMain() {
    setStep('main')
    setAmount(null)
    setMethod(null)
    setError('')
    setPaid(null)
  }

  const methodInfo = METHODS.find((m) => m.id === (paid?.method ?? method))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/85 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md mx-2 sm:mx-0 rounded-t-2xl sm:rounded-2xl overflow-hidden float-in"
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
          <div>
            <h2 className="font-black text-lg" style={{ fontFamily: 'var(--font-heading)', color: ACCENT }}>
              ХЭТЭВЧ
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ecoin үлдэгдэл ба цэнэглэлт</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
            aria-label="Хаах"
          >
            ✕
          </button>
        </div>

        {/* Step: main — balance + top-up entry */}
        {step === 'main' && (
          <div className="px-6 py-8 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Таны үлдэгдэл</p>
              <EcoinBalance amount={loading ? 0 : balance} />
              <p className="text-[11px] text-muted-foreground">1 ecoin = 1₮</p>
            </div>
            <button
              onClick={() => setStep('topup')}
              className="w-full py-3 rounded-xl font-black text-background tracking-widest neon-glow-btn transition-all duration-200"
              style={{ background: ACCENT, fontFamily: 'var(--font-heading)' }}
            >
              + ЦЭНЭГЛЭХ
            </button>
          </div>
        )}

        {/* Step: topup — pick amount + payment method */}
        {step === 'topup' && (
          <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
            {/* Amount */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full shrink-0" style={{ background: ACCENT }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT, fontFamily: 'var(--font-heading)' }}>
                  Цэнэглэх дүн
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TOPUP_AMOUNTS.map((a) => {
                  const selected = amount === a
                  return (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className="rounded-xl px-4 py-4 text-center transition-all duration-150"
                      style={{
                        background: selected ? `${ACCENT}15` : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${selected ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                        boxShadow: selected ? `0 0 14px ${ACCENT}40` : 'none',
                      }}
                    >
                      <span
                        className="block text-lg font-black"
                        style={{ color: selected ? ACCENT : '#f0f2f5', fontFamily: 'var(--font-heading)' }}
                      >
                        {a.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-muted-foreground">₮ → {a.toLocaleString()} ecoin</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Payment method */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full shrink-0" style={{ background: '#ff45c8' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ff45c8', fontFamily: 'var(--font-heading)' }}>
                  Төлбөрийн хэрэгсэл
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {METHODS.map((m) => {
                  const selected = method === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className="rounded-xl px-4 py-4 flex items-center justify-center transition-all duration-150"
                      style={{
                        background: selected ? `${m.color}15` : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${selected ? m.color : 'rgba(255,255,255,0.1)'}`,
                        boxShadow: selected ? `0 0 14px ${m.color}40` : 'none',
                      }}
                    >
                      <span
                        className="text-base font-black tracking-wide"
                        style={{ color: m.color, fontFamily: 'var(--font-heading)' }}
                      >
                        {m.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Pay button — activates once amount + method are chosen */}
            <button
              onClick={handlePay}
              disabled={!canPay}
              className="w-full py-3 rounded-xl font-black text-background tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canPay && methodInfo ? methodInfo.color : ACCENT,
                boxShadow: canPay && methodInfo ? `0 0 20px ${methodInfo.color}50` : 'none',
                fontFamily: 'var(--font-heading)',
              }}
            >
              {amount === null
                ? 'ДҮН СОНГОНО УУ'
                : method === null
                  ? 'ТӨЛБӨРИЙН ХЭРЭГСЭЛ СОНГОНО УУ'
                  : `ТӨЛБӨР ТӨЛӨХ — ${amount.toLocaleString()}₮`}
            </button>

            <button
              onClick={backToMain}
              className="w-full py-2.5 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              ← Буцах
            </button>

            <p className="text-[11px] text-muted-foreground text-center pb-1">
              Демо горим — жинхэнэ төлбөр татагдахгүй.
            </p>
          </div>
        )}

        {/* Step: processing */}
        {step === 'processing' && (
          <div className="px-6 py-14 flex flex-col items-center gap-5 text-center">
            <div
              className="w-16 h-16 rounded-full neon-pulse flex items-center justify-center"
              style={{ border: `2px solid ${methodInfo?.color ?? ACCENT}`, boxShadow: `0 0 24px ${methodInfo?.color ?? ACCENT}50` }}
            >
              <span
                className="text-xl font-black"
                style={{ color: methodInfo?.color ?? ACCENT, fontFamily: 'var(--font-heading)' }}
              >
                {methodInfo?.label.charAt(0) ?? 'E'}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1">
                {methodInfo?.label}-ээр төлбөр боловсруулж байна...
              </p>
              <p className="text-xs text-muted-foreground">Түр хүлээнэ үү.</p>
            </div>
          </div>
        )}

        {/* Step: success */}
        {step === 'success' && paid && (
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
                ЦЭНЭГЛЭЛТ АМЖИЛТТАЙ!
              </h3>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold" style={{ color: methodInfo?.color }}>{methodInfo?.label}</span>
                -ээр <span className="text-foreground font-semibold">+{paid.amount.toLocaleString()} ecoin</span> цэнэглэгдлээ.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Шинэ үлдэгдэл</p>
              <EcoinBalance amount={balance} />
            </div>
            <button
              onClick={backToMain}
              className="w-full py-3 rounded-xl font-black text-background"
              style={{ background: ACCENT, fontFamily: 'var(--font-heading)' }}
            >
              ХЭТЭВЧ РҮҮ БУЦАХ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
