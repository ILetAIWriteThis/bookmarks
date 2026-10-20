import { useEffect, useState } from 'react'

const storageKey = 'bookmarks:starred:v1'

function readStars(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : []
  } catch {
    return []
  }
}

/** Personal shortcuts only; never changes shared bookmark data or positions. */
export function useFavorites() {
  const [ids, setIds] = useState(readStars)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setIds(readStars())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
    setIds(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  return { ids, toggle, storageError }
}
