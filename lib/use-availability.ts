'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BookingSlot } from './availability'

const POLL_MS = 9000

/**
 * Fetches every room's bookings for a center on a given date in one
 * request, so each room card in the booking modal can show real
 * occupancy. Re-fetches on `epc:bookings-updated` (same-tab, e.g. the user
 * who just booked) and polls periodically so a seat someone else booked
 * in a different browser flips to occupied without a manual reload.
 */
export function useCenterAvailability(centerId: string, date: string) {
  const [byRoom, setByRoom] = useState<Record<string, BookingSlot[]>>({})
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!centerId || !date) {
      setByRoom({})
      setLoading(false)
      return
    }
    try {
      const res = await fetch(
        `/api/bookings?centerId=${encodeURIComponent(centerId)}&date=${encodeURIComponent(date)}`,
        { cache: 'no-store' },
      )
      const data = await res.json()
      if (res.ok) setByRoom(data.byRoom || {})
    } catch {
      /* keep previous data on network error */
    }
    setLoading(false)
  }, [centerId, date])

  useEffect(() => {
    setLoading(true)
    reload()
    const handler = () => reload()
    window.addEventListener('epc:bookings-updated', handler)
    const interval = setInterval(reload, POLL_MS)
    return () => {
      window.removeEventListener('epc:bookings-updated', handler)
      clearInterval(interval)
    }
  }, [reload])

  const bookingsForRoom = useCallback((roomId: number) => byRoom[String(roomId)] || [], [byRoom])

  return { bookingsForRoom, loading, reload }
}
