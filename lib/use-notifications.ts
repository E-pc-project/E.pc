'use client'

import { useCallback, useEffect, useState } from 'react'

const POLL_MS = 15000

export interface NotificationItem {
  id: number
  type: string
  title: string
  body: string
  centerId: string
  bookingId: number | null
  read: boolean
  createdAt: string
}

/**
 * Fetches an admin's notifications (new bookings on their centers) and
 * keeps the unread count fresh. Polls periodically since a booking made by
 * a different user, in a different browser, has to reach this admin
 * without any push/websocket infrastructure — same approach as
 * useCenterAvailability.
 */
export function useNotifications(email?: string | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!email) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/notifications?email=' + encodeURIComponent(email), {
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(Number(data.unreadCount) || 0)
      }
    } catch {
      /* keep previous data on network error */
    }
    setLoading(false)
  }, [email])

  useEffect(() => {
    reload()
    const handler = () => reload()
    window.addEventListener('epc:bookings-updated', handler)
    window.addEventListener('epc:notifications-updated', handler)
    const interval = setInterval(reload, POLL_MS)
    return () => {
      window.removeEventListener('epc:bookings-updated', handler)
      window.removeEventListener('epc:notifications-updated', handler)
      clearInterval(interval)
    }
  }, [reload])

  async function markRead(id: number) {
    if (!email) return
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, id }),
      })
    } catch {
      /* local state already updated optimistically; next poll reconciles */
    }
  }

  async function markAllRead() {
    if (!email) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, all: true }),
      })
    } catch {
      /* local state already updated optimistically; next poll reconciles */
    }
  }

  return { notifications, unreadCount, loading, reload, markRead, markAllRead }
}
