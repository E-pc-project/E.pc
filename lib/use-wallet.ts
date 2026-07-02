'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Fetches the logged-in user's ecoin balance and keeps it fresh.
 *
 * Re-fetches whenever an `epc:wallet-updated` event fires. If the event
 * carries `detail.balance` (a number), that value is applied directly
 * instead of re-fetching — this avoids a race where an immediate GET
 * right after a write can observe a not-yet-settled value (edge cache /
 * replica lag) and briefly show a stale balance.
 */
export function useWallet(email?: string | null) {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!email) {
      setBalance(0)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/wallet?email=' + encodeURIComponent(email), {
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) setBalance(Number(data.balance) || 0)
    } catch {
      /* keep previous balance on network error */
    }
    setLoading(false)
  }, [email])

  useEffect(() => {
    reload()
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ balance?: number }>).detail
      if (detail && typeof detail.balance === 'number') {
        setBalance(detail.balance)
        setLoading(false)
      } else {
        reload()
      }
    }
    window.addEventListener('epc:wallet-updated', handler)
    return () => window.removeEventListener('epc:wallet-updated', handler)
  }, [reload])

  return { balance, loading, reload }
}

/** Broadcasts a new balance to every useWallet() instance (header, modals, ...). */
export function announceWalletBalance(balance: number) {
  window.dispatchEvent(new CustomEvent('epc:wallet-updated', { detail: { balance } }))
}
