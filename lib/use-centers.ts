'use client'

import { useCallback, useEffect, useState } from 'react'
import { type EsportsCenter } from './data'

// Approximate map position (percent of 800x500 viewBox) for each UB district,
// matching the district zones drawn in centers-map.tsx.
const DISTRICT_POS: Record<string, { x: number; y: number }> = {
  'Сонгинохайрхан': { x: 9, y: 35 },
  'Чингэлтэй': { x: 33, y: 23 },
  'Сүхбаатар': { x: 60, y: 22 },
  'Баянзүрх': { x: 84, y: 28 },
  'Баянгол': { x: 29, y: 62 },
  'Хан-Уул': { x: 57, y: 80 },
  'Налайх': { x: 87, y: 74 },
  'Багануур': { x: 90, y: 52 },
  'Багахангай': { x: 74, y: 90 },
}

const ACCENTS = ['#00e0ff', '#ff45c8']

// Spread multiple centers in the same district so their pins don't overlap.
function positionFor(district: string, indexInDistrict: number): { x: number; y: number } {
  const base = DISTRICT_POS[district] || { x: 50, y: 50 }
  if (indexInDistrict === 0) return base
  const angle = indexInDistrict * 2.39 // golden-ish angle for even spread
  const radius = 6 + indexInDistrict * 1.5
  return {
    x: Math.max(5, Math.min(95, base.x + Math.cos(angle) * radius)),
    y: Math.max(8, Math.min(92, base.y + Math.sin(angle) * radius)),
  }
}

export interface DbCenter {
  id: string
  name: string
  district: string
  location: string
  phone: string
  pcCount: number
  pricePerHour: number
  specs: string
  ownerName: string
  color: string
  vipSeats: number[]
  vipPricePerHour: number
}

/**
 * Fetches the user-submitted centers from the API and adapts them into the
 * EsportsCenter shape (with map coordinates) used by the map + hero search.
 * Auto-refreshes when a new center is added (`epc:centers-updated`).
 */
export function useCenters() {
  const [centers, setCenters] = useState<EsportsCenter[]>([])
  const [raw, setRaw] = useState<DbCenter[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/centers', { cache: 'no-store' })
      const data = await res.json()
      setRaw(data.centers || [])
      const perDistrict: Record<string, number> = {}
      const list: EsportsCenter[] = (data.centers || []).map((c: DbCenter, i: number) => {
        const district = c.district || '—'
        const idx = perDistrict[district] ?? 0
        perDistrict[district] = idx + 1
        const pos = positionFor(district, idx)
        return {
          id: c.id,
          name: c.name,
          district,
          address: c.location,
          phone: c.phone,
          pcCount: c.pcCount,
          pricePerHour: c.pricePerHour || 2000,
          rating: 0,
          reviewCount: 0,
          openHours: '24 цаг',
          amenities: c.specs ? c.specs.split(' · ') : [],
          x: pos.x,
          y: pos.y,
          color: c.color || ACCENTS[i % ACCENTS.length],
          vipSeats: c.vipSeats || [],
          vipPricePerHour: c.vipPricePerHour || 0,
        }
      })
      setCenters(list)
    } catch {
      setCenters([])
      setRaw([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('epc:centers-updated', handler)
    return () => window.removeEventListener('epc:centers-updated', handler)
  }, [load])

  return { centers, raw, loading }
}
