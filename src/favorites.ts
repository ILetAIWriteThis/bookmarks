import { useEffect, useState } from 'react'

const storageKey = 'bookmarks:starred:v1'
const datesKey = 'bookmarks:starred-dates:v1'
export const starredPeriod = 30 * 24 * 60 * 60 * 1000

interface StarDates {
  addedAt: number
  reviewAt: number
}

function readStars() {
  let ids: string[] = []
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (Array.isArray(value)) ids = [...new Set(value.filter((id): id is string => typeof id === 'string'))]
  } catch { /* Unavailable or invalid storage starts with no stars. */ }

  let stored: Record<string, unknown> = {}
  try {
    const value: unknown = JSON.parse(localStorage.getItem(datesKey) ?? '{}')
    if (value && typeof value === 'object' && !Array.isArray(value)) stored = value as Record<string, unknown>
  } catch { /* Existing stars without dates get their first review period today. */ }
  const now = Date.now()
  const dates = Object.fromEntries(ids.map((id) => {
    const value = stored[id] as Partial<StarDates> | null
    const valid = value && typeof value.addedAt === 'number' && Number.isFinite(value.addedAt) && value.addedAt >= 0
      && typeof value.reviewAt === 'number' && Number.isFinite(value.reviewAt) && value.reviewAt >= value.addedAt
    return [id, valid ? value as StarDates : { addedAt: now, reviewAt: now + starredPeriod }]
  }))
  return { ids, dates }
}

/** Personal shortcuts only; never changes shared bookmark data or positions. */
export function useFavorites() {
  const [stars, setStars] = useState(readStars)
  const [storageError, setStorageError] = useState(false)
  const [now, setNow] = useState(Date.now)

  // Persist the initial dates too, so legacy stars keep their first review deadline.
  useEffect(() => {
    try {
      localStorage.setItem(datesKey, JSON.stringify(stars.dates))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }, [stars.dates])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === datesKey || event.key === null) setStars(readStars())
    }
    const tick = () => setNow(Date.now())
    const timer = window.setInterval(tick, 60_000)
    window.addEventListener('storage', sync)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', sync)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const save = (next: typeof stars) => {
    setStars(next)
    setNow(Date.now())
    try {
      localStorage.setItem(storageKey, JSON.stringify(next.ids))
      localStorage.setItem(datesKey, JSON.stringify(next.dates))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  const remove = (id: string) => save({
    ids: stars.ids.filter((item) => item !== id),
    dates: Object.fromEntries(Object.entries(stars.dates).filter(([key]) => key !== id)),
  })
  const toggle = (id: string) => {
    if (stars.ids.includes(id)) return remove(id)
    const addedAt = Date.now()
    save({ ids: [...stars.ids, id], dates: { ...stars.dates, [id]: { addedAt, reviewAt: addedAt + starredPeriod } } })
  }
  const prolong = (id: string) => {
    if (!stars.ids.includes(id)) return
    save({ ...stars, dates: { ...stars.dates, [id]: { ...stars.dates[id], reviewAt: Date.now() + starredPeriod } } })
  }
  const clear = () => save({ ids: [], dates: {} })

  return { ...stars, toggle, remove, prolong, clear, storageError, isOverdue: (id: string) => now > (stars.dates[id]?.reviewAt ?? Infinity) }
}
