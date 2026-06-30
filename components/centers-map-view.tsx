'use client'

import { useState } from 'react'
import { type EsportsCenter } from '@/lib/data'

interface CentersMapViewProps {
  centers: EsportsCenter[]
  onBook: (center: EsportsCenter) => void
  onMyPC: (center: EsportsCenter) => void
}

// District zone polygons — rough UB city layout as SVG paths (viewBox 0 0 800 500)
const DISTRICT_ZONES = [
  { id: 'СХД', label: 'Сонгинохайрхан', path: 'M0,80 L180,60 L200,200 L160,260 L80,280 L0,240 Z', fill: 'rgba(0,224,255,0.04)', stroke: 'rgba(0,224,255,0.12)' },
  { id: 'ЧД', label: 'Чингэлтэй', path: 'M180,60 L400,40 L420,180 L340,200 L200,200 Z', fill: 'rgba(255,69,200,0.04)', stroke: 'rgba(255,69,200,0.10)' },
  { id: 'СБД', label: 'Сүхбаатар', path: 'M400,40 L600,60 L580,200 L420,180 Z', fill: 'rgba(0,224,255,0.04)', stroke: 'rgba(0,224,255,0.12)' },
  { id: 'БЗД', label: 'Баянзүрх', path: 'M600,60 L800,80 L800,300 L620,280 L580,200 Z', fill: 'rgba(255,69,200,0.04)', stroke: 'rgba(255,69,200,0.10)' },
  { id: 'БГД', label: 'Баянгол', path: 'M160,260 L200,200 L340,200 L360,360 L240,400 L100,380 Z', fill: 'rgba(34,197,94,0.04)', stroke: 'rgba(34,197,94,0.10)' },
  { id: 'ХУД', label: 'Хан-Уул', path: 'M240,400 L360,360 L580,200 L620,280 L600,460 L360,500 L200,480 Z', fill: 'rgba(168,85,247,0.04)', stroke: 'rgba(168,85,247,0.10)' },
  { id: 'НД', label: 'Налайх', path: 'M620,280 L800,300 L800,440 L680,500 L600,460 Z', fill: 'rgba(234,179,8,0.04)', stroke: 'rgba(234,179,8,0.10)' },
]

const ROADS = [
  'M0,170 Q400,155 800,170',
  'M0,230 Q400,215 800,230',
  'M200,0 Q210,250 220,500',
  'M380,0 Q390,250 400,500',
  'M590,0 Q600,250 610,500',
]

