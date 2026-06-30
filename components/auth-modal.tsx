'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'

export function AuthModal() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result =
      mode === 'register'
        ? await register(name, email, password)
        : await login(email, password)
    if (!result.ok) setError(result.error || 'Алдаа гарлаа.')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
      {/* Animated grid background */}
      <div className="cyber-grid absolute inset-0 opacity-30" />

      {/* Floating neon orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full neon-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(0,224,255,0.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full neon-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(255,69,200,0.06) 0%, transparent 70%)',
          animationDelay: '1.2s',
        }}
      />

      <div className="relative w-full max-w-md mx-4 float-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-black tracking-widest glitch neon-text-cyan"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            E.PC
          </h1>
          <p className="text-muted-foreground text-sm mt-2 tracking-widest uppercase">
            eSports Center Platform
          </p>
        </div>

        <div className="glass-card rounded-xl p-8 relative cyber-corner">
          {/* Tab switcher */}
          <div className="flex mb-6 bg-muted rounded-lg p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'bg-neon-cyan text-background font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">
                  Нэр
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Таны нэр"
                  className="bg-input border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                И-мэйл
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="bg-input border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                Нууц үг
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-input border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3 rounded-lg font-bold text-background bg-neon-cyan neon-glow-btn transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed tracking-wider"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {loading ? 'Уншиж байна...' : mode === 'login' ? 'НЭВТРЭХ' : 'БҮРТГҮҮЛЭХ'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            {mode === 'login' ? 'Бүртгэл байхгүй юу?' : 'Бүртгэлтэй юу?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="text-neon-cyan underline underline-offset-2"
            >
              {mode === 'login' ? 'Бүртгүүлэх' : 'Нэвтрэх'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 opacity-50">
          © 2025 E.PC — All rights reserved
        </p>
      </div>
    </div>
  )
}
