import { useState, useEffect, useCallback } from 'react'
import type { DashboardStats } from '../../shared/types'

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await window.api.dashboard.getStats()
    setStats(data)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { stats, loading, refresh }
}
