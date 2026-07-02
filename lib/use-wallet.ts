'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Fetches the logged-in user's ecoin balance and keeps it fresh.
 * Re-fetches whenever an `epc:wallet-updated` event fires (e.g. after a top-up).
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
    const handler = () => reload()
    window.addEventListener('epc:wallet-updated', handler)
    return () => window.removeEventListener('epc:wallet-updated', handler)
  }, [reload])

  return { balance, loading, reload }
}
