'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  name: string
  email: string
}

interface AuthResult {
  ok: boolean
  error?: string
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string) => Promise<AuthResult>
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
  ): Promise<AuthResult> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Бүртгэлд алдаа гарлаа.' }
      persist(data.user)
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
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
