import { useEffect, useState } from 'react'

const storageKey = 'bookmarks:listening:v1'

function readListening(): Record<string, boolean> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, listening]) => typeof listening === 'boolean'))
  } catch {
    return {}
  }
}

/** Browser preferences layered over the saved listening tags. */
export function useListening() {
  const [overrides, setOverrides] = useState(readListening)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setOverrides(readListening())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const save = (next: Record<string, boolean>) => {
    setOverrides(next)
    try {
      if (Object.keys(next).length) localStorage.setItem(storageKey, JSON.stringify(next))
      else localStorage.removeItem(storageKey)
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  return {
    overrides,
    toggle: (id: string, current: boolean) => save({ ...overrides, [id]: !current }),
    reset: () => save({}),
    storageError,
  }
}
