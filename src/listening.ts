import { useEffect, useState } from 'react'

function readChoices(storageKey: string): Record<string, boolean> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, listening]) => typeof listening === 'boolean'))
  } catch {
    return {}
  }
}

/** Boolean channel preferences saved in this browser. */
function useChannelChoices(storageKey: string) {
  const [overrides, setOverrides] = useState(() => readChoices(storageKey))
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setOverrides(readChoices(storageKey))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [storageKey])

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
    set: (id: string, value: boolean) => save({ ...overrides, [id]: value }),
    toggle: (id: string, current: boolean) => save({ ...overrides, [id]: !current }),
    reset: () => save({}),
    storageError,
  }
}

export function useListening() {
  return useChannelChoices('bookmarks:listening:v1')
}

export function useWatching() {
  return useChannelChoices('bookmarks:watching:v1')
}
