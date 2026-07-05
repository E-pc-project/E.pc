'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  name: string
  email: string
  isAdmin: boolean
  isDev: boolean
}

interface AuthResult {
  ok: boolean
  error?: string
}

interface OtpRequestResult {
  ok: boolean
  error?: string
  demoCode?: string
  exists?: boolean
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<AuthResult>
  register: (
    name: string,
    email: string,
    password: string,
    adminCode?: string,
  ) => Promise<AuthResult>
  requestOtp: (phone: string) => Promise<OtpRequestResult>
  verifyOtp: (phone: string, code: string, name?: string) => Promise<AuthResult>
  deleteAccount: (password: string) => Promise<AuthResult>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Only the active session is kept on the client; accounts live in the DB.
const STORAGE_KEY = 'epc_session'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setIsLoading(false)
  }, [])

  function persist(u: User) {
    setUser(u)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    } catch {}
  }

  async function login(email: string, password: string): Promise<AuthResult> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Нэвтрэхэд алдаа гарлаа.' }
      persist(data.user)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Сервертэй холбогдож чадсангүй.' }
    }
  }

  async function register(
    name: string,
    email: string,
    password: string,
    adminCode?: string,
  ): Promise<AuthResult> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, adminCode }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Бүртгэлд алдаа гарлаа.' }
      persist(data.user)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Сервертэй холбогдож чадсангүй.' }
    }
  }

  async function requestOtp(phone: string): Promise<OtpRequestResult> {
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Код илгээхэд алдаа гарлаа.' }
      return { ok: true, demoCode: data.demoCode, exists: data.exists }
    } catch {
      return { ok: false, error: 'Сервертэй холбогдож чадсангүй.' }
    }
  }

  async function verifyOtp(phone: string, code: string, name?: string): Promise<AuthResult> {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, name }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Баталгаажуулахад алдаа гарлаа.' }
      persist(data.user)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Сервертэй холбогдож чадсангүй.' }
    }
  }

  async function deleteAccount(password: string): Promise<AuthResult> {
    if (!user?.email) return { ok: false, error: 'Нэвтрээгүй байна.' }
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Устгахад алдаа гарлаа.' }
      logout()
      return { ok: true }
    } catch {
      return { ok: false, error: 'Сервертэй холбогдож чадсангүй.' }
    }
  }

  function logout() {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{ user, login, register, requestOtp, verifyOtp, deleteAccount, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
