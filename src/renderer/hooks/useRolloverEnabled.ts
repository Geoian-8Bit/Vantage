import { useEffect, useState } from 'react'

const STORAGE_KEY = 'vantage-rollover-enabled'

function readStored(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function useRolloverEnabled() {
  const [enabled, setEnabledState] = useState<boolean>(() => readStored())

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  }, [enabled])

  function setEnabled(value: boolean): void {
    setEnabledState(value)
  }

  function toggle(): void {
    setEnabledState(v => !v)
  }

  return { enabled, setEnabled, toggle }
}
