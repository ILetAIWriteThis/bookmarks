import type { Bookmark } from './types'
import type { V2Collection } from './v2'

export type Bucket = { name: string; slots: (string | null)[] }

const storagePrefix = 'bookmarks:buckets:'
const bucketCount = 3
const slotCount = 7

export function bucketStorageKey(collection: V2Collection): string {
  return `${storagePrefix}v3:${collection}`
}

function legacyScopes(collection: V2Collection): string[] {
  return collection === 'youtube' ? ['youtube', 'youtube-listen', 'youtube-watch'] : ['web']
}

export function isBucketStorageKey(key: string | null, collection: V2Collection): boolean {
  return key === null || key === bucketStorageKey(collection) || legacyScopes(collection).some(scope =>
    key === `${storagePrefix}v2:${scope}` || key === `${storagePrefix}v1:${scope}`,
  )
}

function isBucket(value: unknown): value is Bucket {
  if (!value || typeof value !== 'object') return false
  const bucket = value as Partial<Bucket>
  return typeof bucket.name === 'string' && Array.isArray(bucket.slots)
    && bucket.slots.every(slot => slot === null || typeof slot === 'string')
}

function readStorage(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function readLegacyBuckets(scope: string): Bucket[] | undefined {
  const groups = readStorage(`${storagePrefix}v2:${scope}`)
  if (Array.isArray(groups) && groups.every(group => Array.isArray(group?.buckets) && group.buckets.every(isBucket))) {
    return groups.flatMap((group: { buckets: Bucket[] }) => group.buckets)
  }

  const buckets = readStorage(`${storagePrefix}v1:${scope}`)
  if (Array.isArray(buckets) && buckets.every(isBucket)) return buckets
}

export function readBuckets(collection: V2Collection, library: ReadonlyMap<string, Bookmark>): Bucket[] {
  const saved = readStorage(bucketStorageKey(collection))
  if (Array.isArray(saved) && saved.length === bucketCount
    && saved.every(bucket => isBucket(bucket) && bucket.slots.length === slotCount)) return saved

  const older = readLegacyBuckets(collection)
    ?? legacyScopes(collection).slice(1).flatMap(scope => readLegacyBuckets(scope) ?? [])
  const names = collection === 'youtube' ? ['Recurring', 'Good Stories', 'Bucket 3'] : ['Reference', 'To read', 'Bucket 3']
  const seen = new Set<string>()
  const keep = (id: string | null | undefined) => {
    if (!id || seen.has(id) || !library.has(id)) return null
    seen.add(id)
    return id
  }

  // Keep existing positions first, then fill gaps with bookmarks that would fall outside the new layout.
  const buckets = names.map((name, index) => ({
    name: older[index]?.name.trim() || name,
    slots: Array.from({ length: slotCount }, (_, slot) => keep(older[index]?.slots[slot])),
  }))
  const overflow = older.flatMap((bucket, index) => index < bucketCount ? bucket.slots.slice(slotCount) : bucket.slots)
    .flatMap(id => keep(id) ?? [])
  let next = 0
  for (const bucket of buckets) {
    bucket.slots = bucket.slots.map(id => id ?? overflow[next++] ?? null)
  }
  return buckets
}