function CenterNode({
  center,
  onBook,
  onMyPC,
  svgWidth,
  svgHeight,
}: {
  center: EsportsCenter
  onBook: (c: EsportsCenter) => void
  onMyPC: (c: EsportsCenter) => void
  svgWidth: number
  svgHeight: number
}) {
  const [hovered, setHovered] = useState(false)

  const cx = (center.x / 100) * svgWidth
  const cy = (center.y / 100) * svgHeight

  function openDirections() {
    const query = encodeURIComponent(center.address + ', Улаанбаатар, Монгол')
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank')
  }

  const cardX = cx > svgWidth * 0.65 ? cx - 260 - 12 : cx + 16
  const cardY = cy > svgHeight * 0.65 ? cy - 300 : cy - 8

  return (
    <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ cursor: 'pointer' }}>
      {/* Outer ping ring */}
      <circle cx={cx} cy={cy} r={hovered ? 22 : 14} fill="none" stroke={center.color} strokeWidth="1" opacity={hovered ? 0.5 : 0.25} style={{ transition: 'r 0.3s ease, opacity 0.3s ease' }} />
      {/* Animated pulse ring */}
      <circle cx={cx} cy={cy} r="18" fill="none" stroke={center.color} strokeWidth="0.8" opacity="0.2">
        <animate attributeName="r" from="10" to="26" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Core dot */}
      <circle cx={cx} cy={cy} r={hovered ? 9 : 6} fill={center.color} opacity="0.9" style={{ transition: 'r 0.2s ease', filter: `drop-shadow(0 0 ${hovered ? 8 : 4}px ${center.color})` }} />
      <circle cx={cx} cy={cy} r="2" fill="white" opacity="0.9" />

      {/* Hover info card */}
      {hovered && (
        <foreignObject x={cardX} y={cardY} width="262" height="318">
          <div style={{ background: 'rgba(18,18,24,0.98)', border: `1px solid ${center.color}55`, boxShadow: `0 0 28px ${center.color}30, 0 8px 32px rgba(0,0,0,0.8)`, borderRadius: '14px', overflow: 'hidden', fontFamily: 'inherit' }}>
            <div style={{ height: '2px', background: center.color }} />
            {/* Header */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${center.color}20`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '13px', color: '#f0f2f5', lineHeight: 1.2, marginBottom: '2px' }}>{center.name}</div>
                <div style={{ fontSize: '11px', color: '#8a8a99' }}>{center.district} дүүрэг</div>
              </div>
              <div style={{ background: `${center.color}20`, border: `1px solid ${center.color}35`, color: center.color, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '11px', padding: '2px 7px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{center.pcCount} PC</div>
            </div>
            {/* Body */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <svg style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2, color: '#8a8a99' }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C5.2 0 3 2.2 3 5c0 3.9 5 11 5 11s5-7.1 5-11c0-2.8-2.2-5-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" /></svg>
                <span style={{ fontSize: '11px', color: '#8a8a99', lineHeight: 1.4 }}>{center.address}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <svg style={{ width: 12, height: 12, flexShrink: 0, color: '#8a8a99' }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm.5 11.5h-1v-5h1v5zm0-6.5h-1v-1h1v1z" /></svg>
                <span style={{ fontSize: '11px', color: '#8a8a99' }}>{center.openHours}</span>
              </div>
              {center.reviewCount > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} style={{ width: 11, height: 11 }} viewBox="0 0 12 12" fill={i <= Math.round(center.rating) ? '#f59e0b' : '#33333d'}><path d="M6 1l1.2 3.6H11L8 6.9l1.2 3.7L6 8.5 2.8 10.6 4 6.9 1 4.6h3.8z" /></svg>
                    ))}
                    <span style={{ fontSize: '11px', color: '#8a8a99', marginLeft: 3 }}>{center.rating}</span>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '10px', fontWeight: 700, color: center.color, letterSpacing: '0.08em' }}>✦ ШИНЭ ТӨВ</span>
              )}
              {/* Phone */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <svg style={{ width: 12, height: 12, flexShrink: 0, color: '#8a8a99' }} viewBox="0 0 16 16" fill="currentColor"><path d="M3 1l2 1-1 2 2 3 3 2 2-1 1 2-1 2c-5 1-11-5-10-10z" /></svg>
                <span style={{ fontSize: '11px', color: '#8a8a99' }}>{center.phone}</span>
              </div>
              {/* Amenities (specs) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {center.amenities.slice(0, 3).map(a => (
                  <span key={a} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#8a8a99', border: '1px solid rgba(255,255,255,0.08)' }}>{a}</span>
                ))}
              </div>
              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '18px', color: center.color }}>
                  ₮{center.pricePerHour.toLocaleString()}
                  <span style={{ fontSize: '11px', fontWeight: 400, color: '#8a8a99' }}>/цаг</span>
                </span>
              </div>
            </div>
            {/* Action buttons */}
            <div style={{ padding: '0 14px 12px', display: 'flex', gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); onBook(center) }} style={{ flex: 1, padding: '8px 0', borderRadius: '8px', background: center.color, color: '#0a0a0d', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '11px', letterSpacing: '0.08em', border: 'none', cursor: 'pointer', boxShadow: `0 0 12px ${center.color}50` }}>
                ЗАХИАЛАХ
              </button>
              <button onClick={(e) => { e.stopPropagation(); openDirections() }} style={{ padding: '8px 10px', borderRadius: '8px', background: 'transparent', color: center.color, border: `1px solid ${center.color}45`, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg style={{ width: 11, height: 11 }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0L3 6h3v4h4V6h3L8 0zM3 10h10v2H3v-2z" /></svg>
                Зам
              </button>
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
}

/** The UB district map showing the given centers as glowing pins. */
export function CentersMapView({ centers, onBook, onMyPC }: CentersMapViewProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
  const SVG_W = 800
  const SVG_H = 500

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: '16/8' }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="absolute inset-0 w-full h-full" style={{ background: 'rgba(11,11,15,0.97)' }}>
        <defs>
          <pattern id="dotgrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="rgba(0,224,255,0.12)" />
          </pattern>
          <pattern id="gridlines" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(0,224,255,0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect width={SVG_W} height={SVG_H} fill="url(#dotgrid)" />
        <rect width={SVG_W} height={SVG_H} fill="url(#gridlines)" />

        <radialGradient id="ambientGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgba(0,224,255,0.05)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <rect width={SVG_W} height={SVG_H} fill="url(#ambientGlow)" />

        {/* District zones */}
        {DISTRICT_ZONES.map((zone) => (
          <path
            key={zone.id}
            d={zone.path}
            fill={hoveredDistrict === zone.id ? zone.fill.replace('0.04', '0.10') : zone.fill}
            stroke={zone.stroke}
            strokeWidth="1"
            style={{ transition: 'fill 0.2s ease' }}
            onMouseEnter={() => setHoveredDistrict(zone.id)}
            onMouseLeave={() => setHoveredDistrict(null)}
          />
        ))}

        {/* Roads */}
        {ROADS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(0,224,255,0.08)" strokeWidth={i < 2 ? '2.5' : '1.5'} strokeDasharray={i < 2 ? 'none' : '6,4'} />
        ))}

        {/* District labels */}
        {[
          { x: 72, y: 175, label: 'СХД' },
          { x: 265, y: 115, label: 'ЧД' },
          { x: 480, y: 110, label: 'СБД' },
          { x: 670, y: 140, label: 'БЗД' },
          { x: 230, y: 310, label: 'БГД' },
          { x: 460, y: 400, label: 'ХУД' },
          { x: 700, y: 370, label: 'НД' },
        ].map((d) => (
          <text key={d.label} x={d.x} y={d.y} textAnchor="middle" fill="rgba(0,224,255,0.18)" fontSize="11" fontWeight="700" letterSpacing="2" style={{ fontFamily: 'var(--font-heading)', userSelect: 'none' }}>
            {d.label}
          </text>
        ))}

        <text x="14" y="20" fill="rgba(0,224,255,0.35)" fontSize="9" letterSpacing="3" style={{ fontFamily: 'var(--font-heading)', userSelect: 'none' }}>
          УЛААНБААТАР / ULAANBAATAR
        </text>

        {/* Center pins */}
        {centers.map((center) => (
          <CenterNode key={center.id} center={center} onBook={onBook} onMyPC={onMyPC} svgWidth={SVG_W} svgHeight={SVG_H} />
        ))}

        {/* Legend */}
        <g transform={`translate(${SVG_W - 110}, ${SVG_H - 34})`}>
          <rect width="106" height="26" rx="6" fill="rgba(18,18,24,0.85)" stroke="rgba(0,224,255,0.15)" strokeWidth="0.8" />
          <circle cx="14" cy="13" r="4" fill="rgba(0,224,255,0.7)">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="24" y="17" fill="rgba(0,224,255,0.55)" fontSize="9" letterSpacing="1" style={{ fontFamily: 'var(--font-heading)' }}>
            {centers.length} ТӨВ ОЛДЛОО
          </text>
        </g>
      </svg>
    </div>
  )
}
