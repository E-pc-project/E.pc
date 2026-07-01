'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'

const NAV_LINKS = [
  { label: 'Нүүр', href: '#hero' },
  { label: 'Тоглоомууд', href: '#games' },
  { label: 'Төвүүд', href: '#community' },
  { label: 'Захиалга', href: '#booking' },
]

interface SiteHeaderProps {
  onRegisterPC: () => void
  onProfile: () => void
  onDevPanel: () => void
}

export function SiteHeader({ onRegisterPC, onProfile, onDevPanel }: SiteHeaderProps) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  function scrollTo(href: string) {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <button
          onClick={() => scrollTo('#hero')}
          className="flex items-center gap-2 group"
        >
          <span
            className="text-2xl font-black tracking-widest neon-text-cyan glitch"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            E.PC
          </span>
          <span className="hidden sm:block text-xs text-muted-foreground uppercase tracking-widest">
            eSports Center
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-neon-cyan transition-colors duration-200 rounded-lg hover:bg-muted relative group"
            >
              {link.label}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-px bg-neon-cyan group-hover:w-3/4 transition-all duration-300" />
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Developer panel — devs only */}
          {user?.isDev && (
            <button
              onClick={onDevPanel}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 hover:bg-muted"
              style={{
                borderColor: 'rgba(255,69,200,0.4)',
                color: '#ff45c8',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.05em',
              }}
            >
              <span className="text-[9px] px-1 py-0.5 rounded border" style={{ borderColor: '#ff45c8' }}>DEV</span>
              БҮХ ТӨВ
            </button>
          )}

          {/* Add center — admins only */}
          {user?.isAdmin && (
            <button
              onClick={onRegisterPC}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-200 hover:bg-muted"
              style={{
                borderColor: 'rgba(0,224,255,0.35)',
                color: '#00e0ff',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.05em',
              }}
            >
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9v1h2v1H5v-1h2v-1H2a1 1 0 0 1-1-1V3zm1 0v7h12V3H2z"/>
              </svg>
              ТӨВ НЭМЭХ
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onProfile}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border transition-colors hover:border-neon-cyan group"
                style={{ borderColor: 'rgba(0,224,255,0.25)' }}
                title="Миний хэсэг"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-background shrink-0"
                  style={{ background: '#00e0ff', fontFamily: 'var(--font-heading)' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:block text-sm text-neon-cyan font-semibold max-w-[120px] truncate">
                  {user.name}
                </span>
              </button>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-neon-magenta hover:border-neon-magenta transition-colors duration-200"
              >
                Гарах
              </button>
            </div>
          ) : null}

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-5 h-px bg-neon-cyan transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}
            />
            <span
              className={`block w-5 h-px bg-neon-cyan transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}
            />
            <span
              className={`block w-5 h-px bg-neon-cyan transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass-card border-t border-border px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-neon-cyan hover:bg-muted rounded-lg transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
