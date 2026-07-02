'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'
import { useNotifications } from '@/lib/use-notifications'

const ACCENT = '#00e0ff'

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'саяхан'
  if (min < 60) return `${min} минутын өмнө`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} цагийн өмнө`
  const day = Math.floor(hr / 24)
  return `${day} өдрийн өмнө`
}

/** Bell icon + unread badge, admins only — new-booking notifications for their centers. */
export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.email)
  const [open, setOpen] = useState(false)

  if (!user?.isAdmin) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full border transition-colors hover:border-neon-cyan"
        style={{ borderColor: 'rgba(0,224,255,0.25)', background: 'rgba(0,224,255,0.06)' }}
        title="Мэдэгдэл"
        aria-label="Мэдэгдэл"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={ACCENT} strokeWidth="1.4">
          <path
            d="M8 1.5c-1.9 0-3.2 1.5-3.2 3.4v2c0 .6-.3 1.5-.7 2l-.8 1c-.3.4 0 1 .5 1h8.4c.5 0 .8-.6.5-1l-.8-1c-.4-.5-.7-1.4-.7-2v-2c0-1.9-1.3-3.4-3.2-3.4z"
            strokeLinejoin="round"
          />
          <path d="M6.5 13a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-background"
            style={{ background: '#ff45c8', fontFamily: 'var(--font-heading)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-11 z-50 w-80 max-w-[88vw] rounded-2xl overflow-hidden float-in"
            style={{
              background: 'rgba(20,20,26,0.98)',
              border: `1px solid ${ACCENT}40`,
              boxShadow: `0 0 40px ${ACCENT}1f, 0 8px 32px rgba(0,0,0,0.8)`,
            }}
          >
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, #ff45c8)` }} />
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `${ACCENT}20` }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT, fontFamily: 'var(--font-heading)' }}>
                Мэдэгдэл
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Бүгдийг уншсан
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">Мэдэгдэл алга</div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className="w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-muted"
                    style={{ borderColor: 'rgba(255,255,255,0.06)', background: n.read ? 'transparent' : 'rgba(0,224,255,0.05)' }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#ff45c8' }} />}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                          {n.title}
                        </p>
                        {n.body && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1 opacity-70">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
