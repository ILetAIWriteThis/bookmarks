export type MediaKind = 'book' | 'movie' | 'tv'

export interface MediaEntry {
  id: string
  kind: MediaKind
  title: string
  creators: string[]
  published: string
  completedDates?: string[]
  addedOn: string
  genres: string[]
  language?: string
  franchise?: string
  series?: { name: string; position?: number }
  seasons?: { number: number; completedDates?: string[] }[]
  url?: string
}

export interface MediaData { entries: MediaEntry[] }

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

function readDates(value: unknown, path: string): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((date) => typeof date !== 'string' || !validDate(date)))
    throw new Error(`${path} must be an array of ISO dates`)
  if (new Set(value).size !== value.length) throw new Error(`${path} contains a duplicate date`)
  return value
}

function latestCompletion(entry: MediaEntry): string | undefined {
  return [...(entry.completedDates ?? []), ...(entry.seasons ?? []).flatMap((season) => season.completedDates ?? [])]
    .sort((a, b) => b.localeCompare(a))[0]
}

export function validateMediaData(value: unknown): MediaData {
  if (!record(value) || !Array.isArray(value.entries)) throw new Error('Library data must contain an entries array')
  const ids = new Set<string>()
  const entries: MediaEntry[] = value.entries.map((raw, index) => {
    const path = `entries[${index}]`
    if (!record(raw)) throw new Error(`${path} must be an object`)
    const required = (key: string) => {
      const item = raw[key]
      if (typeof item !== 'string' || !item.trim()) throw new Error(`${path}.${key} must be a non-empty string`)
      return item.trim()
    }
    const id = required('id')
    if (ids.has(id)) throw new Error(`Duplicate library id: ${id}`)
    ids.add(id)
    if (raw.kind !== 'book' && raw.kind !== 'movie' && raw.kind !== 'tv') throw new Error(`${path}.kind is invalid`)
    const kind = raw.kind
    const people = raw.creators
    if (!Array.isArray(people) || (kind === 'book' && !people.length) || people.some((item) => typeof item !== 'string' || !item.trim()))
      throw new Error(`${path}.creators must contain names${kind === 'book' ? '' : ' or be empty'}`)
    const genres = raw.genres
    if (!Array.isArray(genres) || genres.some((item) => typeof item !== 'string' || !item.trim()))
      throw new Error(`${path}.genres must be an array of names`)
    const published = required('published')
    if (!/^\d{4}$/.test(published) && !validDate(published)) throw new Error(`${path}.published must be a year or ISO date`)
    const addedOn = required('addedOn')
    if (!validDate(addedOn)) throw new Error(`${path}.addedOn must be an ISO date`)
    if (raw.completedOn !== undefined) throw new Error(`${path}.completedOn has been replaced by completedDates`)
    const completedDates = readDates(raw.completedDates, `${path}.completedDates`)
    const language = raw.language === undefined ? undefined : required('language')
    if (language && kind !== 'book') throw new Error(`${path}.language is only for books`)
    const franchise = raw.franchise === undefined ? undefined : required('franchise')
    if (raw.universe !== undefined) throw new Error(`${path}.universe has been replaced by franchise`)
    if (franchise && kind === 'book') throw new Error(`${path}.franchise is only for screen media`)
    const url = raw.url === undefined ? undefined : required('url')
    if (url) {
      try { if (new URL(url).protocol !== 'https:') throw new Error() }
      catch { throw new Error(`${path}.url must be an HTTPS URL`) }
    }
    let series: MediaEntry['series']
    if (raw.series !== undefined) {
      if (kind !== 'book') throw new Error(`${path}.series is only for books`)
      if (!record(raw.series) || typeof raw.series.name !== 'string' || !raw.series.name.trim()) throw new Error(`${path}.series needs a name`)
      const position = raw.series.position
      if (position !== undefined && (typeof position !== 'number' || !Number.isInteger(position) || position < 1))
        throw new Error(`${path}.series.position must be a positive integer`)
      series = { name: raw.series.name.trim(), position: position as number | undefined }
    }
    let seasons: MediaEntry['seasons']
    if (raw.seasons !== undefined) {
      if (kind !== 'tv' || !Array.isArray(raw.seasons)) throw new Error(`${path}.seasons is only for TV`)
      const numbers = new Set<number>()
      seasons = raw.seasons.map((season, seasonIndex) => {
        if (!record(season) || typeof season.number !== 'number' || !Number.isInteger(season.number) || season.number < 1 || numbers.has(season.number))
          throw new Error(`${path}.seasons[${seasonIndex}] needs a unique positive number`)
        numbers.add(season.number)
        if (season.completedOn !== undefined) throw new Error(`${path}.seasons[${seasonIndex}].completedOn has been replaced by completedDates`)
        return { number: season.number, completedDates: readDates(season.completedDates, `${path}.seasons[${seasonIndex}].completedDates`) }
      })
    }
    return { id, kind, title: required('title'), creators: people as string[], published, completedDates, addedOn,
      genres: genres as string[], language, franchise, series, seasons, url }
  })
  return { entries }
}

export type MediaSort = 'recent' | 'title' | 'published' | 'creator' | 'series'

export function sortMedia(entries: MediaEntry[], sort: MediaSort, reversed = false): MediaEntry[] {
  const direction = reversed ? -1 : 1
  return [...entries].sort((a, b) => {
    if (sort === 'recent') {
      const aCompleted = latestCompletion(a)
      const bCompleted = latestCompletion(b)
      if (!aCompleted || !bCompleted) return Number(Boolean(bCompleted)) - Number(Boolean(aCompleted)) || a.title.localeCompare(b.title)
      return bCompleted.localeCompare(aCompleted) * direction || a.title.localeCompare(b.title)
    }
    if (sort === 'published') return b.published.localeCompare(a.published) * direction || a.title.localeCompare(b.title)
    if (sort === 'creator') return Number(!a.creators.length) - Number(!b.creators.length)
      || (a.creators[0] ?? '').localeCompare(b.creators[0] ?? '') * direction || a.title.localeCompare(b.title)
    if (sort === 'series') return ((a.series?.name ?? a.title).localeCompare(b.series?.name ?? b.title)
      || (a.series?.position ?? 0) - (b.series?.position ?? 0)) * direction || a.title.localeCompare(b.title)
    return a.title.localeCompare(b.title) * direction
  })
}
