'use client'

import { useCallback, useEffect, useState } from 'react'
import type { BookingSlot } from './availability'

/**
 * Subscribes (via Server-Sent Events) to a center's per-room bookings for a
 * given date, so a seat someone else booked in a different browser flips to
 * occupied within ~1-2s instead of a manual reload. `reload()` is still
 * exposed as a plain one-shot fetch for callers that want an immediate
 * refresh (e.g. right after a 409 conflict) without waiting for the
 * stream's next tick; the browser's EventSource reconnects on its own if
 * the connection drops or the server closes it, so no manual retry logic
 * is needed here.
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
    if (!centerId || !date) {
      setByRoom({})
      setLoading(false)
      return
    }
    setLoading(true)
    const source = new EventSource(
      `/api/bookings/stream?centerId=${encodeURIComponent(centerId)}&date=${encodeURIComponent(date)}`,
    )
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setByRoom(data.byRoom || {})
      } catch {
        /* ignore malformed event */
      }
      setLoading(false)
    }

    const handler = () => reload()
    window.addEventListener('epc:bookings-updated', handler)
    return () => {
      source.close()
      window.removeEventListener('epc:bookings-updated', handler)
    }
  }, [centerId, date, reload])

  const bookingsForRoom = useCallback((roomId: number) => byRoom[String(roomId)] || [], [byRoom])

  return { bookingsForRoom, loading, reload }
}
