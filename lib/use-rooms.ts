'use client'

import { useCallback, useEffect, useState } from 'react'

export interface RoomDto {
  id: number
  name: string
  category: string
  seatCount: number
  pricePerHour: number
}

/**
 * Fetches a center's rooms — used by the booking modal (category tabs +
 * room cards) and the admin edit-center room list. Refetches on
 * `epc:rooms-updated`, dispatched after any room add/edit/delete.
 */
export function useRooms(centerId?: string | null) {
  const [rooms, setRooms] = useState<RoomDto[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!centerId) {
      setRooms([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/rooms?centerId=' + encodeURIComponent(centerId), {
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) setRooms(data.rooms || [])
    } catch {
      /* keep previous rooms on network error */
    }
    setLoading(false)
  }, [centerId])

  useEffect(() => {
    setLoading(true)
    reload()
    const handler = () => reload()
    window.addEventListener('epc:rooms-updated', handler)
    return () => window.removeEventListener('epc:rooms-updated', handler)
  }, [reload])

  return { rooms, loading, reload }
}

/** Broadcasts that a room was added/edited/deleted, for every useRooms() instance. */
export function announceRoomsUpdated() {
  window.dispatchEvent(new Event('epc:rooms-updated'))
}
