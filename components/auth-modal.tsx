'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'phone-request' | 'phone-verify'
type Method = 'email' | 'phone'

const inputCls =
  'bg-input border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors'

export function AuthModal() {
  const { login, register, requestOtp, verifyOtp } = useAuth()
  const [method, setMethod] = useState<Method>('email')
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otpExists, setOtpExists] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setInfo('')
  }

  function switchMethod(m: Method) {
    setMethod(m)
    setMode(m === 'email' ? 'login' : 'phone-request')
    setError('')
    setInfo('')
    setCode('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'register') {
        const r = await register(name, email, password, adminCode.trim() || undefined)
        if (!r.ok) setError(r.error || 'Алдаа гарлаа.')
      } else if (mode === 'login') {
        const r = await login(email, password)
        if (!r.ok) setError(r.error || 'Алдаа гарлаа.')
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()
        if (!res.ok) setError(data.error || 'Алдаа гарлаа.')
        else {
          setMode('reset')
          setInfo(
            data.emailed
              ? `6 оронтой код ${email} хаягруу илгээгдлээ. И-мэйлээ шалгана уу.`
              : 'Имэйл (SMTP) тохируулаагүй тул код серверийн console-д хэвлэгдлээ.',
          )
        }
      } else if (mode === 'reset') {
        const res = await fetch('/api/auth/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, newPassword }),
        })
        const data = await res.json()
        if (!res.ok) setError(data.error || 'Алдаа гарлаа.')
        else {
          setPassword('')
          setNewPassword('')
          setCode('')
          setMode('login')
          setInfo('Нууц үг амжилттай солигдлоо. Одоо нэвтэрнэ үү.')
        }
      } else if (mode === 'phone-request') {
        const r = await requestOtp(phone)
        if (!r.ok) setError(r.error || 'Алдаа гарлаа.')
        else {
          setOtpExists(Boolean(r.exists))
          setMode('phone-verify')
          setInfo(
            `Демо горим: бодит SMS илгээгээгүй тул баталгаажуулах код доор шууд харагдаж байна — ${r.demoCode}`,
          )
        }
      } else if (mode === 'phone-verify') {
        const r = await verifyOtp(phone, code, otpExists ? undefined : name)
        if (!r.ok) setError(r.error || 'Алдаа гарлаа.')
      }
    } finally {
      setLoading(false)
    }
  }

  const isAuthTabs = mode === 'login' || mode === 'register'
  const isPhoneFlow = mode === 'phone-request' || mode === 'phone-verify'

  const submitLabel = loading
    ? 'Уншиж байна...'
    : mode === 'login'
      ? 'НЭВТРЭХ'
      : mode === 'register'
        ? 'БҮРТГҮҮЛЭХ'
        : mode === 'forgot'
          ? 'КОД ИЛГЭЭХ'
          : mode === 'reset'
            ? 'НУУЦ ҮГ СОЛИХ'
            : mode === 'phone-request'
              ? 'КОД АВАХ'
              : 'БАТАЛГААЖУУЛАХ'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
      <div className="cyber-grid absolute inset-0 opacity-30" />
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full neon-pulse"
        style={{ background: 'radial-gradient(circle, rgba(0,224,255,0.08) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full neon-pulse"
        style={{ background: 'radial-gradient(circle, rgba(255,69,200,0.06) 0%, transparent 70%)', animationDelay: '1.2s' }}
      />

      <div className="relative w-full max-w-md mx-4 float-in">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-widest glitch neon-text-cyan" style={{ fontFamily: 'var(--font-heading)' }}>
            E.PC
          </h1>
          <p className="text-muted-foreground text-sm mt-2 tracking-widest uppercase">
            eSports Center Platform
          </p>
        </div>

        <div className="glass-card rounded-xl p-8 relative cyber-corner">
          {(isAuthTabs || isPhoneFlow) && (
            <div className="flex mb-4 bg-muted rounded-lg p-1">
              {(['email', 'phone'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMethod(m)}
                  className={`flex-1 py-2 rounded-md text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
                    method === m ? 'bg-neon-magenta text-background font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'email' ? 'И-мэйл' : 'Утас'}
                </button>
              ))}
            </div>
          )}

          {isPhoneFlow ? (
            <div className="mb-6">
              <h2 className="text-lg font-black neon-text-cyan" style={{ fontFamily: 'var(--font-heading)' }}>
                УТАСНЫ ДУГААРААР
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'phone-request'
                  ? 'Утасны дугаараа оруулбал 6 оронтой баталгаажуулах код илгээнэ.'
                  : otpExists
                    ? 'Ирсэн кодоо оруулж нэвтэрнэ үү.'
                    : 'Шинэ хэрэглэгч байна — нэрээ болон ирсэн кодоо оруулна уу.'}
              </p>
            </div>
          ) : isAuthTabs ? (
            <div className="flex mb-6 bg-muted rounded-lg p-1">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    mode === m ? 'bg-neon-cyan text-background font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-lg font-black neon-text-cyan" style={{ fontFamily: 'var(--font-heading)' }}>
                {mode === 'forgot' ? 'НУУЦ ҮГ СЭРГЭЭХ' : 'ШИНЭ НУУЦ ҮГ'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'forgot'
                  ? 'И-мэйлээ оруулбал 6 оронтой код илгээнэ.'
                  : 'И-мэйл рүү ирсэн кодоо оруулж шинэ нууц үгээ тавь.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <Field label="Нэр">
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Таны нэр" className={inputCls} />
              </Field>
            )}

            {!isPhoneFlow && (mode !== 'reset' ? (
              <Field label="И-мэйл">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className={inputCls} />
              </Field>
            ) : (
              <Field label="И-мэйл">
                <input type="email" value={email} readOnly className={`${inputCls} opacity-70`} />
              </Field>
            ))}

            {(mode === 'login' || mode === 'register') && (
              <Field label="Нууц үг">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
              </Field>
            )}

            {mode === 'phone-request' && (
              <Field label="Утасны дугаар">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
                  placeholder="99112233"
                  inputMode="numeric"
                  className={inputCls}
                />
              </Field>
            )}

            {mode === 'phone-verify' && (
              <>
                <Field label="Утасны дугаар">
                  <input type="tel" value={phone} readOnly className={`${inputCls} opacity-70`} />
                </Field>
                {!otpExists && (
                  <Field label="Нэр">
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Таны нэр" className={inputCls} />
                  </Field>
                )}
                <Field label="6 оронтой код">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    className={`${inputCls} tracking-[0.5em] text-center text-lg font-bold`}
                  />
                </Field>
              </>
            )}

            {mode === 'reset' && (
              <>
                <Field label="6 оронтой код">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    className={`${inputCls} tracking-[0.5em] text-center text-lg font-bold`}
                  />
                </Field>
                <Field label="Шинэ нууц үг">
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                </Field>
              </>
            )}

            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">
                  Админ / Dev код <span className="lowercase tracking-normal text-[10px]">(заавал биш)</span>
                </label>
                <input
                  type="text"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Админ эсвэл developer код"
                  className={`${inputCls} focus:border-neon-magenta focus:ring-neon-magenta`}
                  style={{ borderColor: 'rgba(255,69,200,0.25)' }}
                />
                <p className="text-[11px] text-muted-foreground">
                  <span style={{ color: '#ff45c8' }}>Админ</span> — өөрийн төв нэмж удирдана.{' '}
                  <span style={{ color: '#ff45c8' }}>Developer</span> — бүх төвийг удирдана. Хоосон бол энгийн хэрэглэгч.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            {info && (
              <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{info}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3 rounded-lg font-bold text-background bg-neon-cyan neon-glow-btn transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed tracking-wider"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {submitLabel}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              <button onClick={() => switchMode('forgot')} className="text-neon-magenta underline underline-offset-2">
                Нууц үг мартсан уу?
              </button>
            </p>
          )}

          {isAuthTabs ? (
            <p className="text-center text-xs text-muted-foreground mt-3">
              {mode === 'login' ? 'Бүртгэл байхгүй юу?' : 'Бүртгэлтэй юу?'}{' '}
              <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="text-neon-cyan underline underline-offset-2">
                {mode === 'login' ? 'Бүртгүүлэх' : 'Нэвтрэх'}
              </button>
            </p>
          ) : isPhoneFlow ? (
            mode === 'phone-verify' && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                <button onClick={() => switchMode('phone-request')} className="text-neon-cyan underline underline-offset-2">
                  ← Дугаараа солих
                </button>
              </p>
            )
          ) : (
            <p className="text-center text-xs text-muted-foreground mt-4">
              {mode === 'reset' && (
                <button onClick={() => switchMode('forgot')} className="text-neon-cyan underline underline-offset-2 mr-3">
                  Дахин код авах
                </button>
              )}
              <button onClick={() => switchMode('login')} className="text-neon-cyan underline underline-offset-2">
                ← Нэвтрэх рүү буцах
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 opacity-50">
          © 2025 E.PC — All rights reserved
        </p>
      </div>
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
