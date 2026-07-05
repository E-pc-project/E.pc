'use client'

import { useState } from 'react'
import { useAuth } from './auth-context'
import { useCenters } from '@/lib/use-centers'
import { type EditCenterInput } from './add-center-modal'

interface DevDashboardModalProps {
  onClose: () => void
  onEditCenter: (center: EditCenterInput) => void
}

const ACCENT = '#ff45c8'

export function DevDashboardModal({ onClose, onEditCenter }: DevDashboardModalProps) {
  const { user } = useAuth()
  const { raw, loading } = useCenters()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(dbId: string) {
    if (!user?.email) return
    try {
      await fetch(`/api/centers?id=${dbId}&email=${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
      })
      setConfirmId(null)
      window.dispatchEvent(new Event('epc:centers-updated'))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/85 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl mx-2 sm:mx-0 rounded-t-2xl sm:rounded-2xl overflow-hidden float-in"
        style={{
          background: 'rgba(20,20,26,0.98)',
          border: `1px solid ${ACCENT}40`,
          boxShadow: `0 0 40px ${ACCENT}1f`,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="h-0.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${ACCENT}, #00e0ff)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: `${ACCENT}20` }}>
          <div>
            <h2 className="font-black text-lg flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)', color: ACCENT }}>
              <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: ACCENT }}>DEV</span>
              БҮХ ТӨВИЙН УДИРДЛАГА
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Хөгжүүлэгчийн эрх — аль ч төвийг засах / устгах
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

        {/* Count */}
        <div className="px-6 py-3 shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-2xl font-black neon-text-magenta" style={{ fontFamily: 'var(--font-heading)' }}>
            {raw.length}
          </span>
          <span className="text-xs text-muted-foreground ml-2">нийт бүртгэлтэй төв</span>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Уншиж байна...</div>
          ) : raw.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Одоогоор бүртгэгдсэн төв алга.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {raw.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}30` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {c.district || c.location} · {c.totalSeats} PC · ₮{(c.priceFrom || 0).toLocaleString()}-с/цаг
                      </p>
                      {c.specs && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.specs}</p>}
                      <p className="text-[11px] mt-1" style={{ color: c.color }}>эзэн: @{c.ownerName}</p>
                    </div>
                    {confirmId === c.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold text-background"
                          style={{ background: '#ff45c8' }}
                        >
                          Тийм
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2.5 py-1 rounded-md text-[11px] border border-border text-muted-foreground"
                        >
                          Болих
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() =>
                            onEditCenter({
                              id: Number(String(c.id).replace(/^db-/, '')),
                              name: c.name,
                              location: c.location,
                              district: c.district,
                              phone: c.phone,
                              specs: c.specs,
                              openTime: c.openTime,
                              closeTime: c.closeTime,
                              photo: c.photo,
                            })
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:border-neon-cyan"
                          style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#00e0ff' }}
                          aria-label="Засах"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M11.5 2.5l2 2L6 12l-2.5.5L4 10l7.5-7.5z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmId(c.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:border-neon-magenta"
                          style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#ff45c8' }}
                          aria-label="Устгах"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 4h12M6 4V2.5h4V4M4.5 4l.5 9h6l.5-9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
