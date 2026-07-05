'use client'

import { type EsportsCenter } from '@/lib/data'
import { useCenters } from '@/lib/use-centers'
import { CentersMapView } from './centers-map-view'
import { useAuth } from './auth-context'

interface CommunityCentersProps {
  onBook: (center: EsportsCenter) => void
  onAddCenter: () => void
}

export function CommunityCenters({ onBook, onAddCenter }: CommunityCentersProps) {
  const { user } = useAuth()
  const isAdmin = Boolean(user?.isAdmin)
  const { centers, raw, loading } = useCenters()
  const byId: Record<string, EsportsCenter> = Object.fromEntries(
    centers.map((c) => [c.id, c]),
  )

  return (
    <section id="community" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest mb-2 font-mono" style={{ color: '#ff45c8' }}>
            // COMMUNITY CENTERS
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            ХЭРЭГЛЭГЧИЙН <span className="neon-text-magenta">ТӨВҮҮД</span>
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Хэрэглэгчдийн өөрсдөө бүртгүүлсэн PC gaming төвүүдийг газрын зураг дээр харж захиалаарай.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onAddCenter}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
            style={{
              background: '#00e0ff',
              color: '#0b0b0f',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.05em',
              boxShadow: '0 0 20px rgba(0,224,255,0.4)',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" />
            </svg>
            ТӨВ НЭМЭХ
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Уншиж байна...</div>
      ) : raw.length === 0 ? (
        <div
          className="rounded-2xl py-16 px-6 text-center flex flex-col items-center gap-4"
          style={{ background: 'rgba(22,22,28,0.6)', border: '1px dashed rgba(255,255,255,0.12)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(0,224,255,0.1)', border: '1px solid rgba(0,224,255,0.3)' }}
          >
            <svg className="w-7 h-7" viewBox="0 0 16 16" fill="none" stroke="#00e0ff" strokeWidth="1.4">
              <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9v1h2v1H5v-1h2v-1H2a1 1 0 0 1-1-1V3z" />
            </svg>
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">Одоогоор бүртгэгдсэн төв алга</p>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Анхны төвийг нэмж E.PC-д нэгдээрэй.' : 'Админ эрхтэй хэрэглэгч төв нэмэх боломжтой.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={onAddCenter}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-background"
              style={{ background: '#00e0ff', fontFamily: 'var(--font-heading)' }}
            >
              ТӨВ НЭМЭХ
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Old UB map — pins for every community center */}
          <CentersMapView centers={centers} onBook={onBook} onMyPC={() => onAddCenter()} />

          {/* Card list */}
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mt-8 mb-4">
            // {raw.length} ТӨВ
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {raw.map((c) => (
              <div
                key={c.id}
                className="glass-card rounded-xl overflow-hidden relative border transition-all duration-300 hover:-translate-y-0.5"
                style={{ borderColor: `${c.color}30` }}
              >
                {c.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photo} alt={c.name} className="w-full h-28 object-cover" />
                )}
                <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                      {c.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{c.district || c.location}</p>
                    {c.reviewCount > 0 ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="#f59e0b"><path d="M6 1l1.2 3.6H11L8 6.9l1.2 3.7L6 8.5 2.8 10.6 4 6.9 1 4.6h3.8z" /></svg>
                        <span className="text-[11px] text-muted-foreground">{c.rating} ({c.reviewCount})</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold mt-0.5 inline-block" style={{ color: c.color, letterSpacing: '0.06em' }}>✦ ШИНЭ ТӨВ</span>
                    )}
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded shrink-0"
                    style={{ background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}30`, fontFamily: 'var(--font-heading)' }}
                  >
                    {c.totalSeats} PC
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground mb-4">
                  <span className="flex items-start gap-1.5">
                    <svg className="w-3 h-3 mt-0.5 shrink-0 opacity-60" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C5.2 0 3 2.2 3 5c0 3.9 5 11 5 11s5-7.1 5-11c0-2.8-2.2-5-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                    </svg>
                    {c.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 shrink-0 opacity-60" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 1l2 1-1 2 2 3 3 2 2-1 1 2-1 2c-5 1-11-5-10-10z" />
                    </svg>
                    {c.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 shrink-0 opacity-60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <circle cx="8" cy="8" r="6.5" />
                      <path d="M8 4.5V8l3 2" strokeLinecap="round" />
                    </svg>
                    {c.openTime && c.closeTime ? `${c.openTime} - ${c.closeTime}` : '24 цаг'}
                  </span>
                  {c.specs && (
                    <span className="flex items-start gap-1.5">
                      <svg className="w-3 h-3 mt-0.5 shrink-0 opacity-60" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 3h12v8H2V3zm1 1v6h10V4H3zM5 13h6v1H5z" />
                      </svg>
                      <span className="leading-relaxed">{c.specs}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-black" style={{ color: c.color, fontFamily: 'var(--font-heading)' }}>
                    {c.priceFrom ? `₮${c.priceFrom.toLocaleString()}` : '₮—'}
                    <span className="text-xs font-normal text-muted-foreground">-с/цаг</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">@{c.ownerName}</span>
                </div>

                <button
                  onClick={() => byId[c.id] && onBook(byId[c.id])}
                  className="w-full py-2 rounded-lg text-xs font-bold text-background transition-all duration-200"
                  style={{ background: c.color, boxShadow: `0 0 10px ${c.color}40`, fontFamily: 'var(--font-heading)' }}
                >
                  СУУДАЛ ЗАХИАЛАХ
                </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
