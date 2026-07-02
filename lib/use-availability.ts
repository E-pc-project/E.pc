'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BookingSlot } from './availability'

const POLL_MS = 9000

/**
 * Fetches a center's bookings for a given date so the seat map can show
 * real occupancy. Re-fetches on `epc:bookings-updated` (same-tab, e.g. the
 * user who just booked) and polls periodically so a seat someone else
 * booked in a different browser flips to occupied without a manual reload.
 */
export function useCenterAvailability(centerId: string, date: string) {
  const [bookings, setBookings] = useState<BookingSlot[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!centerId || !date) {
      setBookings([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch(
        `/api/bookings?centerId=${encodeURIComponent(centerId)}&date=${encodeURIComponent(date)}`,
        { cache: 'no-store' },
      )
      const data = await res.json()
      if (res.ok) setBookings(data.bookings || [])
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

  return { bookings, loading, reload }
}
